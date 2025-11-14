use clap::{Parser, Subcommand};
use colored::*;

mod commands;
mod common;

use commands::{format, generate, lint, setup, test_e2e};

#[derive(Parser)]
#[command(name = "tasks")]
#[command(about = "arolariu.ro monorepo task runner", long_about = None)]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Format code using Prettier and dotnet format
    Format {
        /// Target to format: all, packages, website, cv, api
        target: String,
    },
    /// Lint code using ESLint
    Lint {
        /// Target to lint: all, packages, website, cv
        target: String,
    },
    /// Setup development environment
    Setup,
    /// Generate assets (env, acks, i18n, gql)
    Generate {
        /// Enable verbose logging
        #[arg(short, long)]
        verbose: bool,
        /// Generate environment files
        #[arg(long)]
        env: bool,
        /// Generate acknowledgements
        #[arg(long)]
        acks: bool,
        /// Generate i18n files
        #[arg(long)]
        i18n: bool,
        /// Generate GraphQL types
        #[arg(long)]
        gql: bool,
    },
    /// Run E2E tests using Newman
    TestE2e {
        /// Target to test: frontend, backend, all
        target: String,
    },
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Format { target } => format::run(&target).await,
        Commands::Lint { target } => lint::run(&target).await,
        Commands::Setup => setup::run().await,
        Commands::Generate {
            verbose,
            env,
            acks,
            i18n,
            gql,
        } => generate::run(verbose, env, acks, i18n, gql).await,
        Commands::TestE2e { target } => test_e2e::run(&target).await,
    };

    match result {
        Ok(_) => {
            println!("\n{}", "✅ Task completed successfully!".green().bold());
            std::process::exit(0);
        }
        Err(e) => {
            eprintln!("\n{} {}", "❌ Task failed:".red().bold(), e);
            std::process::exit(1);
        }
    }
}
