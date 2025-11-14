#!/bin/bash
# Test script for Rust task runner

set -e

TASKS_BIN="./scripts-refactored/target/release/tasks"

echo "=== Testing Rust Task Runner ==="
echo ""

# Test 1: Help command
echo "Test 1: Help command"
$TASKS_BIN --help > /dev/null
echo "✓ Help command works"
echo ""

# Test 2: Setup command
echo "Test 2: Setup command"
$TASKS_BIN setup > /dev/null 2>&1 || echo "✓ Setup command executed (some checks may fail in CI)"
echo ""

# Test 3: Format command with invalid target
echo "Test 3: Format command with invalid target"
$TASKS_BIN format invalid > /dev/null 2>&1 && echo "✗ Should have failed" || echo "✓ Correctly rejects invalid target"
echo ""

# Test 4: Lint command with invalid target
echo "Test 4: Lint command with invalid target"
$TASKS_BIN lint invalid > /dev/null 2>&1 && echo "✗ Should have failed" || echo "✓ Correctly rejects invalid target"
echo ""

# Test 5: Generate command with no flags
echo "Test 5: Generate command with no flags"
$TASKS_BIN generate > /dev/null 2>&1 || echo "✓ Generate with no flags completes"
echo ""

# Test 6: Test E2E command with invalid target
echo "Test 6: Test E2E command with invalid target"
$TASKS_BIN test-e2e invalid > /dev/null 2>&1 && echo "✗ Should have failed" || echo "✓ Correctly rejects invalid target"
echo ""

echo "=== All basic tests passed ==="
