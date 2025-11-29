mod languages;
mod sandbox;
mod storage;

use anyhow::Result;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use storage::StorageClient;
use tracing::{error, info, warn};

/// Job received from the Redis queue
#[derive(Debug, Serialize, Deserialize)]
pub struct JudgeJob {
    pub submission_id: i64,
    pub problem_id: i64,
    pub code: String,
    pub language: String,
    pub time_limit: u32,   // ms
    pub memory_limit: u32, // MB
    pub testcases: Vec<TestcaseInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestcaseInfo {
    pub id: i64,
    pub input_path: String,
    pub output_path: String,
}

/// Result of judging a submission
#[derive(Debug, Serialize, Deserialize)]
pub struct JudgeResult {
    pub submission_id: i64,
    pub verdict: String,
    pub execution_time: Option<u32>,
    pub memory_used: Option<u32>,
    pub testcase_results: Vec<TestcaseResult>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestcaseResult {
    pub testcase_id: i64,
    pub verdict: String,
    pub execution_time: Option<u32>,
    pub memory_used: Option<u32>,
}

const QUEUE_NAME: &str = "judge:queue";
const RESULT_CHANNEL: &str = "judge:results";
const RESULT_KEY_PREFIX: &str = "judge:result:";

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("judge=info".parse()?),
        )
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".into());

    info!("Starting Judge Worker...");
    info!("Connecting to Redis at {}", redis_url);

    // Initialize storage client
    let storage = StorageClient::from_env().await?;
    info!("Connected to MinIO storage");

    // Connect to Redis
    let client = redis::Client::open(redis_url)?;
    let mut conn = client.get_multiplexed_async_connection().await?;

    info!("Connected to Redis. Waiting for jobs...");

    // Box ID counter (simple implementation, in production use proper allocation)
    let mut box_id_counter: u32 = 0;

    loop {
        // Block and wait for a job from the queue (BLPOP)
        let result: Option<(String, String)> = conn.blpop(QUEUE_NAME, 0.0).await?;

        if let Some((_, job_data)) = result {
            match serde_json::from_str::<JudgeJob>(&job_data) {
                Ok(job) => {
                    info!(
                        "Received job: submission_id={}, language={}",
                        job.submission_id, job.language
                    );

                    // Get a box ID for this job
                    let box_id = box_id_counter % 100; // Cycle through 0-99
                    box_id_counter = box_id_counter.wrapping_add(1);

                    match process_job(&job, &storage, box_id).await {
                        Ok(result) => {
                            let result_json = serde_json::to_string(&result)?;
                            
                            // Store result in Redis for polling (expires in 1 hour)
                            let result_key = format!("{}{}", RESULT_KEY_PREFIX, result.submission_id);
                            let _: () = conn.set_ex(&result_key, &result_json, 3600).await?;
                            
                            // Also publish to results channel (for real-time updates if subscribed)
                            let _: () = conn.publish(RESULT_CHANNEL, &result_json).await?;
                            
                            info!(
                                "Job completed: submission_id={}, verdict={}",
                                result.submission_id, result.verdict
                            );
                        }
                        Err(e) => {
                            error!("Failed to process job {}: {}", job.submission_id, e);
                            // Send system error result
                            let error_result = JudgeResult {
                                submission_id: job.submission_id,
                                verdict: "system_error".into(),
                                execution_time: None,
                                memory_used: None,
                                testcase_results: vec![],
                            };
                            let result_json = serde_json::to_string(&error_result)?;
                            
                            // Store error result in Redis
                            let result_key = format!("{}{}", RESULT_KEY_PREFIX, job.submission_id);
                            let _: () = conn.set_ex(&result_key, &result_json, 3600).await?;
                            
                            let _: () = conn.publish(RESULT_CHANNEL, &result_json).await?;
                        }
                    }
                }
                Err(e) => {
                    warn!("Failed to parse job data: {}", e);
                }
            }
        }
    }
}

async fn process_job(job: &JudgeJob, storage: &StorageClient, box_id: u32) -> Result<JudgeResult> {
    let lang_config = languages::get_language_config(&job.language)
        .ok_or_else(|| anyhow::anyhow!("Unsupported language: {}", job.language))?;

    // Create temporary directory for this submission
    let temp_dir = tempfile::tempdir()?;
    let source_path = temp_dir.path().join(&lang_config.source_file);

    // Write source code to file
    std::fs::write(&source_path, &job.code)?;

    // Compile if needed
    if let Some(compile_cmd) = &lang_config.compile_command {
        let compile_result = sandbox::compile(&source_path, compile_cmd, temp_dir.path()).await?;
        if !compile_result.success {
            return Ok(JudgeResult {
                submission_id: job.submission_id,
                verdict: "compile_error".into(),
                execution_time: None,
                memory_used: None,
                testcase_results: vec![],
            });
        }
    }

    // Run testcases
    let mut testcase_results = Vec::new();
    let mut overall_verdict = "accepted".to_string();
    let mut max_time = 0u32;
    let mut max_memory = 0u32;

    for (idx, tc) in job.testcases.iter().enumerate() {
        // Download testcase files from MinIO
        let input_content = match storage.download_string(&tc.input_path).await {
            Ok(content) => content,
            Err(e) => {
                warn!("Failed to download input {}: {}", tc.input_path, e);
                // Use empty input as fallback for development
                String::new()
            }
        };

        let expected_output = match storage.download_string(&tc.output_path).await {
            Ok(content) => content,
            Err(e) => {
                warn!("Failed to download output {}: {}", tc.output_path, e);
                // Use empty output as fallback for development
                String::new()
            }
        };

        // Use unique box ID for each testcase to avoid conflicts
        let tc_box_id = box_id * 100 + (idx as u32 % 100);

        let run_result = sandbox::run_with_isolate(
            tc_box_id,
            temp_dir.path(),
            &lang_config.run_command,
            &input_content,
            &expected_output,
            job.time_limit,
            job.memory_limit,
        )
        .await?;

        let tc_result = TestcaseResult {
            testcase_id: tc.id,
            verdict: run_result.verdict.clone(),
            execution_time: Some(run_result.time_ms),
            memory_used: Some(run_result.memory_kb),
        };

        if run_result.verdict != "accepted" && overall_verdict == "accepted" {
            overall_verdict = run_result.verdict.clone();
        }

        max_time = max_time.max(run_result.time_ms);
        max_memory = max_memory.max(run_result.memory_kb);

        testcase_results.push(tc_result);
    }

    Ok(JudgeResult {
        submission_id: job.submission_id,
        verdict: overall_verdict,
        execution_time: Some(max_time),
        memory_used: Some(max_memory),
        testcase_results,
    })
}
