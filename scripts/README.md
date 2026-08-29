# Root Tooling Scripts

The root [`package.json`](../package.json) owns the supported npm commands that invoke this directory. Root scripts coordinate repository
tooling; shared presentation and process behavior belongs in [`common`](./common), container runtime behavior belongs in
[`container-runtime`](./container-runtime), and worker entry points belong in [`workers`](./workers).

## Output boundary

Production scripts route script-authored output through [`MonorepositoryConsoleLogger`](./common/logger.ts). Create a logger with a context
that identifies the operation, and use `child()` when a nested operation needs a more specific context.

- `debug` emits optional diagnostics.
- `info` reports normal lifecycle state.
- `warn` reports a recoverable or intentionally deferred condition.
- `error` reports failure detail before the error propagates.
- `success` reports successful completion.

Use presentation methods for human-oriented formatting rather than lifecycle meaning: `line()` for complete rows or blank lines, `write()`
for partial raw chunks, `section()`, `banner()`, and `table()` for structured display, and `progress()` for TTY-aware progress.

In JSON mode, semantic and human-presentation methods are suppressed. `json()` emits the single machine-readable document for the
invocation.

## Commands and sensitive values

Use the argument-array interfaces in the shared [`command runner`](./common/process.ts). Keep executable arguments separate from the command
name, select `capture`, `tee`, or `inherit` explicitly when needed, and render command diagnostics with
`logger.command(formatCommand(command))`. Standard input is not part of the formatted command.

Register runtime secrets with `logger.redact()` before any output that could contain them. Logger children share the same redaction
registry. Do not place secret values in command echoes or other manually formatted diagnostics.

## Output-policy exemptions

The permanent production exemption is the logger sink implementation in [`common/logger.ts`](./common/logger.ts), which owns the direct
console and process-stream writes used by every migrated script.

[`setup.ts`](./setup.ts), [`doctor.ts`](./doctor.ts), and [`status.ts`](./status.ts) are the three temporary production exceptions while
their dedicated migrations are completed. Both [`output-policy.test.ts`](./common/output-policy.test.ts) and the root ESLint configuration
exclude the permanent logger sink and these temporary entry points.

## Targeted validation

Run the policy test after changing script output:

```powershell
npx vitest run --coverage.enabled=false scripts\common\output-policy.test.ts
```

Run the complete root-tooling suite by enumerating the container-runtime and worker tests on Windows so every intended file is passed
explicitly:

```powershell
$containerRuntimeTests = Get-ChildItem scripts\container-runtime\*.test.ts |
  Sort-Object FullName |
  ForEach-Object FullName
$workerTests = Get-ChildItem scripts\workers\*.test.ts |
  Sort-Object FullName |
  ForEach-Object FullName

npx vitest run --coverage.enabled=false `
  scripts\common\logger.test.ts `
  scripts\common\process.test.ts `
  scripts\common\process.controlled.test.ts `
  scripts\common\index.test.ts `
  scripts\common\output-policy.test.ts `
  @containerRuntimeTests `
  @workerTests `
  scripts\generate.artifacts.test.ts `
  scripts\update-exchange-rates.test.ts `
  scripts\docs-assemble.test.ts `
  scripts\docs-assemble.normalize.test.ts
npx eslint scripts
git --no-pager diff --check
```
