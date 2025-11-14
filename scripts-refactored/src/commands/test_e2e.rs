use anyhow::{bail, Result};
use colored::*;
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

pub async fn run(target: &str) -> Result<()> {
    println!("\n{}", "╔════════════════════════════════════════╗".magenta().bold());
    println!("{}", "║   arolariu.ro E2E Test Runner          ║".magenta().bold());
    println!("{}", "╚════════════════════════════════════════╝\n".magenta().bold());

    match target {
        "frontend" => start_newman_testing("frontend").await,
        "backend" => start_newman_testing("backend").await,
        "all" => {
            println!("{}", "\n🎯 Running all E2E tests...\n".cyan().bold());
            start_newman_testing("frontend").await?;
            println!("\n{}", "─────────────────────────────────────────────────\n".dimmed());
            start_newman_testing("backend").await?;
            Ok(())
        }
        _ => {
            eprintln!("{} Invalid target: \"{}\"", "✗".red(), target);
            println!("\n{}", "💡 Valid targets: frontend, backend, all".dimmed());
            println!("{}", "\n⚠️  Note: E2E_TEST_AUTH_TOKEN environment variable must be set\n".yellow());
            bail!("Invalid target");
        }
    }
}

async fn start_newman_testing(target: &str) -> Result<()> {
    println!("{}", format!("\n╔════════════════════════════════════════╗").magenta().bold());
    println!("{}", format!("║   E2E Testing: {:<23} ║", target).magenta().bold());
    println!("{}", format!("╚════════════════════════════════════════╝").magenta().bold());

    let auth_token = std::env::var("E2E_TEST_AUTH_TOKEN").unwrap_or_default();
    if auth_token.is_empty() {
        eprintln!("\n{}", "✗ E2E_TEST_AUTH_TOKEN environment variable is not set.".red());
        println!("{}", "💡 Set the E2E_TEST_AUTH_TOKEN environment variable before running tests.\n".yellow());
        bail!("E2E_TEST_AUTH_TOKEN environment variable is not set.");
    }

    let path = load_openapi_test_collection_path(target)?;
    let report_dir = std::env::var("NEWMAN_REPORT_DIR").unwrap_or_else(|_| "e2e-logs".to_string());

    println!("{}", format!("\n📦 Test collection: {}", target.bold()).cyan());
    println!("{}", format!("   Path: {}", path).dimmed());

    inject_auth_token_into_collection(&path, &auth_token)?;
    run_openapi_test_collection(target, &path, &report_dir).await?;

    println!("\n{}", format!("✅ Completed Newman tests for: {}\n", target).green().bold());

    Ok(())
}

fn load_openapi_test_collection_path(target: &str) -> Result<String> {
    let directory = match target {
        "frontend" => "sites/arolariu.ro",
        "backend" => "sites/api.arolariu.ro",
        _ => bail!("Invalid target"),
    };

    Ok(format!("{}/postman-collection.json", directory))
}

fn inject_auth_token_into_collection(collection_path: &str, token: &str) -> Result<()> {
    println!("{}", "\n🔑 Injecting auth token into collection...".cyan());
    println!("{}", format!("   Path: {}", collection_path).dimmed());

    let content = fs::read_to_string(collection_path)?;
    let mut collection: serde_json::Value = serde_json::from_str(&content)?;

    // Find and update the authToken variable
    if let Some(variables) = collection.get_mut("variable").and_then(|v| v.as_array_mut()) {
        let mut found = false;
        for var in variables.iter_mut() {
            if let Some(key) = var.get("key").and_then(|k| k.as_str()) {
                if key == "authToken" {
                    var["value"] = serde_json::Value::String(token.to_string());
                    found = true;
                    break;
                }
            }
        }

        if !found {
            variables.push(serde_json::json!({
                "key": "authToken",
                "value": token,
                "type": "string"
            }));
        }
    } else {
        collection["variable"] = serde_json::json!([{
            "key": "authToken",
            "value": token,
            "type": "string"
        }]);
    }

    fs::write(collection_path, serde_json::to_string_pretty(&collection)?)?;
    println!("{}", "   ✓ Auth token injected successfully".green());

    Ok(())
}

async fn run_openapi_test_collection(target: &str, path: &str, report_dir: &str) -> Result<()> {
    println!("{}", format!("\n🧪 Running Newman test collection for: {}", target.bold()).cyan());

    // Ensure report directory exists
    fs::create_dir_all(report_dir)?;
    println!("{}", format!("   📁 Report directory: {}", report_dir).dimmed());

    let json_path = format!("{}/newman-{}.json", report_dir, target);
    let junit_path = format!("{}/newman-{}.xml", report_dir, target);

    println!("{}", format!("   📊 JSON report: {}", json_path).dimmed());
    println!("{}", format!("   📊 JUnit report: {}", junit_path).dimmed());
    println!("{}", "\n⚡ Executing tests...\n".cyan());

    let output = Command::new("npx")
        .args(&[
            "newman",
            "run",
            path,
            "--reporters",
            "cli,json,junit",
            "--reporter-json-export",
            &json_path,
            "--reporter-junit-export",
            &junit_path,
        ])
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .output()
        .await?;

    if output.status.success() {
        println!("\n{}", format!("   ✓ Newman tests passed for {}", target).green());
    } else {
        println!("\n{}", format!("   ✗ Newman tests failed for {}", target).red());
        bail!("Newman tests failed");
    }

    // Generate assertion summary
    println!("{}", "\n📝 Generating assertion summary...".cyan());
    write_assertion_summary(target, report_dir, &json_path)?;

    Ok(())
}

fn write_assertion_summary(target: &str, report_dir: &str, json_path: &str) -> Result<()> {
    let path = PathBuf::from(json_path);
    if !path.exists() {
        println!("{}", format!("   ⚠ JSON report not found, cannot create summary: {}", json_path).yellow());
        return Ok(());
    }

    let content = fs::read_to_string(json_path)?;
    let data: serde_json::Value = serde_json::from_str(&content)?;

    let empty_failures = vec![];
    let failures = data
        .get("run")
        .and_then(|r| r.get("failures"))
        .and_then(|f| f.as_array())
        .unwrap_or(&empty_failures);

    let mut md = format!("### Failed Assertions ({})\n", target);
    if failures.is_empty() {
        md.push_str("No failed assertions.\n");
        println!("{}", format!("   ✓ No failed assertions for {}", target).green());
    } else {
        for (i, failure) in failures.iter().enumerate() {
            let assertion = failure.get("assertion").and_then(|a| a.as_str()).unwrap_or("Unknown");
            let error = failure
                .get("error")
                .and_then(|e| e.get("message"))
                .and_then(|m| m.as_str())
                .or_else(|| failure.get("error").and_then(|e| e.as_str()))
                .unwrap_or("Unknown error");
            let item = failure
                .get("source")
                .and_then(|s| s.get("name"))
                .and_then(|n| n.as_str())
                .or_else(|| failure.get("parent").and_then(|p| p.get("name")).and_then(|n| n.as_str()))
                .unwrap_or("Unknown");

            md.push_str(&format!("{}. AssertionError  {}\n   {}\n   in \"{}\"\n\n", i + 1, assertion, error, item));
        }
        println!("{}", format!("   ⚠ {} failed assertion(s) for {}", failures.len(), target).yellow());
    }

    let summary_path = format!("{}/newman-{}-summary.md", report_dir, target);
    fs::write(&summary_path, md)?;
    println!("{}", format!("   📄 Summary written to: {}", summary_path).dimmed());

    Ok(())
}
