//! Sandbox execution using Isolate
//!
//! This module provides a wrapper around the Isolate sandbox for secure code execution.
//! Isolate uses Linux cgroups for resource limitation and namespace isolation.
//!
//! See: https://github.com/ioi/isolate

use anyhow::{Context, Result};
use std::path::Path;
use std::process::Stdio;
use std::time::{Duration, Instant};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::time::timeout;
use tracing::{debug, info, warn};

/// Result of a compilation attempt
#[derive(Debug)]
#[allow(dead_code)]
pub struct CompileResult {
    pub success: bool,
    pub message: Option<String>,
}

/// Result of running a program
#[derive(Debug)]
pub struct RunResult {
    pub verdict: String,
    pub time_ms: u32,
    pub memory_kb: u32,
    pub output: String,
}

/// Check if isolate cgroups are available
async fn is_cgroups_available() -> bool {
    // Try to initialize a test box with cgroups
    let test_result = Command::new("isolate")
        .args(["--box-id", "99", "--cg", "--init"])
        .output()
        .await;
    
    // Cleanup
    let _ = Command::new("isolate")
        .args(["--box-id", "99", "--cleanup"])
        .output()
        .await;

    match test_result {
        Ok(r) => r.status.success(),
        Err(_) => false,
    }
}

/// Check if isolate is available (without cgroups)
async fn is_isolate_available() -> bool {
    match Command::new("isolate").arg("--version").output().await {
        Ok(output) => {
            if output.status.success() {
                // Try to initialize a test box without cgroups
                let test_result = Command::new("isolate")
                    .args(["--box-id", "99", "--init"])
                    .output()
                    .await;
                
                // Cleanup
                let _ = Command::new("isolate")
                    .args(["--box-id", "99", "--cleanup"])
                    .output()
                    .await;

                match test_result {
                    Ok(r) => r.status.success(),
                    Err(_) => false,
                }
            } else {
                false
            }
        }
        Err(_) => false,
    }
}

/// Isolate box manager
pub struct IsolateBox {
    box_id: u32,
    box_path: String,
    use_cgroups: bool,
}

impl IsolateBox {
    /// Initialize a new isolate box
    pub async fn new(box_id: u32, use_cgroups: bool) -> Result<Self> {
        // Cleanup any existing box first
        let _ = Command::new("isolate")
            .args(["--box-id", &box_id.to_string(), "--cleanup"])
            .output()
            .await;

        // Initialize new box (with or without cgroups)
        let box_id_str = box_id.to_string();
        let mut args = vec!["--box-id", &box_id_str];
        if use_cgroups {
            args.push("--cg");
        }
        args.push("--init");

        let output = Command::new("isolate")
            .args(&args)
            .output()
            .await
            .context("Failed to run isolate --init")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("Failed to initialize isolate box: {}", stderr);
        }

        let box_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        info!("Initialized isolate box {} at {} (cgroups: {})", box_id, box_path, use_cgroups);

