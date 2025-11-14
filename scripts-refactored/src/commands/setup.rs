use anyhow::Result;
use colored::*;
use std::process::Stdio;
use tokio::process::Command;

use crate::common::{command_exists, get_command_version};

const REQUIRED_DOTNET_VERSION: u32 = 10;
const REQUIRED_NODE_VERSION: u32 = 24;
const REQUIRED_NPM_VERSION: u32 = 11;

pub async fn run() -> Result<()> {
    println!("\n{}", "╔════════════════════════════════════════╗".magenta().bold());
    println!("{}", "║   arolariu.ro Development Setup Tool   ║".magenta().bold());
    println!("{}", "╚════════════════════════════════════════╝\n".magenta().bold());

    let mut has_errors = false;

    // Check .NET version
    println!("{}", "\n🔍 Checking .NET SDK...".bold());
    has_errors |= check_dotnet().await?;

    // Check Node.js version
    println!("{}", "\n🔍 Checking Node.js...".bold());
    has_errors |= check_nodejs().await?;

    // Check npm version
    println!("{}", "\n🔍 Checking npm...".bold());
    has_errors |= check_npm().await?;

    if has_errors {
        println!("\n{}", "❌ Setup encountered errors. Please resolve them before continuing.\n".red().bold());
        std::process::exit(1);
    }

    println!("\n{}", "✅ Setup completed successfully!".green().bold());
    println!("{}", "\n📝 Next steps:".dimmed());
    println!("{}", "  1. Restart your terminal or IDE if you installed new software".dimmed());
    println!("{}", "  2. Run 'npm run dev' to start development".dimmed());
    println!("{}", "  3. Check the README.md for more information\n".dimmed());

    Ok(())
}

async fn check_dotnet() -> Result<bool> {
    if !command_exists("dotnet") {
        println!("{}", "  ✗ .NET is not installed".red());
        println!(
            "{}",
            format!("  → Required: .NET {}.x", REQUIRED_DOTNET_VERSION).yellow()
        );
        return install_dotnet().await;
    }

    match get_command_version("dotnet", &["--version"]) {
        Ok((version, major_version)) => {
            if major_version < REQUIRED_DOTNET_VERSION {
                println!("{}", format!("  ⚠ Found .NET {}", version).yellow());
                println!(
                    "{}",
                    format!("  → Required: .NET {}.x", REQUIRED_DOTNET_VERSION).yellow()
                );
                return install_dotnet().await;
            }
            println!("{}", format!("  ✓ .NET {} is installed", version).green());
            Ok(false)
        }
        Err(_) => {
            println!("{}", "  ✗ .NET version check failed".red());
            install_dotnet().await
        }
    }
}

async fn check_nodejs() -> Result<bool> {
    if !command_exists("node") {
        println!("{}", "  ✗ Node.js is not installed".red());
        println!(
            "{}",
            format!("  → Required: Node.js {}.x or higher", REQUIRED_NODE_VERSION).yellow()
        );
        return install_nodejs().await;
    }

    match get_command_version("node", &["--version"]) {
        Ok((version, major_version)) => {
            if major_version < REQUIRED_NODE_VERSION {
                println!("{}", format!("  ⚠ Found Node.js {}", version).yellow());
                println!(
                    "{}",
                    format!("  → Required: Node.js {}.x or higher", REQUIRED_NODE_VERSION).yellow()
                );
                return install_nodejs().await;
            }
            println!("{}", format!("  ✓ Node.js {} is installed", version).green());
            Ok(false)
        }
        Err(_) => {
            println!("{}", "  ✗ Node.js version check failed".red());
            install_nodejs().await
        }
    }
}

async fn check_npm() -> Result<bool> {
    if !command_exists("npm") {
        println!("{}", "  ✗ npm is not installed".red());
        println!("{}", "  → npm should be installed with Node.js".yellow());
        return Ok(true);
    }

    match get_command_version("npm", &["--version"]) {
        Ok((version, major_version)) => {
            if major_version < REQUIRED_NPM_VERSION {
                println!("{}", format!("  ⚠ Found npm {}", version).yellow());
                println!(
                    "{}",
                    format!("  → Required: npm {}.x or higher", REQUIRED_NPM_VERSION).yellow()
                );
                println!("{}", "  → Updating npm...".dimmed());

                let output = Command::new("npm")
                    .args(&["install", "-g", "npm@latest"])
                    .stdout(Stdio::inherit())
                    .stderr(Stdio::inherit())
                    .output()
                    .await?;

                if output.status.success() {
                    println!("{}", "  ✓ npm updated successfully".green());
                    Ok(false)
                } else {
                    println!("{}", "  ✗ Failed to update npm".red());
                    Ok(true)
                }
            } else {
                println!("{}", format!("  ✓ npm {} is installed", version).green());
                Ok(false)
            }
        }
        Err(_) => {
            println!("{}", "  ✗ npm version check failed".red());
            Ok(true)
        }
    }
}

async fn install_dotnet() -> Result<bool> {
    println!("{}", "\n📥 Installing .NET 10 SDK...".cyan());
    println!("{}", "  → Please visit https://dot.net and download .NET 10 SDK".yellow());
    println!("{}", "  → Or use your system's package manager".yellow());
    Ok(true)
}

async fn install_nodejs() -> Result<bool> {
    println!("{}", "\n📥 Installing Node.js 24...".cyan());
    println!("{}", "  → Please visit https://nodejs.org and download Node.js 24".yellow());
    println!("{}", "  → Or use nvm: nvm install 24".yellow());
    Ok(true)
}
