# Root Tooling Scripts

The root [`package.json`](../package.json) owns the supported npm commands that invoke this directory. Root scripts coordinate repository
tooling; the declarative command runtime, capability kernel, and process runner belong in [`common`](./common), container runtime behavior
belongs in [`container-runtime`](./container-runtime), and worker entry points belong in [`workers`](./workers).

[RFC 0002](../docs/rfc/0002-lean-monorepo-tooling-architecture.md) is the accepted architecture record for everything below.

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

## Command runtime

Every root script except the format/lint pair is one declarative command object built on
[`common/commander.ts`](./common/commander.ts) and one injected capability kernel from
[`common/runtime.ts`](./common/runtime.ts).

### Command definition anatomy

A command is a `CommandDefinition<TInput, TOutput>` handed to `MonorepoCommand`. Each member owns exactly one concern:

| Member | Owns |
|--------|------|
| `metadata` | `name`, `description`, optional `usage`, `examples`, and extra exact-match `slashAliases` (`/h` and `/help` are always present) |
| `configure(program)` | Declares Commander arguments and options on a fresh parser |
| `decode(program)` | Converts parsed Commander state into one typed input; throws `CommandInputError` for semantically invalid input |
| `presentation(input)` | Selects `"human"`, `"json"`, or `"silent"`; defaults to `"human"` |
| `execute(context, input)` | Runs business orchestration against `context.runtime` capabilities only |
| `completion(output, context)` | Maps completed business output to `{exitCode, human?, json?}` |

```typescript
export function createGenerateGraphqlCommand(
  runtimeFactory?: CommandRuntimeFactory,
): MonorepoCommand<GenerateLeafInput, GenerateLeafResult> {
  return new MonorepoCommand<GenerateLeafInput, GenerateLeafResult>(
    {
      metadata: {
        name: "generate:gql",
        description: "Generates GraphQL type artifacts (placeholder implementation).",
        examples: ["npm run generate:gql", "npm run generate:gql -- --verbose"],
        slashAliases: {"/v": "--verbose", "/verbose": "--verbose"},
      },
      configure: (program) => {
        program.option("-v, --verbose", "Enable verbose logging.");
      },
      decode: (program) => ({verbose: program.opts<{verbose?: boolean}>().verbose === true}),
      execute: generateGraphql,
      completion: (result) => ({exitCode: 0, human: (logger) => logger.success(result.summary)}),
    },
    runtimeFactory,
  );
}
```

Business code never constructs a parser, never reads `process.argv`, and never writes `process.exitCode`. `getInvocationArgv(program)`
is the only way a definition can read its own pre-normalization argv tokens.

### Production singletons and typed factory seams

Each command module exports a `create<Name>Command(...)` factory and one production singleton built from it:

```typescript
export const doctorCommand: MonorepoCommand<DoctorInput, DoctorReport> = createDoctorCommand();
```

The factory is the deterministic test seam. It accepts either a `CommandRuntimeFactory` directly or a small `dependencies` object
carrying one, so a test replaces the whole capability kernel instead of mocking repository modules:

```typescript
const command = createStatusCommand({runtimeFactory: createTestRuntimeFactory({runner, files}), doctor: fakeDoctor});
```

[`common/runtime.testing.ts`](./common/runtime.testing.ts) owns those typed fakes — a scripted process runner, in-memory logger sink,
fixture filesystem, deterministic clock, and stub inspection session. It is test infrastructure and is excluded from coverage.

### `run()`, `invoke()`, and `runIfMain()`