        Ok(Self { box_id, box_path, use_cgroups })
    }

    /// Get the path to the box directory
    #[allow(dead_code)]
    pub fn path(&self) -> &str {
        &self.box_path
    }

    /// Get the path to the box/box subdirectory (where files should be placed)
    pub fn work_dir(&self) -> String {
        format!("{}/box", self.box_path)
    }

    /// Run a command in the isolate box
    pub async fn run(
        &self,
        command: &[String],
        stdin_file: Option<&Path>,
        time_limit_ms: u32,
        memory_limit_mb: u32,
    ) -> Result<RunResult> {
        let meta_file = format!("/tmp/isolate_meta_{}.txt", self.box_id);
        let stdout_file = format!("{}/stdout.txt", self.work_dir());

        let time_limit_secs = (time_limit_ms as f64) / 1000.0;
        let wall_time_secs = time_limit_secs * 2.0 + 1.0; // Wall time = 2x CPU time + 1s buffer
        let memory_limit_kb = memory_limit_mb * 1024;

        let mut args = vec![
            "--box-id".to_string(),
            self.box_id.to_string(),
        ];
        
        // Add cgroup options if available
        if self.use_cgroups {
            args.push("--cg".to_string());
            args.push("--cg-timing".to_string());
            args.push(format!("--cg-mem={}", memory_limit_kb));
        } else {
            // Without cgroups, use regular memory limit (less accurate)
            args.push(format!("--mem={}", memory_limit_kb));
        }
        
        args.extend([
            format!("--time={}", time_limit_secs),
            format!("--wall-time={}", wall_time_secs),
            format!("--meta={}", meta_file),
            "--stdout=stdout.txt".to_string(),
            "--stderr-to-stdout".to_string(),
            "--processes=64".to_string(),
            "--open-files=256".to_string(),
            "--fsize=262144".to_string(), // 256MB max file size
        ]);

        if let Some(stdin) = stdin_file {
            // Copy stdin file to box
            let dest = format!("{}/stdin.txt", self.work_dir());
            fs::copy(stdin, &dest).await?;
            args.push("--stdin=stdin.txt".to_string());
        }

        args.push("--run".to_string());
        args.push("--".to_string());
        args.extend(command.iter().cloned());

        debug!("Running isolate with args: {:?}", args);

        let _output = Command::new("isolate")
            .args(&args)
            .output()
            .await
            .context("Failed to run isolate")?;

        // Parse meta file for results
        let meta_content = fs::read_to_string(&meta_file)
            .await
            .unwrap_or_default();
        
        let (verdict, time_ms, memory_kb) = parse_meta(&meta_content, time_limit_ms, memory_limit_kb);

        // Read stdout
        let stdout_content = fs::read_to_string(&stdout_file)
            .await
            .unwrap_or_default();

        // Cleanup meta file
        let _ = fs::remove_file(&meta_file).await;

        Ok(RunResult {
            verdict,
            time_ms,
            memory_kb,
            output: stdout_content,
        })
    }

    /// Cleanup the isolate box
    pub async fn cleanup(self) -> Result<()> {
        Command::new("isolate")
            .args(["--box-id", &self.box_id.to_string(), "--cleanup"])
            .output()
            .await?;
        info!("Cleaned up isolate box {}", self.box_id);
        Ok(())
    }
}

/// Parse isolate meta file to extract verdict and resource usage
fn parse_meta(content: &str, _time_limit_ms: u32, memory_limit_kb: u32) -> (String, u32, u32) {
    let mut time_ms = 0u32;
    let mut memory_kb = 0u32;
    let mut status = String::new();
    let mut exit_code = 0i32;

    for line in content.lines() {
        let parts: Vec<&str> = line.splitn(2, ':').collect();
        if parts.len() != 2 {
            continue;
        }

        let key = parts[0].trim();
        let value = parts[1].trim();

        match key {
            "time" => {
                if let Ok(t) = value.parse::<f64>() {
                    time_ms = (t * 1000.0) as u32;
                }
            }
            "cg-mem" | "max-rss" => {
                // cg-mem for cgroups, max-rss for non-cgroups
                if let Ok(m) = value.parse::<u32>() {
                    // max-rss is in KB, cg-mem is in KB too
                    if memory_kb == 0 || m > memory_kb {
                        memory_kb = m;
                    }
                }
            }
            "status" => {
                status = value.to_string();
            }
            "exitcode" => {
                exit_code = value.parse().unwrap_or(0);
            }
            _ => {}
        }
    }

    let verdict = match status.as_str() {
        "TO" => "time_limit_exceeded".to_string(),
        "SG" => "runtime_error".to_string(), // Signal (crash)
        "RE" => "runtime_error".to_string(),
        "XX" => "system_error".to_string(),
        "" if exit_code == 0 => "ok".to_string(), // Success, need to compare output
        "" => "runtime_error".to_string(),
        _ => "runtime_error".to_string(),
    };

    // Check if memory limit exceeded
    let verdict = if memory_kb > memory_limit_kb {
        "memory_limit_exceeded".to_string()
    } else {
        verdict
    };

    (verdict, time_ms, memory_kb)
}

