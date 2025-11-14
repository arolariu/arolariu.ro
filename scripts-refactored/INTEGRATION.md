# Integration Guide: Migrating to Rust Task Runner

This guide explains how to integrate the Rust-based task runner into the arolariu.ro monorepo workflow.

## Current Status

✅ **Completed:**
- Rust task runner implementation in `scripts-refactored/`
- All core commands: format, lint, setup, generate, test-e2e
- Documentation and wrapper scripts
- Basic functionality tests

⏳ **In Progress:**
- Comprehensive command testing
- Performance benchmarking

🔜 **Planned:**
- Optional npm script updates
- CI/CD integration
- Production deployment

## Quick Start

### 1. Build the Rust Binary

```bash
cd scripts-refactored
cargo build --release
```

The optimized binary will be at `scripts-refactored/target/release/tasks` (or `tasks.exe` on Windows).

### 2. Test the Binary

```bash
# From repository root
./scripts-refactored/target/release/tasks --help

# Or use the wrapper script
./scripts-refactored/tasks.sh --help  # Unix
./scripts-refactored/tasks.ps1 --help # Windows
```

### 3. Try Individual Commands

```bash
# Setup (check environment)
./scripts-refactored/target/release/tasks setup

# Format code
./scripts-refactored/target/release/tasks format packages

# Lint code
./scripts-refactored/target/release/tasks lint website

# Generate assets
./scripts-refactored/target/release/tasks generate --env --acks

# Run E2E tests (requires auth token)
E2E_TEST_AUTH_TOKEN=<token> ./scripts-refactored/target/release/tasks test-e2e frontend
```

## Integration Options

### Option 1: Side-by-Side (Recommended Initially)

Keep both TypeScript and Rust implementations available:

**Advantages:**
- Zero risk - existing workflows unchanged
- Easy A/B testing and comparison
- Gradual adoption path
- Rollback capability

**Implementation:**
```json
{
  "scripts": {
    "format": "node scripts/format.ts all",
    "format:rust": "./scripts-refactored/target/release/tasks format all",
    "lint": "node scripts/lint.ts all",
    "lint:rust": "./scripts-refactored/target/release/tasks lint all"
  }
}
```

### Option 2: Gradual Replacement

Replace commands one at a time after validation:

1. Start with low-risk commands (setup, format on specific targets)
2. Monitor for issues
3. Gradually expand to more commands
4. Keep TypeScript scripts as fallback

**Example Migration Path:**
```json
{
  "scripts": {
    "setup": "./scripts-refactored/target/release/tasks setup",
    "format": "./scripts-refactored/target/release/tasks format all",
    "lint": "node scripts/lint.ts all",  // Still using TypeScript
    "generate": "node scripts/generate.ts"  // Still using TypeScript
  }
}
```

### Option 3: Full Replacement (After Extensive Testing)

Replace all commands with Rust versions:

```json
{
  "scripts": {
    "setup": "./scripts-refactored/target/release/tasks setup",
    "format": "./scripts-refactored/target/release/tasks format all",
    "format:packages": "./scripts-refactored/target/release/tasks format packages",
    "lint": "./scripts-refactored/target/release/tasks lint all",
    "lint:website": "./scripts-refactored/target/release/tasks lint website",
    "generate": "./scripts-refactored/target/release/tasks generate",
    "generate:env": "./scripts-refactored/target/release/tasks generate --env",
    "test:e2e": "./scripts-refactored/target/release/tasks test-e2e all"
  }
}
```

## CI/CD Integration

### GitHub Actions

Add Rust setup and caching to workflows:

```yaml
- name: Setup Rust
  uses: actions-rs/toolchain@v1
  with:
    toolchain: stable
    profile: minimal
    override: true

- name: Cache Rust dependencies
  uses: actions/cache@v3
  with:
    path: |
      ~/.cargo/registry
      ~/.cargo/git
      scripts-refactored/target
    key: ${{ runner.os }}-cargo-${{ hashFiles('scripts-refactored/Cargo.lock') }}

- name: Build Rust task runner
  run: cd scripts-refactored && cargo build --release

- name: Run format check
  run: ./scripts-refactored/target/release/tasks format all
```