| Entry | Argv | Signals | Exit code | Default presentation |
|-------|------|---------|-----------|-----------------------|
| `run(argv?)` | Parses argv (defaults to the process host's frozen argv) | Owns SIGINT/SIGTERM in its root scope | Returned, never assigned | From `presentation(input)` |
| `invoke(input, options?)` | None — typed input only | Never registers an OS signal handler | Returned, never assigned | `"silent"` |
| `runIfMain(moduleUrl)` | Delegates to `run()` | Same as `run()` | Assigns the returned code through the process host | From `presentation(input)` |

`runIfMain()` is the only place a command may reach the process exit code, and it does nothing unless `moduleUrl` is the module the
process was started with. No script implements direct-entry detection itself, and no script calls `process.exit()`.

`invoke()` is how commands compose. `status.ts` runs doctor as a typed child (`doctorCommand.invoke({quick: true, verbose: false},
{parent: context, presentation: "silent"})`) rather than spawning a sibling process or parsing JSON.

### Invocation outcomes

`run()` and `invoke()` never throw across the command boundary; they return a discriminated `CommandExecution<TOutput>`:

| `status` | `exitCode` | Meaning |
|----------|-----------|---------|
| `completed` | `0` or `1` | Business execution finished and produced typed `value` |
| `failed` | `1` or `2` | `usage` (`2`), or `operational`/`cleanup`/`internal` (`1`) |
| `cancelled` | `130` or `143` | SIGINT / SIGTERM or a linked caller abort |
| `help` | `0` | Commander displayed help or version text; no business work ran |

A **completed exit `1` is not an error**. It is the normal way a command reports a negative business result while still returning typed
output: doctor completes with `exitCode: 1` and a full `DoctorReport` when a check fails, and the caller may still read
`execution.value`. Reserve `failed` for conditions that produced no usable output.

`CommandFailure` carries a `kind`, a redacted `message`, bounded `evidence` lines, and the original `cause`. Cleanup evidence is appended
to the failure that caused it rather than replacing it.

### Runner outcomes and `expectSuccess()`

`context.runtime.runner` is a `ProcessRunner` from [`common/runner.ts`](./common/runner.ts). `run()` resolves a discriminated
`ProcessOutcome` — switch on `kind` instead of re-deriving success from an exit code:

```typescript
const outcome = await runner.run({command: "git", args: ["status", "--porcelain"]}, {output: "capture"});
switch (outcome.kind) {
  case "succeeded":  return outcome.stdout;          // exitCode is narrowed to 0
  case "exited":     return degrade(outcome.exitCode);
  case "timed-out":
  case "signalled":
  case "cancelled":
  case "spawn-failed": throw new Error(processFailureEvidence(outcome, logger));
}
```

`expectSuccess()` is the required-success policy: it returns a `SucceededProcessOutcome` or throws a `RunnerError` whose message,
retained `request`, and retained `outcome` are all redacted through the supplied logger and bounded to 2,000 characters.
`runner.scope(defaults)` returns a new runner with reusable defaults and never mutates its parent. Keep the executable and its arguments
separate; `formatProcessRequest()` renders diagnostics and never includes stdin or environment values.

### Capability profiles and child scope ownership

`context.runtime` is the only source of effects. It carries `logger`, `prompts`, `runner`, `http`, `files`, `clock`, `tasks`,
`inspection`, `environment`, `signal`, and `cleanup`. [`common/runtime.node.ts`](./common/runtime.node.ts) is the single production
adapter that implements them; it is the only production module allowed to import `node:fs`, `node:os`, or `node:timers`, to call bare
`fetch`/`setInterval`, to read `process.env`/`process.cwd()`, to register SIGINT/SIGTERM, or to assign `process.exitCode`.

Narrow a capability before handing it to a consumer that must not widen it: `asReadOnlyFileSystem()` and `asGetOnlyHttpClient()` produce
the read-only profiles doctor modules receive, and `inspection/probes.ts` produces the opaque, allowlisted probe runner.

A **root scope** snapshots the environment once, owns its logger and prompts, and (only under `run()`/`runIfMain()`) owns process signals.
A **child scope** created by `invoke({parent})` reuses the parent's immutable environment, prompts, and inspection registry, and receives
its own forked logger, invocation runner, cancellation controller, and cleanup registry. Cancellation always flows parent to child and
never child to parent.

### JSON, human, and silent output

Presentation is decided from typed input before any capability exists, and rendering is deferred to `completion()`:

- **human** — `completion.human(logger)` runs; semantic and presentation methods are live.
- **json** — `completion.json` is serialized exactly once through `logger.json()`. A JSON-mode command that omits `json` is an internal
  failure rather than a silently empty document. A fatal error writes exactly one plain redacted line to standard error so no partial
  success document is emitted.
- **silent** — nothing is rendered, including failure diagnostics. This is the default for composed `invoke()` calls, whose caller owns
  presentation.

### Cancellation and cleanup

`runtime.signal` is the single cancellation source: SIGINT maps to `CommandCancellation(…, 130)`, SIGTERM to `143`, and a linked caller
signal propagates the same way. Long-running work passes `runtime.signal` into the runner, the HTTP client, and `clock.delay()` instead
of polling.

`runtime.cleanup` is a LIFO registry. Register a compensating action as soon as the resource exists:

```typescript
context.runtime.cleanup.register("temporary compose file", () => files.remove(composeFile));
```

The lifecycle drains the registry **before** rendering the completion, so a cleanup failure can still change the outcome. Every cleanup
entry runs even when an earlier one throws; each failure becomes bounded evidence on the reported failure.

### Sensitive values

Register runtime secrets with `logger.redact()` before any output that could contain them. Logger children and forks share one redaction
registry, and `RunnerError` redacts its retained request and outcome through the same registry. Do not place secret values in manually
formatted diagnostics.

### Format, lint, and the worker-shell exception

[`format.ts`](./format.ts), [`lint.ts`](./lint.ts), [`workers/format.worker.ts`](./workers/format.worker.ts),
[`workers/lint.worker.ts`](./workers/lint.worker.ts), [`types/format.ts`](./types/format.ts), and [`types/lint.ts`](./types/lint.ts) are
the six approved exclusions of RFC 0002 section 3.2. They stay on Piscina and are not command objects. They still use the shared logger
(with the Node logger runtime host, so their TTY, `NO_COLOR`, and progress behavior is unchanged) and the shared presentation helpers in
[`common/index.ts`](./common/index.ts), which take an explicit `Date` rather than reading the clock themselves.

[`workers/shell.ts`](./workers/shell.ts) is deliberately **not** excluded. It runs inside those Piscina workers, so it has no command
scope; it takes `nodeProcessRunner` — the generic process runner — directly, while keeping its legacy `{code, output}` worker-facing API
so format/lint behavior is unchanged.

## Output-policy exemptions

The logger sink implementation in [`common/logger.ts`](./common/logger.ts) is the sole owner of semantic and non-interactive presentation
output. The interactive terminal-protocol adapter in [`common/prompts.ts`](./common/prompts.ts) is a separate narrow exemption because
readline, visible input echo, cursor state, validation feedback, and non-echoing secret entry must share one writable terminal stream.
That adapter may emit only prompt labels, questions, choices, validation feedback, and terminal-control newlines; lifecycle diagnostics and
submitted secret values remain forbidden there.

[`output-policy.test.ts`](./common/output-policy.test.ts)'s AST guards enforce both boundaries, including property, direct-function, and
destructured aliases. [`runtime-boundary.test.ts`](./common/runtime-boundary.test.ts) enforces the wider runtime boundary — Execa and
child-process imports, ambient filesystem/HTTP/timer/environment/OS-state access, direct process exit, manual direct-entry detection,
explicit concurrency, doctor capability width, and the exact six format/lint exclusions. The root ESLint configuration provides immediate
feedback for direct output syntax. Direct console/process-stream output stays confined to the logger sink, while injected
`output.write(...)` prompt presentation stays confined to the prompt adapter. Neither exemption includes a script entry point.

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
npx vitest run --config scripts\vitest.config.ts --coverage.enabled=false scripts\common\repository-paths.test.ts scripts\common\requirements.test.ts scripts\common\tooling-config.test.ts scripts\common\prompts.test.ts scripts\setup.test.ts scripts\setup.workspace.test.ts scripts\setup.dotnet.test.ts scripts\setup.react.test.ts scripts\setup.svelte.test.ts scripts\setup.python.test.ts scripts\setup.infrastructure.test.ts scripts\generate.env.test.ts scripts\container-runtime\selection.test.ts scripts\common\output-policy.test.ts
npx eslint scripts\setup.ts scripts\setup.types.ts scripts\setup.*.ts scripts\common\repository-paths.ts scripts\common\requirements.ts scripts\common\tooling-config.ts scripts\common\prompts.ts scripts\generate.env.ts scripts\container-runtime
git --no-pager diff --check
```

The full root-tooling suite in [Targeted validation](#targeted-validation) below includes these setup and shared-dependency test files
too; it exercises every common, setup, doctor, inspection, container-runtime, and worker test file under `scripts/`. Doctor, its reporter
and specialist modules, and `status.ts` also have a narrower focused command in [Doctor test commands](#doctor-test-commands).

## Doctor diagnostics (`npm run doctor`)

`npm run doctor` is [`doctor.ts`](./doctor.ts)'s command entrypoint (`--verbose`/`-v`, `--quick`, `--help`/`-h`, plus the `/v`, `/q`,
`/h`, `/help`, and `/?` aliases). It resolves canonical repository paths and manifest-derived requirements through injected runtime
capabilities, obtains one shared repository inspection session, then runs every bounded-context module concurrently through the runtime
task scheduler, flattening their results back into a fixed rendering order. Every specialist module receives only read-only capabilities
(read-only filesystem, `GET`-only bounded network probe, clock, immutable environment, shared inspection session, and opaque probes).
Doctor is strictly read-only at the repository
and local-tooling boundary: it never mutates repository files, `.nx`, or `.arolariu`, and never installs/upgrades, restores, generates,
starts/stops a service, builds, type-checks, or tests. Approved metadata/status probes may update external package-manager caches or
container-engine client/cache state outside that boundary.

### Module map

| Module | Owns |
|--------|------|
| [`doctor.ts`](./doctor.ts) | Command definition (parsing, help, presentation), module orchestration/ordering, and the exit-code rollup |
| [`doctor.types.ts`](./doctor.types.ts) | Shared `DiagnosticResult`/`DoctorContext`/`DoctorInput` contracts and diagnostic-result helpers |
| [`doctor.reporter.ts`](./doctor.reporter.ts) | Stable per-check score weights, schema-v1 validation (`createDoctorReport`), and human rendering |
| [`doctor.workspace.ts`](./doctor.workspace.ts) | Repository root, git, Node/npm runtime, dependency trees, Nx workspace graph (read from repository metadata, see below), config files, generated artifacts, host capacity, npm audit/outdated |
| [`doctor.dotnet.ts`](./doctor.dotnet.ts) | .NET SDK/host/workloads, NuGet state, solution, local tools, HTTPS certificate trust, AppHost configuration and required local parameters, NuGet feed reachability |
| [`doctor.react.ts`](./doctor.react.ts) | Website packages, workspace link, environment, i18n, taxonomy/licenses, Playwright, framework config |
| [`doctor.svelte.ts`](./doctor.svelte.ts) | CV and status SvelteKit packages, Node engine, scripts, generated `.svelte-kit` state, adapter |
| [`doctor.python.ts`](./doctor.python.ts) | `exp` runtime, virtual environment, pip, requirements, dependency conflicts, PyPI reachability |
| [`doctor.infrastructure.ts`](./doctor.infrastructure.ts) | Container engine selection, CLI/backend/Compose/socket checks, ports, certificates, manifests, known containers |

Modules are invoked independently and concurrently, but `doctor.ts` always flattens their results back into the module-map order above
regardless of which module settles first. A module that reads more than one inspection fact declares those facts (`DiagnosticModule.facts`)
so `doctor.ts` starts them together through the runtime task scheduler before the first module runs; the module then awaits each memoized
outcome sequentially without ever owning a concurrency primitive of its own. An unhandled module exception never produces a passing or
skipped result — it becomes exactly one failed `<module>.module-error` row so the report degrades to one row instead of losing the whole
run.

### Stable result contract

Every check is one `DiagnosticResult`: a stable `id` (module-prefixed, e.g. `workspace.git`), its owning `module`, `name`, `status`
(`pass`/`warn`/`fail`/`skipped`), `summary`, `evidence`, `durationMs`, `fixes`, and exactly one diagnosis form for a `warn`/`fail` row —
either `rootCause` or ranked `potentialCauses` (`high`/`medium`/`low`), never both. [`doctor.reporter.ts`](./doctor.reporter.ts) rejects an
unknown or duplicate `id`, a `warn`/`fail` row missing evidence/fixes/diagnosis, and an ANSI-bearing or empty report string. The completed
`DoctorReportV1` (`schemaVersion: 1`, `score`, `grade`, `summary`, `checks`, `timestamp`) is scored with a stable per-`id` weight: a pass
earns full weight, a warn half, a fail none, and a `skipped` check contributes to neither the earned total nor the denominator.

### Read-only command policy

Every diagnostic command runs through the shared inspection probe runner backed by the allowlisted read-only command set in
[`inspection/probes.ts`](./inspection/probes.ts). Specialist modules never take a `ProcessRunner`, the Node runtime adapter, the Execa
adapter, or the mutable `FileSystem` capability: `DoctorContext` carries only a read-only filesystem, a `GET`-only bounded HTTP probe,
the clock, the immutable environment snapshot, the shared inspection session, and the opaque probe runner.
[`runtime-boundary.test.ts`](./common/runtime-boundary.test.ts)'s source-level AST guard rejects mutation-capable or unrestricted
filesystem imports, child-process imports, widened runtime imports, and direct adapter imports across the Doctor production surface.
[`doctor.readonly.test.ts`](./doctor.readonly.test.ts) independently snapshots `.nx` and `.arolariu` sentinel files to prove real quick
and full-profile Doctor runs do not mutate them.

No Nx child command is dispatched by doctor or status, and none is allowlisted. Nx always opens (and rewrites) its native workspace
database when it constructs a project graph. `workspace.nx-projects`, `workspace.nx-graph`, and status's `nxEdges` are instead derived
from the shared inspection session's workspace facts, which use an isolated Nx Devkit worker process
([`inspection/workspace.ts`](./inspection/workspace.ts)) that redirects Nx state to a disposable temporary directory.

### Status integration

[`status.ts`](./status.ts) composes doctor as a typed child command (`doctorCommand.invoke(…, {parent: context, presentation: "silent"})`)
rather than a subprocess, and the child reuses status's own inspection session. Health is the one status section that is **not**
degradation-tolerant: both doctor completion exit codes (`0` and `1`) are ordinary health data, while a `failed`, `cancelled`, or `help`
child outcome is owned by status and becomes a status command failure or cancellation. No dashboard or JSON document is rendered in that
case, so status never reports a fabricated "unavailable" health section for a broken doctor. The five collector sections
(`workspaces`, `nxEdges`, `git`, `security`, `disk`) remain individually degradation-tolerant and may still be `null`.

### Doctor test commands

Focused validation for doctor, its reporter, every specialist module, and `status.ts`:

```powershell
npx vitest run --config scripts\vitest.config.ts --coverage.enabled=false scripts\common\logger.test.ts scripts\common\runner.test.ts scripts\common\output-policy.test.ts scripts\doctor.test.ts scripts\doctor.reporter.test.ts scripts\doctor.readonly.test.ts scripts\doctor.workspace.test.ts scripts\doctor.dotnet.test.ts scripts\doctor.react.test.ts scripts\doctor.svelte.test.ts scripts\doctor.python.test.ts scripts\doctor.infrastructure.test.ts scripts\doctor.diagnostics.test.ts scripts\status.test.ts scripts\setup.test.ts
npx eslint scripts\doctor.ts scripts\doctor.types.ts scripts\doctor.reporter.ts scripts\doctor.workspace.ts scripts\doctor.dotnet.ts scripts\doctor.react.ts scripts\doctor.svelte.ts scripts\doctor.python.ts scripts\doctor.infrastructure.ts scripts\status.ts scripts\common\taxonomy-artifacts.ts
git --no-pager diff --check
```

## Architecture analysis

The preparatory scripts-architecture cohort keeps one typed entrypoint inventory and three complementary checks:

```powershell
npm run analyze:scripts:unused
npm run typecheck:scripts
npm run analyze:scripts:loc
npm run analyze:scripts:architecture
```

- `analyze:scripts:unused` runs Knip against the scripts project and reports unused files, exports, types, and root dependencies not owned
  by a child workspace.
- `typecheck:scripts` checks production and non-test support with strict root compiler options. Its sole temporary production exclusion is
  `workers/lint.worker.ts`, which Cohort 7 removes.
- `analyze:scripts:loc` reports the fixed 73,377-line baseline, the temporary 75,500-line Cohort 0 ceiling, the final 55,032-line target,
  production/test-support totals, family totals, committed line churn, and detected rename/relocation evidence from baseline commit
  `11773ff3d`.
- `analyze:scripts:architecture` reports static runtime graph size and three-sample `--help` medians for every Commander entrypoint. Timing
  is informational; AST boundary tests enforce lazy-loading structure.

Architecture checks live under `scripts/testing/architecture/`; public CLI snapshots and behavior-evidence mappings live under
`scripts/testing/compatibility/`. Both are excluded from production runtime and coverage policies but remain included in the maintained-line
total.

## Targeted validation

Run the policy tests after changing script output or the runtime boundary:

```powershell
npx vitest run --config scripts\vitest.config.ts --coverage.enabled=false scripts\common\output-policy.test.ts scripts\common\runtime-boundary.test.ts
```

Run the complete root-tooling suite through the scripts-scoped Vitest configuration:

```powershell
npx vitest run --config scripts\vitest.config.ts --coverage.enabled=false
npx eslint scripts
git --no-pager diff --check
```