/// Compile source code (outside sandbox for speed)
pub async fn compile(
    source_path: &Path,
    compile_cmd: &[String],
    work_dir: &Path,
) -> Result<CompileResult> {
    if compile_cmd.is_empty() {
        return Ok(CompileResult {
            success: true,
            message: None,
        });
    }

    debug!("Compiling {:?} with {:?}", source_path, compile_cmd);

    let output = Command::new(&compile_cmd[0])
        .args(&compile_cmd[1..])
        .current_dir(work_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await?;

    if output.status.success() {
        Ok(CompileResult {
            success: true,
            message: None,
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Ok(CompileResult {
            success: false,
            message: Some(stderr.to_string()),
        })
    }
}

/// Compare program output with expected output
pub fn compare_output(actual: &str, expected: &str) -> bool {
    // Normalize outputs: trim trailing whitespace from each line and trailing newlines
    let normalize = |s: &str| -> Vec<String> {
        s.lines()
            .map(|line| line.trim_end().to_string())
            .collect::<Vec<_>>()
    };

    let actual_lines = normalize(actual);
    let expected_lines = normalize(expected);

    // Remove trailing empty lines
    let trim_trailing = |lines: Vec<String>| -> Vec<String> {
        let mut lines = lines;
        while lines.last().map(|s| s.is_empty()).unwrap_or(false) {
            lines.pop();
        }
        lines
    };

    let actual_lines = trim_trailing(actual_lines);
    let expected_lines = trim_trailing(expected_lines);

    actual_lines == expected_lines
}

/// Run a program directly without sandbox (development fallback)
async fn run_direct(
    work_dir: &Path,
    run_cmd: &[String],
    input_content: &str,
    time_limit_ms: u32,
    _memory_limit_mb: u32,
) -> Result<RunResult> {
    warn!("Running WITHOUT sandbox - development mode only!");

    let start = Instant::now();
    let timeout_duration = Duration::from_millis((time_limit_ms as u64) * 2 + 1000);

    let mut child = Command::new(&run_cmd[0])
        .args(&run_cmd[1..])
        .current_dir(work_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .context("Failed to spawn process")?;

    // Write input
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(input_content.as_bytes()).await?;
    }

    // Wait with timeout
    let result = timeout(timeout_duration, child.wait_with_output()).await;

    let elapsed_ms = start.elapsed().as_millis() as u32;

    match result {
        Ok(Ok(output)) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            
            if output.status.success() {
                Ok(RunResult {
                    verdict: "ok".to_string(),
                    time_ms: elapsed_ms,
                    memory_kb: 0, // Can't measure without cgroups
                    output: stdout,
                })
            } else {
                let exit_code = output.status.code().unwrap_or(-1);
                let verdict = match exit_code {
                    137 | -9 => "time_limit_exceeded",
                    139 | -11 => "runtime_error", // SIGSEGV
                    _ => "runtime_error",
                };
                Ok(RunResult {
                    verdict: verdict.to_string(),
                    time_ms: elapsed_ms,
                    memory_kb: 0,
                    output: stdout,
                })
            }
        }
        Ok(Err(e)) => {
            anyhow::bail!("Process error: {}", e);
        }
        Err(_) => {
            // Timeout
            Ok(RunResult {
                verdict: "time_limit_exceeded".to_string(),
                time_ms: time_limit_ms,
                memory_kb: 0,
                output: String::new(),
            })
        }
    }
}

/// Run a program with isolate (or fallback to direct execution)
pub async fn run_with_isolate(
    box_id: u32,
    work_dir: &Path,
    run_cmd: &[String],
    input_content: &str,
    expected_output: &str,
    time_limit_ms: u32,
    memory_limit_mb: u32,
) -> Result<RunResult> {
    // Check if isolate is available
    let use_isolate = is_isolate_available().await;
    let use_cgroups = use_isolate && is_cgroups_available().await;

    let result = if use_isolate {
        if use_cgroups {
            info!("Using isolate sandbox with cgroups");
        } else {
            info!("Using isolate sandbox without cgroups (memory limits may be less accurate)");
        }
        
        // Initialize isolate box
        let isolate_box = IsolateBox::new(box_id, use_cgroups).await?;

        // Copy compiled program to box
        let box_work_dir = isolate_box.work_dir();
        
        // Copy all files from work_dir to box
        let mut entries = fs::read_dir(work_dir).await?;
        while let Some(entry) = entries.next_entry().await? {
            let dest = format!("{}/{}", box_work_dir, entry.file_name().to_string_lossy());
            fs::copy(entry.path(), &dest).await?;
        }

        // Write input to temp file
        let input_file = tempfile::NamedTempFile::new()?;
        fs::write(input_file.path(), input_content).await?;

        // Run program
        let result = isolate_box.run(
            run_cmd,
            Some(input_file.path()),
            time_limit_ms,
            memory_limit_mb,
        ).await?;

        // Cleanup
        isolate_box.cleanup().await?;
        
        result
    } else {
        warn!("Isolate not available, falling back to direct execution");
        run_direct(work_dir, run_cmd, input_content, time_limit_ms, memory_limit_mb).await?
    };

    // Determine final verdict
    let verdict = if result.verdict == "ok" {
        if compare_output(&result.output, expected_output) {
            "accepted".to_string()
        } else {
            "wrong_answer".to_string()
        }
    } else {
        result.verdict
    };

    Ok(RunResult {
        verdict,
        time_ms: result.time_ms,
        memory_kb: result.memory_kb,
        output: result.output,
    })
}
