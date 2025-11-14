# Wrapper script for the Rust-based task runner (Windows)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Binary = Join-Path $ScriptDir "target\release\tasks.exe"

# Check if binary exists
if (-not (Test-Path $Binary)) {
    Write-Error "Binary not found at $Binary"
    Write-Host "Please build the project first: cd scripts-refactored && cargo build --release"
    exit 1
}

# Execute the binary with all arguments
& $Binary $args
exit $LASTEXITCODE
