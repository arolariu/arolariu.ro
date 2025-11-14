#!/bin/bash
# Comprehensive testing script for Rust task runner

TASKS_BIN="./scripts-refactored/target/release/tasks"
PASSED=0
FAILED=0

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Comprehensive Test Suite: Rust Task Runner              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Helper function to run tests
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "Testing: $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo "✓ PASS"
        ((PASSED++))
        return 0
    else
        echo "✗ FAIL"
        ((FAILED++))
        return 1
    fi
}

echo "═══ CLI Interface Tests ═══"
run_test "Help command" "$TASKS_BIN --help"
run_test "Version command" "$TASKS_BIN --version"
echo ""

echo "═══ Format Command Tests ═══"
run_test "Format help" "$TASKS_BIN format --help"
echo ""

echo "═══ Lint Command Tests ═══"
run_test "Lint help" "$TASKS_BIN lint --help"
echo ""

echo "═══ Setup Command Tests ═══"
run_test "Setup help" "$TASKS_BIN setup --help"
run_test "Setup shows environment checks" "timeout 10 $TASKS_BIN setup 2>&1 | grep -q 'Checking'"
echo ""

echo "═══ Generate Command Tests ═══"
run_test "Generate help" "$TASKS_BIN generate --help"
run_test "Generate no flags (safe)" "$TASKS_BIN generate 2>&1 | grep -q 'No generation tasks'"
echo ""

echo "═══ Test E2E Command Tests ═══"
run_test "Test E2E help" "$TASKS_BIN test-e2e --help"
echo ""

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Test Results                                            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  ✓ Passed: $PASSED"
echo "  ✗ Failed: $FAILED"
echo "  Total:   $((PASSED + FAILED))"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo "🎉 All tests passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