## Performance Benchmarking

### Measuring Improvements

Create a benchmark script:

```bash
#!/bin/bash
# benchmark.sh

echo "=== TypeScript Version ==="
time node scripts/format.ts packages

echo ""
echo "=== Rust Version ==="
time ./scripts-refactored/target/release/tasks format packages
```

Expected results:
- **Cold start**: 5-8x faster
- **Warm start**: 3-5x faster
- **Parallel operations**: 2-3x faster (due to true async)

### Metrics to Track

1. **Startup time**: Time from invocation to first action
2. **Total execution time**: Full command duration
3. **Memory usage**: Peak memory consumption
4. **Binary size**: Compiled artifact size

## Troubleshooting

### Common Issues

**Issue: Binary not found**
```bash
# Solution: Build the project first
cd scripts-refactored && cargo build --release
```

**Issue: Permission denied**
```bash
# Solution: Make wrapper scripts executable
chmod +x scripts-refactored/tasks.sh
```

**Issue: Prettier config not found**
```bash
# Solution: Ensure you're running from repository root
cd /path/to/arolariu.ro
./scripts-refactored/target/release/tasks format packages
```

**Issue: Node.js version mismatch in setup**
```bash
# This is expected in CI - setup command detects environment
# Manual installation may be required
```

### Debug Mode

For detailed output, check the command implementation or add verbose flags:

```bash
# Generate with verbose output
./scripts-refactored/target/release/tasks generate --env --verbose
```

## Maintenance

### Updating Dependencies

```bash
cd scripts-refactored
cargo update
cargo build --release
```

### Adding New Commands

1. Create new module in `src/commands/`
2. Implement the command logic
3. Add to `mod.rs` exports
4. Add variant to main.rs `Commands` enum
5. Update documentation

Example structure:
```rust
// src/commands/new_command.rs
pub async fn run() -> Result<()> {
    // Implementation
    Ok(())
}
```

### Code Quality

Run Rust code quality tools:

```bash
cd scripts-refactored

# Format Rust code
cargo fmt

# Lint with Clippy
cargo clippy -- -D warnings

# Run tests
cargo test
```

## Rollback Plan

If issues arise, rollback is simple:

1. **Immediate**: Use TypeScript scripts directly
   ```bash
   node scripts/format.ts all
   ```

2. **npm scripts**: Revert package.json changes
   ```bash
   git checkout main -- package.json
   ```

3. **Remove Rust binary**: Optional, can keep for future use
   ```bash
   rm -rf scripts-refactored/target
   ```

## Success Criteria

Before full adoption, validate:

- ✅ All commands work identically to TypeScript versions
- ✅ Performance improvements measured and documented
- ✅ No regressions in CI/CD pipelines
- ✅ Team members can build and use the binary
- ✅ Error handling is clear and helpful
- ✅ Documentation is complete and accurate

## Future Enhancements

Potential improvements after MVP:

1. **Pure Rust implementations**: Eliminate Node.js delegation
2. **Incremental processing**: Only process changed files
3. **Watch mode**: Continuous format/lint on file changes
4. **Caching layer**: Cache validation results
5. **Parallel test execution**: Run E2E tests in parallel
6. **Cross-compilation**: Pre-built binaries for multiple platforms

## Support

For questions or issues:

1. Check the README: `scripts-refactored/README.md`
2. Review command help: `tasks <command> --help`
3. Examine TypeScript originals: `scripts/*.ts`
4. Open GitHub issue with details

## Conclusion

The Rust-based task runner provides significant performance improvements while maintaining full compatibility with existing workflows. Start with Option 1 (side-by-side) for risk-free evaluation, then gradually migrate based on your team's confidence and measured results.
