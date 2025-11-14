#!/bin/bash
# Wrapper script for the Rust-based task runner

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BINARY="${SCRIPT_DIR}/target/release/tasks"

# Check if binary exists
if [ ! -f "$BINARY" ]; then
    echo "Error: Binary not found at $BINARY"
    echo "Please build the project first: cd scripts-refactored && cargo build --release"
    exit 1
fi

# Execute the binary with all arguments
exec "$BINARY" "$@"
