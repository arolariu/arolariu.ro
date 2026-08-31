# Task 2 Report: Shared Commander CLI adapter

## Outcome

Implemented the reusable Commander adapter in `scripts/common/cli.ts` and the focused contract tests in `scripts/common/cli.test.ts`.

## Implementation details

- Added `ToolProgramOptions`, `normalizeSlashArguments`, `createToolProgram`, and `commanderExitCode`.
- Normalization rewrites only exact argv tokens that match the effective alias map.
- The default slash aliases are `/h -> --help` and `/help -> --help`.
- `createToolProgram` configures:
  - name
  - description
  - usage
  - `showHelpAfterError()`
  - `exitOverride()`
  - logger-backed `configureOutput()`
  - help examples via `addHelpText("after", ...)`
- `parse()` and `parseAsync()` on the returned program normalize slash arguments before Commander sees them.
- `commanderExitCode()` returns the exit code for `CommanderError` and `null` for anything else.

## Files changed

1. `scripts/common/cli.ts`
2. `scripts/common/cli.test.ts`

## TDD evidence

### RED

Command:

```powershell
npx vitest run --coverage.enabled=false scripts\common\cli.test.ts
```

Result:

```text
FAIL  scripts/common/cli.test.ts [ scripts/common/cli.test.ts ]
Error: Cannot find module './cli.ts' imported from C:/Users/aolariu/source/repos/arolariu/arolariu.ro/scripts/common/cli.test.ts
```

### GREEN

Command:

```powershell
npx vitest run --coverage.enabled=false scripts\common\cli.test.ts scripts\common\output-policy.test.ts
```

Result:

```text
✓ scripts/common/cli.test.ts (3 tests)
✓ scripts/common/output-policy.test.ts (7 tests)
```

## Command-level verification

- `npx vitest run --coverage.enabled=false scripts\common\cli.test.ts scripts\common\output-policy.test.ts` - passed.
- `npx eslint scripts\common\cli.ts scripts\common\cli.test.ts` - passed with a config warning that the test file was ignored.
- `npx eslint scripts\common\cli.ts` - passed cleanly.

## Self-review findings

- The change stayed within the two requested files.
- The adapter uses exact-token replacement only; it does not inspect prefixes, split tokens, or apply path heuristics.
- Help and error output is routed through the injected `MonorepositoryLogger`.
- The implementation is lint-clean and the focused tests pass.

## Concerns

- Commander no-arg parsing now normalizes `process.argv` through the adapter path, which preserves slash aliases but does not rely on Commander auto-detection for special node/electron argv forms. That is acceptable for the repository scripts, but it is worth keeping in mind if a future caller depends on Commander’s default no-arg detection behavior.

## Fix round 1

### Finding addressed

- `parseAsync` help routing in `scripts/common/cli.ts` was untested. The implementation already normalizes slash aliases for `parseAsync`, and the missing regression guard was the gap called out in review.

### Files changed

- `scripts/common/cli.test.ts`

### Covering test(s)

- Added an async help-routing regression test that exercises `createToolProgram(...).parseAsync(["node", "sample", "--help"])` and verifies the injected logger receives `Usage:`.

### Exact command(s)

```powershell
npx vitest run --coverage.enabled=false scripts\common\cli.test.ts
npx eslint scripts\common\cli.ts scripts\common\cli.test.ts
```

### Relevant output

- Vitest: `✓ scripts/common/cli.test.ts (4 tests)`
- ESLint: `scripts/common/cli.test.ts  0:0  warning  File ignored because no matching configuration was supplied`

### Self-review

- The fix is surgical and stays in the test file only; production code was left untouched because the new regression test passed against the current implementation.
- The new assertion mirrors the existing sync help-routing test and keeps exact-token slash alias behavior unchanged.
- The lint command completed successfully despite the expected ESLint ignore warning for the test file.
