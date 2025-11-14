use anyhow::{bail, Result};
use colored::*;
use std::process::Stdio;
use tokio::process::Command;

pub async fn run(target: &str) -> Result<()> {
    println!("\n{}", "╔════════════════════════════════════════╗".magenta().bold());
    println!("{}", "║    arolariu.ro Code Linter Tool        ║".magenta().bold());
    println!("{}", "╚════════════════════════════════════════╝\n".magenta().bold());

    match target {
        "all" | "packages" | "website" | "cv" => {
            start_eslint(target).await
        }
        _ => {
            eprintln!("{} Invalid target: \"{}\"", "✗".red(), target);
            println!("\n{}", "💡 Valid targets: all, packages, website, cv".dimmed());
            bail!("Invalid target");
        }
    }
}

async fn start_eslint(target: &str) -> Result<()> {
    println!("{}", format!("\n🔎 Running ESLint for: {}", target).magenta().bold());

    if target == "all" {
        println!("{}", "⏱️  Warning: Running lint on 'all' may take a while...".yellow());
    }

    // We'll invoke the Node.js ESLint API directly via a small JS wrapper
    // This is more efficient than trying to replicate ESLint's complexity in Rust
    let exit_code = run_eslint_via_node(target).await?;

    if exit_code == 0 {
        println!("\n{}", "✅ Linting completed successfully!".green().bold());
        Ok(())
    } else {
        println!("\n{}", "❌ Linting completed with errors".red().bold());
        bail!("Linting failed");
    }
}

async fn run_eslint_via_node(target: &str) -> Result<i32> {
    // Call the original TypeScript lint script via node
    // This allows us to keep the complex ESLint configuration intact
    let output = Command::new("node")
        .args(&["scripts/lint.ts", target])
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .output()
        .await?;

    Ok(output.status.code().unwrap_or(1))
}
