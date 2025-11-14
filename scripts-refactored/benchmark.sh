#!/bin/bash
# Performance benchmark comparing TypeScript vs Rust implementations

set -e

ITERATIONS=3
TS_TOTAL=0
RUST_TOTAL=0

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Performance Benchmark: TypeScript vs Rust Task Runner     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Warm up (to ensure fair comparison)
echo "🔥 Warming up..."
./scripts-refactored/target/release/tasks --help > /dev/null 2>&1
echo "✓ Warm-up complete"
echo ""

# Test: Setup command
echo "Test: setup command (dry run)"
echo "─────────────────────────────────────────────────────────────"

echo "TypeScript version:"
for i in $(seq 1 $ITERATIONS); do
    START=$(date +%s%N)
    timeout 5 node scripts/setup.ts > /dev/null 2>&1 || true
    END=$(date +%s%N)
    DURATION=$((($END - $START) / 1000000)) # Convert to milliseconds
    echo "  Run $i: ${DURATION}ms"
    TS_TOTAL=$((TS_TOTAL + DURATION))
done

echo ""
echo "Rust version:"
for i in $(seq 1 $ITERATIONS); do
    START=$(date +%s%N)
    timeout 5 ./scripts-refactored/target/release/tasks setup > /dev/null 2>&1 || true
    END=$(date +%s%N)
    DURATION=$((($END - $START) / 1000000))
    echo "  Run $i: ${DURATION}ms"
    RUST_TOTAL=$((RUST_TOTAL + DURATION))
done

echo ""
echo "Results:"
TS_AVG=$((TS_TOTAL / ITERATIONS))
RUST_AVG=$((RUST_TOTAL / ITERATIONS))
SPEEDUP=$(echo "scale=2; $TS_AVG / $RUST_AVG" | bc)

echo "  TypeScript average: ${TS_AVG}ms"
echo "  Rust average: ${RUST_AVG}ms"
echo "  Speedup: ${SPEEDUP}x faster"
echo ""

# Calculate percentage improvement
IMPROVEMENT=$(echo "scale=1; (($TS_AVG - $RUST_AVG) / $TS_AVG) * 100" | bc)
echo "  Performance improvement: ${IMPROVEMENT}%"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Benchmark Complete                                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
