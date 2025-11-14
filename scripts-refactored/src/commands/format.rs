use anyhow::{bail, Result};
use colored::*;
use std::collections::HashMap;
use std::path::PathBuf;

use crate::common::run_with_spinner;

pub async fn run(target: &str) -> Result<()> {
    println!("\n{}", "╔════════════════════════════════════════╗".magenta().bold());
    println!("{}", "║   arolariu.ro Code Formatter Tool      ║".magenta().bold());
    println!("{}", "╚════════════════════════════════════════╝\n".magenta().bold());

    match target {
        "all" => run_all_targets().await,
        "packages" | "website" | "cv" | "api" => run_single_target(target).await,
        _ => {
            eprintln!("{} Invalid target: \"{}\"", "✗".red(), target);
            println!("\n{}", "💡 Valid targets: all, packages, website, cv, api".dimmed());
            bail!("Invalid target");
        }
    }
}

async fn run_all_targets() -> Result<()> {
    println!("{}\n", "🧵 Phase 1: Checking all targets in parallel...".magenta().bold());

    let targets = vec!["packages", "website", "cv", "api"];
    let mut check_results = Vec::new();

    // Run checks in parallel
    let mut handles = Vec::new();
    for target in &targets {
        let target = target.to_string();
        let handle = tokio::spawn(async move {
            let result = check_target(&target, true).await;
            (target, result)
        });
        handles.push(handle);
    }

    for handle in handles {
        let (target, result) = handle.await?;
        check_results.push((target, result));
    }

    println!(); // Add spacing after checks

    // Phase 2: Format only the targets that failed checks
    let targets_to_format: Vec<_> = check_results
        .iter()
        .filter_map(|(target, result)| {
            if let Ok((code, _)) = result {
                if *code != 0 {
                    Some(target.clone())
                } else {
                    None
                }
            } else {
                Some(target.clone())
            }
        })
        .collect();

    if targets_to_format.is_empty() {
        println!("{}\n", "✓ All targets already properly formatted!".green());
        return Ok(());
    }

    println!(
        "{}\n",
        format!(
            "🧵 Phase 2: Formatting {} target(s) in parallel...",
            targets_to_format.len()
        )
        .magenta()
        .bold()
    );

    // Format failed targets in parallel
    let mut handles = Vec::new();
    for target in &targets_to_format {
        let target = target.to_string();
        let handle = tokio::spawn(async move { format_target(&target, true).await });
        handles.push(handle);
    }

    let mut failed_count = 0;
    for handle in handles {
        let result = handle.await?;
        if let Ok((code, _)) = result {
            if code != 0 {
                failed_count += 1;
            }
        } else {
            failed_count += 1;
        }
    }

    println!(); // Add spacing after formatting

    if failed_count > 0 {
        println!("{}", format!("\n⚠ {} target(s) had formatting issues", failed_count).yellow());
        bail!("Some targets had formatting issues");
    }

    Ok(())
}

async fn run_single_target(target: &str) -> Result<()> {
    println!("{}\n", format!("🎨 Formatting: {}", target).magenta().bold());

    // For single targets, show full output
    let check_result = check_target(target, false).await?;

    // If check passed, we're done
    if check_result.0 == 0 {
        return Ok(());
    }

    // Otherwise, format the code
    let format_result = format_target(target, false).await?;
    if format_result.0 != 0 {
        bail!("Formatting failed");
    }

    Ok(())
}

async fn check_target(target: &str, hide_output: bool) -> Result<(i32, String)> {
    if target == "api" {
        return run_with_spinner(
            "dotnet",
            &["format", "arolariu.slnx", "--verify-no-changes", "--verbosity", if hide_output { "quiet" } else { "detailed" }],
            &format!("{} Checking {}", "🔍".cyan(), ".NET API".bold()),
            hide_output,
        )
        .await;
    }

    // Prettier targets
    let directory_map: HashMap<&str, &str> = [
        ("packages", "packages/components/**"),
        ("website", "sites/arolariu.ro/**"),
        ("cv", "sites/cv.arolariu.ro/**"),
    ]
    .iter()
    .cloned()
    .collect();

    let directory = directory_map
        .get(target)
        .ok_or_else(|| anyhow::anyhow!("No directory mapping found for target: {}", target))?;

    // Find prettier config
    let config_path = find_prettier_config()?;

    run_with_spinner(
        "node",
        &[
            "node_modules/prettier/bin/prettier.cjs",
            "--check",
            directory,
            "--cache",
            "--config",
            &config_path,
            "--config-precedence",
            "prefer-file",
            "--check-ignore-pragma",
        ],
        &format!("{} Checking {}", "🔍".cyan(), target.bold()),
        hide_output,
    )
    .await
}

async fn format_target(target: &str, hide_output: bool) -> Result<(i32, String)> {
    if target == "api" {
        return run_with_spinner(
            "dotnet",
            &["format", "arolariu.slnx", "--verbosity", if hide_output { "quiet" } else { "detailed" }],
            &format!("{} Formatting {}", "🔧".cyan(), ".NET API".bold()),
            hide_output,
        )
        .await;
    }

    // Prettier targets
    let directory_map: HashMap<&str, &str> = [
        ("packages", "packages/components/**"),
        ("website", "sites/arolariu.ro/**"),
        ("cv", "sites/cv.arolariu.ro/**"),
    ]
    .iter()
    .cloned()
    .collect();

    let directory = directory_map
        .get(target)
        .ok_or_else(|| anyhow::anyhow!("No directory mapping found for target: {}", target))?;

    // Find prettier config
    let config_path = find_prettier_config()?;

    run_with_spinner(
        "node",
        &[
            "node_modules/prettier/bin/prettier.cjs",
            "--write",
            directory,
            "--cache",
            "--config",
            &config_path,
            "--config-precedence",
            "prefer-file",
            "--check-ignore-pragma",
        ],
        &format!("{} Formatting {}", "✨".cyan(), target.bold()),
        hide_output,
    )
    .await
}

fn find_prettier_config() -> Result<String> {
    // Look for prettier config in common locations
    let possible_configs = vec![
        "prettier.config.ts",
        ".prettierrc",
        ".prettierrc.json",
        ".prettierrc.js",
        ".prettierrc.cjs",
        "prettier.config.js",
        "prettier.config.cjs",
    ];

    for config in possible_configs {
        let path = PathBuf::from(config);
        if path.exists() {
            return Ok(config.to_string());
        }
    }

    bail!("Could not find prettier configuration file");
}
