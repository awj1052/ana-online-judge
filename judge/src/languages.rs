//! Language configuration for compilation and execution

/// Configuration for a supported programming language
#[derive(Debug, Clone)]
pub struct LanguageConfig {
    /// Name of the source file (e.g., "main.cpp")
    pub source_file: String,
    /// Compile command template (None if interpreted)
    pub compile_command: Option<Vec<String>>,
    /// Run command template
    pub run_command: Vec<String>,
}

/// Get language configuration by language name
pub fn get_language_config(language: &str) -> Option<LanguageConfig> {
    match language.to_lowercase().as_str() {
        "c" => Some(LanguageConfig {
            source_file: "main.c".into(),
            compile_command: Some(into_command("gcc -o main main.c -O2 -Wall -lm -static -std=c17")),
            run_command: into_command("./main"),
        }),
        "cpp" | "c++" => Some(LanguageConfig {
            source_file: "main.cpp".into(),
            compile_command: Some(into_command("g++ -o main main.cpp -O2 -Wall -lm -static -std=c++20")),
            run_command: into_command("./main"),
        }),
        "python" | "python3" => Some(LanguageConfig {
            source_file: "main.py".into(),
            compile_command: None,
            run_command: into_command("python3 main.py"),
        }),
        "java" => Some(LanguageConfig {
            source_file: "Main.java".into(),
            compile_command: Some(into_command("javac Main.java")),
            run_command: into_command("java Main"),
        }),
        _ => None,
    }
}

fn into_command(command: &str) -> Vec<String> {
  command.split_whitespace().map(|s| s.to_string()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_language_config() {
        assert!(get_language_config("c").is_some());
        assert!(get_language_config("cpp").is_some());
        assert!(get_language_config("python").is_some());
        assert!(get_language_config("java").is_some());
        assert!(get_language_config("unknown").is_none());
    }
}

