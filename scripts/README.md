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
console and process-stream writes used by every migrated script. It is the only exemption:
[`output-policy.test.ts`](./common/output-policy.test.ts)'s AST guard and the root ESLint configuration's `toolingOutputConfig.ignores`
list only ever contain this sink, never a script entry point.

Every production script under root `scripts/**` — including [`setup.ts`](./setup.ts), [`doctor.ts`](./doctor.ts), and
[`status.ts`](./status.ts) — routes its presentation and semantic output through `MonorepositoryConsoleLogger`. There are no remaining
transitional setup/doctor/status exceptions.

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

The full root-tooling suite in [Targeted validation](#targeted-validation) below enumerates these setup and shared-dependency test files
too; it exercises every setup, container-runtime, and worker test file under `scripts/`. Doctor, its reporter and specialist modules, and
`status.ts` have their own focused command in [Doctor test commands](#doctor-test-commands).

## Doctor diagnostics (`npm run doctor`)

`npm run doctor` is [`doctor.ts`](./doctor.ts)'s CLI entrypoint (`--verbose`/`-v`, `--ci`, `--score`, `--json`, `--quick`, `--help`/`-h`).
It resolves the same canonical repository paths and manifest-derived requirements setup uses, then runs every bounded-context module
independently and concurrently, flattening their results back into a fixed rendering order. Doctor is strictly read-only: it never
installs, writes, restores, generates, starts/stops a service, builds, type-checks, or tests.

### Module map

| Module | Owns |
|--------|------|
| [`doctor.ts`](./doctor.ts) | CLI parsing, help, module orchestration/ordering, and the exit-code rollup |
| [`doctor.types.ts`](./doctor.types.ts) | Shared `DiagnosticResult`/`DoctorContext`/`DoctorOptions` contracts, the exact-allowlisted read-only command policy, and diagnostic-result helpers |
| [`doctor.reporter.ts`](./doctor.reporter.ts) | Stable per-check score weights, schema-v1 validation (`createDoctorReport`/`parseDoctorReport`), and human/JSON rendering |
| [`doctor.workspace.ts`](./doctor.workspace.ts) | Repository root, git, Node/npm runtime, dependency trees, Nx graph, config files, generated artifacts, host capacity, npm audit/outdated |
| [`doctor.dotnet.ts`](./doctor.dotnet.ts) | .NET SDK/host/workloads, NuGet state, solution, local tools, HTTPS certificate trust, AppHost user secrets, NuGet feed reachability |
| [`doctor.react.ts`](./doctor.react.ts) | Website packages, workspace link, environment, i18n, taxonomy/licenses, Playwright, framework config |
| [`doctor.svelte.ts`](./doctor.svelte.ts) | CV and status SvelteKit packages, Node engine, scripts, generated `.svelte-kit` state, adapter |
| [`doctor.python.ts`](./doctor.python.ts) | `exp` runtime, virtual environment, pip, requirements, dependency conflicts, PyPI reachability |
| [`doctor.infrastructure.ts`](./doctor.infrastructure.ts) | Container engine selection, CLI/backend/Compose/socket checks, ports, certificates, manifests, known containers |

Modules are invoked independently and concurrently, but `doctor.ts` always flattens their results back into the module-map order above
regardless of which module settles first. An unhandled module exception never produces a passing or skipped result — it becomes exactly
one failed `<module>.module-error` row so the report degrades to one row instead of losing the whole run.

### Stable result contract

Every check is one `DiagnosticResult`: a stable `id` (module-prefixed, e.g. `workspace.git`), its owning `module`, `name`, `status`
(`pass`/`warn`/`fail`/`skipped`), `summary`, `evidence`, `durationMs`, `fixes`, and exactly one diagnosis form for a `warn`/`fail` row —
either `rootCause` or ranked `potentialCauses` (`high`/`medium`/`low`), never both. [`doctor.reporter.ts`](./doctor.reporter.ts) rejects an
unknown or duplicate `id`, a `warn`/`fail` row missing evidence/fixes/diagnosis, and an ANSI-bearing or empty report string. The completed
`DoctorReportV1` (`schemaVersion: 1`, `score`, `grade`, `summary`, `checks`, `timestamp`) is scored with a stable per-`id` weight: a pass
earns full weight, a warn half, a fail none, and a `skipped` check contributes to neither the earned total nor the denominator.

### Read-only command policy

Every diagnostic command runs through `defaultDiagnosticRunner` (built by [`doctor.types.ts`](./doctor.types.ts)'s
`createReadOnlyDiagnosticRunner`), which rejects any command that is not an exact match against `isReadOnlyDiagnosticCommand`'s allowlist,
rejects caller-supplied stdin, forces captured output, and applies `DIAGNOSTIC_DEFAULT_TIMEOUT_MS` when no explicit timeout is given.
Modules never import [`common/process.ts`](./common/process.ts) directly — [`doctor.readonly.test.ts`](./doctor.readonly.test.ts)'s
source-level AST guard forbids a mutating filesystem import or an unresolved/forbidden command specification anywhere in `doctor.*.ts`.

### JSON consumers

`--json` emits exactly one ANSI-free schema-v1 document. [`status.ts`](./status.ts) is the reference consumer: it invokes doctor as
`--quick --json` and always parses the full `stdout` through `parseDoctorReport`, which recomputes and validates `summary`, `score`, and
`grade` from `checks` rather than trusting the reported numbers. A doctor exit code of `1` (failed checks) does not indicate a malformed
report; only an empty/non-JSON/wrong-schema/internally-inconsistent document makes status's `health` section `null`. Any other JSON
consumer should follow the same parse-then-validate pattern instead of scraping human-readable output.

### Doctor test commands

Focused validation for doctor, its reporter, every specialist module, and `status.ts`:

```powershell
npx vitest run --coverage.enabled=false scripts\common\logger.test.ts scripts\common\process.test.ts scripts\common\output-policy.test.ts scripts\doctor.test.ts scripts\doctor.reporter.test.ts scripts\doctor.readonly.test.ts scripts\doctor.workspace.test.ts scripts\doctor.dotnet.test.ts scripts\doctor.react.test.ts scripts\doctor.svelte.test.ts scripts\doctor.python.test.ts scripts\doctor.infrastructure.test.ts scripts\status.test.ts scripts\setup.test.ts
npx eslint scripts\doctor.ts scripts\doctor.types.ts scripts\doctor.reporter.ts scripts\doctor.workspace.ts scripts\doctor.dotnet.ts scripts\doctor.react.ts scripts\doctor.svelte.ts scripts\doctor.python.ts scripts\doctor.infrastructure.ts scripts\status.ts
git --no-pager diff --check
```

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
