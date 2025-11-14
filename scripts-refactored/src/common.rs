use anyhow::{Context, Result};
use colored::*;
use indicatif::{ProgressBar, ProgressStyle};
use std::process::{Command, Stdio};
use tokio::process::Command as TokioCommand;

/// Run a command with a spinner and return the result
pub async fn run_with_spinner(
    command: &str,
    args: &[&str],
    spinner_text: &str,
    hide_output: bool,
) -> Result<(i32, String)> {
    if hide_output {
        let pb = ProgressBar::new_spinner();
        pb.set_style(
            ProgressStyle::default_spinner()
                .template("{spinner:.cyan} {msg}")
                .unwrap(),
        );
        pb.set_message(spinner_text.to_string());
        pb.enable_steady_tick(std::time::Duration::from_millis(100));

        let output = TokioCommand::new(command)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .context(format!("Failed to execute command: {}", command))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let combined_output = format!("{}{}", stdout, stderr);

        let exit_code = output.status.code().unwrap_or(1);

        if exit_code == 0 {
            pb.finish_with_message(format!("{} {}", spinner_text, "✓".green()));
        } else {
            pb.finish_with_message(format!("{} {}", spinner_text, "✗".red()));
            if !combined_output.trim().is_empty() {
                println!("\n{}", combined_output.trim().dimmed());
            }
        }

        Ok((exit_code, combined_output))
    } else {
        println!("\n{} {}", "⚡".cyan(), spinner_text);

        let output = TokioCommand::new(command)
            .args(args)
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .output()
            .await
            .context(format!("Failed to execute command: {}", command))?;

        let exit_code = output.status.code().unwrap_or(1);

        if exit_code == 0 {
            println!("{} {} {}", "✓".green(), spinner_text, "completed successfully!");
        } else {
            println!("{} {} {}", "✗".red(), spinner_text, "failed!");
        }

        Ok((exit_code, String::new()))
    }
}

/// Check if a command exists in the system PATH
pub fn command_exists(command: &str) -> bool {
    which::which(command).is_ok()
}

/// Get the major version of a command
pub fn get_command_version(command: &str, args: &[&str]) -> Result<(String, u32)> {
    let output = Command::new(command)
        .args(args)
        .output()
        .context(format!("Failed to get version for: {}", command))?;

    let version_str = String::from_utf8_lossy(&output.stdout)
        .trim()
        .trim_start_matches('v')
        .to_string();

    let major_version = version_str
        .split('.')
        .next()
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(0);

    Ok((version_str, major_version))
}

/// Environment flags
pub fn is_production_environment() -> bool {
    std::env::var("PRODUCTION").map(|v| v == "true").unwrap_or(false)
}

pub fn is_azure_infrastructure() -> bool {
    std::env::var("INFRA").map(|v| v == "azure").unwrap_or(false)
}

pub fn is_verbose_mode() -> bool {
    std::env::var("VERBOSE").map(|v| v == "true").unwrap_or(false)
}

pub fn is_in_ci() -> bool {
    std::env::var("CI").is_ok() || std::env::var("GITHUB_ACTIONS").is_ok()
}
