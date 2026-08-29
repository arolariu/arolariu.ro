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

[`doctor.ts`](./doctor.ts) and [`status.ts`](./status.ts) are the two temporary production exceptions while their dedicated migrations are
completed. Both [`output-policy.test.ts`](./common/output-policy.test.ts) and the root ESLint configuration exclude the permanent logger
sink and these temporary entry points. [`setup.ts`](./setup.ts) completed its logger migration and is no longer an exception — it routes
every phase's presentation and semantic output through `MonorepositoryConsoleLogger`.

## Setup orchestrator (`npm run setup`)

`npm run setup` is [`setup.ts`](./setup.ts)'s CLI entrypoint (`--verbose`, `--dry-run`, `--yes`, `--engine rancher|podman`, `--help`). It
resolves canonical paths through [`common/repository-paths.ts`](./common/repository-paths.ts), loads manifest-derived runtime and package
requirements through [`common/requirements.ts`](./common/requirements.ts), and reads/writes the non-secret persisted selection at
`.arolariu/tooling.local.json` through [`common/tooling-config.ts`](./common/tooling-config.ts). Setup restores dependencies, prepares
toolchains, and generates checkout artifacts; it never builds, type-checks, tests, or starts/stops a service.

### Module map

| Module | Owns |
|--------|------|
| [`setup.ts`](./setup.ts) | CLI parsing, phase ordering, dependency gating, and the exit-code/readiness rollup |
| [`setup.types.ts`](./setup.types.ts) | Shared `SetupContext`, `SetupPhaseDefinition`, `SetupAction`, and status/scope contracts |
| [`setup.workspace.ts`](./setup.workspace.ts) | Prerequisite validation, root and `.github/scripts` npm restore, and generated taxonomy/GraphQL/i18n artifacts |
| [`setup.dotnet.ts`](./setup.dotnet.ts) | .NET SDK install, workload/solution/tool restore, AppHost user secrets, and the local HTTPS dev certificate |
| [`setup.react.ts`](./setup.react.ts) | Website package validation, additive website `.env` defaults, and Playwright Chromium |
| [`setup.svelte.ts`](./setup.svelte.ts) | CV and status SvelteKit generated `.svelte-kit` state |
| [`setup.python.ts`](./setup.python.ts) | Isolated `exp` Python virtual environment, pinned dependency install, and its requirements fingerprint |
| [`setup.infrastructure.ts`](./setup.infrastructure.ts) | Container engine selection/persistence/install, mkcert, selfhost certificates, required ports, and required runtime files |

### Phase dependency table

Phases run in this exact order; a required dependency that is not `succeeded`/`degraded` (or, during `--dry-run`, planned) skips its
dependent phase and names the blocking dependency.

| Phase id | Title | Required | Depends on |
|----------|-------|:--------:|------------|
| `workspace.prerequisites` | Validate workspace prerequisites | ✅ | — |
| `workspace.root-dependencies` | Restore root workspace dependencies | ✅ | `workspace.prerequisites` |
| `workspace.github-scripts-dependencies` | Restore GitHub scripts dependencies | ✅ | `workspace.prerequisites` |
| `workspace.generators` | Generate checkout artifacts | ✅ | `workspace.root-dependencies` |
| `dotnet` | .NET toolchain | ✅ | — |
| `react` | React workspace | ✅ | `workspace.root-dependencies`, `workspace.generators` |
| `svelte` | Svelte workspaces | ✅ | `workspace.root-dependencies` |
| `python` | Python toolchain | ✅ | — |
| `infrastructure` | Local infrastructure | ✅ | — |

### Mutation scopes and consent

Every mutation runs through the `SetupActionExecutor` created in [`setup.ts`](./setup.ts), which is the sole place that decides whether an
action is `executed`, `planned` (always the outcome under `--dry-run`), or `declined`.

| Scope | Consent behavior | Representative actions |
|-------|-------------------|-------------------------|
| `repository` | Never prompts (still only planned under `--dry-run`) | Root/`.github/scripts` `npm ci`, dependency fingerprint writes, checkout-artifact generation, additive website `.env` writes, Playwright Chromium install, Python venv creation/pip install/fingerprint write, SvelteKit generated-state preparation, container engine persistence to `.arolariu/tooling.local.json` |
| `user` | Never prompts (still only planned under `--dry-run`) | .NET local tool restore, AppHost local-development user-secret generation, HTTPS dev certificate creation, selfhost certificate generation |
| `system` | Requires an interactive confirm unless `--yes` | .NET SDK install, .NET workload restore, HTTPS certificate trust, Playwright system dependency install, container engine install, mkcert install/trust |

`--yes` approves only `system`-scoped actions; it never selects a container engine, invents prompted text, or supplies a secret. Under
`--dry-run`, no phase mutates the repository, the invoking user's profile, or the host — every action reports `planned` instead.

### Setup test commands

Focused validation for setup and its direct shared dependencies:

```powershell
npx vitest run --coverage.enabled=false scripts\common\repository-paths.test.ts scripts\common\requirements.test.ts scripts\common\tooling-config.test.ts scripts\common\prompts.test.ts scripts\setup.test.ts scripts\setup.workspace.test.ts scripts\setup.dotnet.test.ts scripts\setup.react.test.ts scripts\setup.svelte.test.ts scripts\setup.python.test.ts scripts\setup.infrastructure.test.ts scripts\generate.env.test.ts scripts\container-runtime\selection.test.ts scripts\common\output-policy.test.ts
npx eslint scripts\setup.ts scripts\setup.types.ts scripts\setup.*.ts scripts\common\repository-paths.ts scripts\common\requirements.ts scripts\common\tooling-config.ts scripts\common\prompts.ts scripts\generate.env.ts scripts\container-runtime
git --no-pager diff --check
```

The full root-tooling suite in [Targeted validation](#targeted-validation) below now enumerates these setup and shared-dependency test
files too, so it remains the single command that exercises every test file under `scripts/`.

## Targeted validation

Run the policy test after changing script output:

```powershell
npx vitest run --coverage.enabled=false scripts\common\output-policy.test.ts
```

Run the complete root-tooling suite by enumerating the setup, container-runtime, and worker tests on Windows so every intended file is
passed explicitly:

```powershell
$setupTests = Get-ChildItem scripts\setup*.test.ts |
  Sort-Object FullName |
  ForEach-Object FullName
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
  scripts\common\repository-paths.test.ts `
  scripts\common\requirements.test.ts `
  scripts\common\tooling-config.test.ts `
  scripts\common\prompts.test.ts `
  @setupTests `
  scripts\generate.env.test.ts `
  @containerRuntimeTests `
  @workerTests `
  scripts\generate.artifacts.test.ts `
  scripts\update-exchange-rates.test.ts `
  scripts\docs-assemble.test.ts `
  scripts\docs-assemble.normalize.test.ts
npx eslint scripts
git --no-pager diff --check
```
