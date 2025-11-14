use anyhow::Result;
use colored::*;
use std::process::Stdio;
use tokio::process::Command;

pub async fn run(verbose: bool, env: bool, acks: bool, i18n: bool, gql: bool) -> Result<()> {
    println!("\n{}", "╔══════════════════════════════════════════════════════════════════╗".magenta());
    println!("{}", "║          ||arolariu.ro|| Generation Orchestrator                 ║".magenta());
    println!("{}", "╚══════════════════════════════════════════════════════════════════╝\n".magenta());

    println!("{}\n", "🔧 Configuration:".cyan());
    println!(
        "{}",
        format!(
            "   Verbose: {}",
            if verbose {
                "✅ Enabled".green()
            } else {
                "❌ Disabled".red()
            }
        )
        .dimmed()
    );
    println!("{}", format!("   Working Directory: {}", std::env::current_dir()?.display()).dimmed());
    println!("{}", "   Selected Tasks:".dimmed());
    println!(
        "{}",
        format!(
            "     • Env ({})",
            if env { "✓".green() } else { "✗".red() }
        )
        .dimmed()
    );
    println!(
        "{}",
        format!(
            "     • Acks ({})",
            if acks { "✓".green() } else { "✗".red() }
        )
        .dimmed()
    );
    println!(
        "{}",
        format!(
            "     • i18n ({})",
            if i18n { "✓".green() } else { "✗".red() }
        )
        .dimmed()
    );
    println!(
        "{}",
        format!(
            "     • GraphQL ({})",
            if gql { "✓".green() } else { "✗".red() }
        )
        .dimmed()
    );
    println!();

    if !(env || acks || i18n || gql) {
        println!("{}", "⚠ No generation tasks selected. Nothing to do.".yellow());
        println!("{}", "   Tip: Use one or more flags (e.g. --env --acks --i18n --gql).".dimmed());
        return Ok(());
    }

    let mut tasks_executed = 0;

    if env {
        println!("{}", "🚀 Running environment configuration generator...".cyan());
        run_generator("generate.env.ts", verbose).await?;
        tasks_executed += 1;
    }

    if acks {
        println!("{}", "📄 Running acknowledgements (licenses) generator...".cyan());
        run_generator("generate.acks.ts", verbose).await?;
        tasks_executed += 1;
    }

    if i18n {
        println!("{}", "🌍 Running internationalization (i18n) generator...".cyan());
        run_generator("generate.i18n.ts", verbose).await?;
        tasks_executed += 1;
    }

    if gql {
        println!("{}", "🧬 Running GraphQL types generator...".cyan());
        run_generator("generate.gql.ts", verbose).await?;
        tasks_executed += 1;
    }

    println!("\n{}", "✨ All requested generation tasks completed.".green());
    println!("{}", format!("   Executed {} task(s).", tasks_executed.to_string().green()).dimmed());

    Ok(())
}

async fn run_generator(script_name: &str, verbose: bool) -> Result<()> {
    let mut args = vec![format!("scripts/{}", script_name)];
    if verbose {
        args.push("--verbose".to_string());
    }

    let output = Command::new("node")
        .args(&args)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .output()
        .await?;

    if !output.status.success() {
        anyhow::bail!("Generator {} failed", script_name);
    }

    Ok(())
}
