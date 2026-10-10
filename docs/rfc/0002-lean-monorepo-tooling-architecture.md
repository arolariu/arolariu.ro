# RFC 0002: Lean Monorepo Tooling Architecture

- **Status**: Accepted
- **Date**: 2026-09-01
- **Revision**: 3 - Effect Command Platform
- **Revision Date**: 2026-10-05
- **Authors**: Alexandru-Razvan Olariu, GitHub Copilot
- **Related Components**: `scripts/`, `package.json`, `package-lock.json`, `.arolariu/tooling.local.json`
- **Supersedes**: RFC 0002 revision 2 (Declarative Monorepo Command Runtime), which superseded revision 1, dated 2026-08-31

---

## Abstract

This RFC defines the shared runtime for repository tooling under `scripts/`.
Every production script except the frozen format/lint Piscina closure is an
Effect v4 program reached through one root command line interface,
`scripts/cli.ts`, built with `effect/cli`. The program requires typed services
(environment, output, processes, files, HTTP, prompts, and repository
inspection) that one production layer and one in-memory test layer provide.

The design centralizes argument parsing, help, terminal presentation, process
execution, filesystem and HTTP access, environment and signal handling,
concurrency, delays, cleanup, failure rendering, and process exit behavior in
Effect and in the `scripts/platform/` services. Command modules retain only
repository business policy: setup phases, Doctor diagnoses, Status degradation,
generators, documentation assembly, E2E report handling, exchange-rate
transformation, and container lifecycle rules.

Revision 3 replaces the homegrown capability kernel, the declarative command
host, and the Commander parser of revision 2 with Effect. It preserves all
still-valid setup, Doctor, inspection, read-only, security, and cross-platform
contracts, and it records the decisions where revision 3 deliberately changes
behavior (sections 7, 12, and 19).

---

## 1. Context and Motivation

### 1.1 History

Revision 1 (2026-08-31) established Commander as the parser for most scripts,
Execa as the only child-process engine, a shared logger with chunk-safe
redaction, a shared prompt adapter, one inspection session reused by Setup,
Doctor, and Status, and AST architecture tests for output and process
boundaries.

Revision 2 (2026-09-01) centralized the full command lifecycle. Each script
became a declarative command object (`MonorepoCommand`) backed by one
Commander lifecycle, one invocation-scoped capability runtime (logger,
prompts, runner, HTTP, files, clock, task scheduler, inspection, environment,
abort signal, and cleanup registry), and a generic runner contract with an
Execa implementation. Revision 2 was fully implemented.

### 1.2 Why Revision 3

Revision 2 solved the lifecycle problem by writing and owning a small runtime
library: dependency injection, a task scheduler, a LIFO cleanup registry,
linked abort signals, filesystem and HTTP adapters, a redaction registry, a
prompt adapter, and a test runtime factory. That code was correct, but it was
repository-owned infrastructure that every command depended on and that had
to be maintained, documented, and tested alongside the business logic.

Effect provides each of those mechanics as a maintained library: services and
layers for dependency injection, fibers and interruption for cancellation,
scopes and finalizers for cleanup, `Effect.all`/`Effect.forEach` for
concurrency, typed failures in the effect signature, `FileSystem`,
`HttpClient`, `ChildProcessSpawner`, `Terminal`, `effect/cli` for parsing and
prompts, and a test clock. Revision 3 adopts it and deletes the homegrown
kernel.

### 1.3 Command Inventory

Every user-facing command is a subcommand of `scripts/cli.ts`:

| Family | Command path | Family module |
| --- | --- | --- |
| Setup | `setup` | `scripts/commands/setup/` |
| Health | `doctor`, `status` | `scripts/commands/doctor/`, `scripts/commands/status/` |
| Generation | `generate [env] [i18n] [gql] [artifacts]` | `scripts/commands/generate/` |
| Documentation | `docs assemble` | `scripts/commands/docs/` |
| Data maintenance | `rates update` | `scripts/commands/rates/` |
| Local development | `dev aspire`, `dev selfhost` | `scripts/commands/dev/`, `scripts/container-runtime/` |
| Containers | `containers build`, `containers run`, `containers compose` | `scripts/commands/containers/`, `scripts/container-runtime/` |
| Testing | `test e2e` | `scripts/commands/e2e/` |
| Quality | `format`, `lint` | `scripts/commands/quality/` (spawns the frozen closure, section 3.2) |

The service boundary also applies to supporting production modules under
`scripts/**`, including the inspection providers and the two inspection
worker entrypoints. The exclusions are defined in section 3.

### 1.4 Goals

1. Make each command declare only its flags, typed input, business program,
   and business completion policy.
2. Give the repository one command entrypoint and one exit-code mapping.
3. Replace the homegrown capability kernel with Effect services, layers,
   scopes, and fibers, and delete the replaced code.
4. Express every domain failure in the effect signature as a typed error.
5. Enforce read-only command profiles at compile time through service
   requirements.
6. Preserve repository-specific behavior, read-only, security, and
   cross-platform contracts, recording every intentional change.
7. Keep every invocation re-entrant and testable on an in-memory layer
   without mocking repository modules.
8. Enforce the architecture with focused TypeScript AST tests.
9. Keep every npm script name working as an alias of one command path.
10. Add no dependency beyond the two approved Effect packages.

### 1.5 Non-goals

This RFC does not:

- change the behavior of the frozen format/lint closure (section 3.2);
- unify the Effect `Process` service and the Piscina pools;
- redesign setup consent, Doctor scoring, Status schemas, generation
  algorithms, exchange-rate calculations, container plans, or Newman report
  sanitization;
- make every pure helper a service;
- impose a line-count quota;
- add a CI job for the scripts suite (section 19).

---

## 2. Decision

### 2.1 Chosen Architecture

```text
npm run <alias>  ->  node scripts/cli.ts <command path> [flags]
  |
  v
scripts/cli.ts
  +-- effect/cli root command "arolariu" (parsing, help, version, completions)
  +-- global settings --json and --verbose
  +-- termination-signal recorder (platform/signals.ts)
  +-- NodeRuntime.runMain over NodeBaseLayer
  +-- unreported-failure rendering and exitCodeFor (platform/exit.ts)
  |
  v
scripts/commands/<family>/cli.ts   (CliSubcommand)
  +-- flags and arguments -> typed input
  +-- withCommandOutput("<context>") -> commandLayer for this invocation
  +-- family program (Effect.fn / Effect.gen)
  +-- completion through Presenter; ReportedFailure for business-negative runs
  |
  v
scripts/platform/ services        (Context.Service, key "arolariu/scripts/<Name>")
  Environment, Sink, OutputSettings, Presenter, Process, Glob, ReadOnlyFiles,
  GetOnlyHttp, TemporaryDirectories, Prompts, Inspection
  + effect FileSystem, Path, HttpClient, ChildProcessSpawner, Terminal
  |
  v
@effect/platform-node adapters (NodeServices, NodeHttpClient, NodeRuntime)
```

The command program never touches Node directly. It requires services; the
production layer wires them to Node, and the test layer wires them to memory.

### 2.2 Responsibility Split

1. **CLI shell** (`scripts/cli.ts`, `scripts/commands/flags.ts`,
   `scripts/platform/exit.ts`, `scripts/platform/signals.ts`): parsing, help,
   global flags, per-invocation output services, signal recording, failure
   rendering, exit mapping.
2. **Platform services** (`scripts/platform/**`, `scripts/inspection/Inspection.ts`):
   environment, output, child processes, files, bounded HTTP reads, prompts,
   inspection sessions, worker entry, layers, and the test harness.
3. **Business policy** (`scripts/commands/**`, `scripts/container-runtime/**`,
   `scripts/inspection/**`, `scripts/common/{repository-paths,requirements,tooling-config,taxonomy-artifacts}.ts`):
   what a command validates, performs, renders, and returns, and whether a
   partial failure degrades, blocks, or aborts.

### 2.3 Decisions

| Topic | Decision |
| --- | --- |
| Motivation | Replace the homegrown capability kernel (DI, scheduler, cleanup, cancellation, FS/HTTP adapters) with a maintained library and delete our code. |
| Replaced | Capability kernel (`common/runtime.ts`, `common/runtime.testing.ts`), the command host (`common/commander.ts`), Commander, the prompt adapter (`common/prompts.ts`), and every use of `MonorepositoryConsoleLogger` and the Execa runner outside the frozen closure. |
| Kept | The Piscina format/lint closure and its private modules (section 3.2), including `execa`. Also kept: Nx Devkit, envinfo, systeminformation, `@azure/storage-blob`. |
| Topology | One root CLI `scripts/cli.ts` with subcommands; npm script names remain as thin aliases (section 4). |
| CLI compatibility | Free redesign; all callers were updated in the same change. Slash aliases are removed. |
| Dependencies | `effect@4.0.0` and `@effect/platform-node@4.0.0`, pinned exactly and kept in lockstep. `@effect/vitest` is **not** used: 4.0.0 requires `vitest >=5`, while the repository stays on vitest 4 for `@storybook/addon-vitest`. |
| Removed dependencies | `commander`. |
| Secrets | Typed `Redacted<string>` from the point they are read; no output masking (section 12.3, accepted risk). |

### 2.4 Kernel Mapping

| Revision 2 | Revision 3 replacement |
| --- | --- |
| `CommandRuntime` facade + `CommandRuntimeFactory` | Context services provided by `makeNodeLayer` / `makeTestLayer` (`platform/layers.ts`, `platform/testing.ts`) |
| `MonorepoCommand`, `run()`, `invoke()`, `runIfMain()` | `effect/cli` subcommands under `scripts/cli.ts`; composition through plain effects |
| `Clock` (`monotonicNow`, `isoTimestamp`, `delay`) | `Clock`, `DateTime`, `Effect.sleep` |
| `TaskScheduler` (`parallel`, `allSettled`, `sequential`, `mapBounded`) | `Effect.all` / `Effect.forEach` with `{concurrency}` and `{mode: "result"}` |
| `CleanupRegistry` (LIFO, failure collection) | Command `Scope`, `Effect.acquireRelease`, `Effect.addFinalizer`, `Effect.ensuring` |
| `AbortSignal`, `linkAbortSignals`, `CommandCancellation` | Fiber interruption |
| `FileSystem` / `NodeFileSystem` | `effect` `FileSystem` + the Node layer; `writeTextAtomic` and `readBytesBounded` in `platform/Files.ts` |
| `ReadOnlyFileSystem`, `asReadOnlyFileSystem` | `ReadOnlyFiles` service; read-only effects never require the mutating `FileSystem` |
| `HttpClient` / `NativeHttpClient`, `GetOnlyHttpClient` | `effect/http` `HttpClient` + `NodeHttpClient.layerUndici`; `GetOnlyHttp` for read-only profiles; bounded reads in `platform/Http.ts` |
| `RuntimeEnvironment` | `Environment` service |
| `MemoizedInspectionRuntime` | `Inspection` service with one session per `repositoryInspectionRequestKey` |
| `ProcessRunner` / Execa adapter | `Process` service over `ChildProcessSpawner` |
| `ProcessOutcome` switch, `expectSuccess()` | `Process.run` failing with a typed `ProcessError`; `Effect.catchTag` where a non-zero exit is data |
| `MonorepositoryLogger` | Effect `Logger` + `Presenter` service over one `Sink` |
| `MonorepositoryLogger.redact(value)` registry | `Redacted<string>` unwrapped with `Redacted.value` only at the point of use |
| `PromptProvider` | `Prompts` service backed by `effect/cli` `Prompt` |
| `createTestRuntimeFactory` | `makeTestLayer` + `effectTest` |

Pure helpers (path math, formatting, parsers, plan builders, sanitizers) stay
plain synchronous functions; they are not wrapped in services.

---

## 3. Scope and Exclusions

### 3.1 Included Production Code

The architecture applies to every production module under `scripts/**`
outside the frozen closure of section 3.2:

- `scripts/cli.ts` and every family under `scripts/commands/`;
- `scripts/platform/**`;
- `scripts/container-runtime/**` and `scripts/inspection/**`, including the
  `aggregate-worker.ts` and `workspace.worker.ts` child-process entrypoints;
- the shared repository helpers `common/repository-paths.ts`,
  `common/requirements.ts`, `common/tooling-config.ts`, and
  `common/taxonomy-artifacts.ts`.

### 3.2 Frozen Format and Lint Closure

`format.ts`, `lint.ts`, and their Piscina workers keep their pre-Effect
implementation, and their behavior does not change. `scripts/cli.ts` reaches
them only by spawning `node scripts/format.ts <target> [patterns...]` or
`node scripts/lint.ts <target> [patterns...]` with inherited output
(`commands/quality/cli.ts`); a non-zero exit becomes `ReportedFailure{exitCode: 1}`.

The closure is the transitive value-import closure of `format.ts`, `lint.ts`,
and every production module under `scripts/workers/`, computed by
`scripts/architecture.test.ts` and pinned to exactly these files:

- `eslint.config.ts` (loaded by `workers/lint.worker.ts` through a literal
  dynamic import);
- `scripts/common/index.ts`;
- `scripts/common/logger.ts`;
- `scripts/common/runner.execa.ts`;
- `scripts/common/runner.ts`;
- `scripts/common/runtime.node.ts`;
- `scripts/format.ts`;
- `scripts/lint.ts`;
- `scripts/workers/format.worker.ts`;
- `scripts/workers/lint.worker.ts`;
- `scripts/workers/shell.ts`.

The closure reaches these modules only through clause-level `import type`,
which Node type stripping erases, so they are pinned as type-only
dependencies rather than closure members:

- `scripts/platform/Environment.ts`;
- `scripts/types/format.ts`;
- `scripts/types/lint.ts`.

`common/{index,logger,runner,runner.execa,runtime.node}.ts` are private to the
closure: no other production module may load one at runtime. Two modules
outside the closure take only the structural `ProcessRequest` type from
`common/runner.ts` (`container-runtime/adapters.ts` and `inspection/probes.ts`);
the list is pinned. `common/runtime.node.ts` is reduced to the frozen adapter
the closure needs: `snapshotNodeEnvironment`, `createNodeProcessRunner`,
`nodeProcessRunner` (used by `workers/shell.ts`, which has no command scope),
and `nodeLoggerRuntimeHost` (real TTY, `NO_COLOR`, and progress for the
orchestrators' loggers). `runner.execa.ts` is the only production module that
imports `execa`.

Each closure module is exempt from exactly the ambient-access rules it
breaks, and an unused exemption fails the architecture suite (section 10).
Migrating the closure is future work (section 20).

### 3.3 Pure Platform Utilities

The service boundary covers stateful or effectful mechanics. Pure operations
such as `node:path` joins and resolution, URL construction, string decoding,
and data transformation may remain direct imports where they perform no I/O,
inspect no ambient process state, and write no output.

---

## 4. Command Line Interface

### 4.1 Topology

`scripts/cli.ts` is the single command entrypoint. It builds the `arolariu`
root command with `effect/cli`, owns all argv parsing, help, version, and
shell completions, and starts the program once with `NodeRuntime.runMain`:

```text
arolariu setup [--dry-run] [--yes] [--engine <rancher|podman>]
arolariu doctor [--quick]
arolariu status
arolariu generate [env] [i18n] [gql] [artifacts]
arolariu docs assemble
arolariu rates update [--year <y>] [--from <y>] [--to <y>]
arolariu dev aspire [--engine <rancher|podman>]
arolariu dev selfhost [start|stop|logs] [--engine <rancher|podman>]
arolariu containers build|run --target <frontend|backend|cv|exp> [--engine <rancher|podman>]
arolariu containers compose --file <path> [--engine <rancher|podman>] -- <compose arguments...>
arolariu test e2e <all|backend|frontend|cv>
arolariu format <all|packages|cv|website|api|status|exp> [patterns...]
arolariu lint <all|packages|cv|website|api|status|exp> [patterns...]
```

`generate` takes variadic task names instead of subcommands; with none it
warns that nothing is selected and exits `0`.

### 4.2 npm Aliases

Every npm script name is an alias of one command path, for example
`"doctor": "node scripts/cli.ts doctor"` and
`"rates:update": "node scripts/cli.ts rates update"`. Arguments pass through
npm after `--`: `npm run doctor -- --quick --json`. Slash aliases (`/h`, `/v`,
`/q`, `/?`, and the rest) and `normalizeSlashArguments` no longer exist.

### 4.3 Global Flags

| Flag | Meaning |
| --- | --- |
| `--json` | One JSON document on stdout per completed command run or usage failure, with the exceptions in section 7.6 |
| `--verbose` | Also emit debug diagnostics (the log level becomes at least `debug`); no short form, because `-v` is `--version` |
| `--log-level <level>` | `effect/cli` minimum log level of the `[arolariu::...]` log lines; default `info`, `none` hides warnings too |
| `--help`, `-h` | Print help for the selected command and exit `0` |
| `--version`, `-v` | Print the root `package.json` version |
| `--completions <bash\|zsh\|fish\|sh>` | Print a shell completion script; PowerShell is not supported |
| `--wizard` | `effect/cli` interactive command-line builder |

`--json` and `--verbose` are root settings (`commands/flags.ts`) accepted
before or after the subcommand. A command group run without a subcommand
(`arolariu`, `arolariu docs`, `arolariu dev`) prints its help and exits `0`.

### 4.4 Command Families

Each family lives in `scripts/commands/<family>/cli.ts` and exports
`make<Family>Command(...): CliSubcommand`, registered in the root command list
of `scripts/cli.ts`. `CliSubcommand` restricts a handler's requirements to the
base services and the two global settings, so a family that forgets to
provide a service fails to compile.

A handler decodes its flags into typed input and wraps its program in
`withCommandOutput("<context>")`, which reads `--json`, `--verbose`, and the
`Environment`, provides the per-invocation `commandLayer` (`OutputSettings`,
`Presenter`, `Process`, `Inspection`), and sets the `[arolariu::<context>]`
log context. A family provides any additional service it alone needs (for
example `dev selfhost` provides `LocalBlobStorageLive`, and `doctor` provides
its live `NetworkProbe`).

### 4.5 Authoring a Command

- Business functions are `Effect.fn("<family>.<name>")(function* (input) { ... })`
  programs whose requirement type names exactly the services they use.
- Domain failures are `Schema.TaggedError` classes in the family `errors.ts`,
  each carrying a human-readable `message`. Defects (`Effect.die`) are reserved
  for invariant violations.
- The handler renders the completion through `Presenter`. A business-negative
  completion (Doctor with a failing check, a stopped `generate`, `rates update`
  with failed years, a failed required setup phase) renders its full output
  first and then fails with `ReportedFailure{exitCode: 1, message}`.
- Semantically invalid input that the parser accepted fails through
  `reportUsageFailure(message)` (`platform/exit.ts`): one `⛔` line, or under
  `--json` the usage failure document of section 7.6, then
  `ReportedFailure{exitCode: 2}` (for example an invalid year range).
- No command reads `process.argv`, assigns `process.exitCode`, or calls
  `process.exit()`.

### 4.6 Composition

Commands compose plain effects, never sibling processes or JSON round trips.
Status runs `runDoctor({quick: true, verbose: false})` in the same concurrent
batch as its collectors; the image build and `dev selfhost start` run
`generateArtifacts` silently. Composed programs share the invocation's
`Inspection` service, so one inspection session serves both.

### 4.7 Direct Entrypoints

Only five production modules have an `import.meta.main` block:

- `scripts/cli.ts`, which may read only `process.argv` inside it;
- `scripts/format.ts` and `scripts/lint.ts` (the frozen closure);
- `scripts/inspection/aggregate-worker.ts` and
  `scripts/inspection/workspace.worker.ts`, whose block is exactly one
  `runWorker(...)` call.

`platform/worker.ts` `runWorker` decodes the worker argv, runs the worker
program with `NodeRuntime.runMain` over the JSON-mode Node layer, writes its
single JSON document through `Presenter.json`, and maps the exit through
`exitCodeFor` with its own signal recorder. A decode failure is a usage
failure (exit `2`) with nothing on stdout.

---

## 5. Platform Services and Layers

### 5.1 Services

Every repository service is a `Context.Service` keyed
`"arolariu/scripts/<ServiceName>"`.

| Module | Provides |
| --- | --- |
| `platform/Environment.ts` | `Environment`: immutable snapshot of variables, cwd, executable path, platform, architecture, stdin/stdout TTY flags, and CI |
| `platform/Output.ts` | `Sink` (the only writer of the process streams), `OutputSettings` (`human`/`json`/`silent`, verbose, color, context), the arolariu Effect logger, and `Presenter` (`success`, `fatal`, `line`, `write`, `section`, `banner`, `table`, `progress`, `json`) |
| `platform/Process.ts` | `Process.run` over `ChildProcessSpawner` (section 6) |
| `platform/windows.ts` | Windows `.cmd`/`.bat` shim resolution and argument escaping |
| `platform/Files.ts` | `Glob`, `ReadOnlyFiles`, `GetOnlyHttp`, `TemporaryDirectories` (a scope-owned directory outside the repository), `writeTextAtomic`, and `readBytesBounded` |
| `platform/Http.ts` | `readBoundedBytes` / `readBoundedText`: streamed response reads that fail with `ResponseTooLarge` beyond `MAX_RESPONSE_BYTES` (10 MiB) without buffering the rest |
| `platform/Prompts.ts` | `Prompts`: `confirm`, `select`, `text`, and `secret` (`Redacted<string>`) over `effect/cli` `Prompt`; without an interactive stdin, `confirm`/`select` return their default and every other prompt fails with `PromptUnavailable` |
| `inspection/Inspection.ts` | `Inspection`: one memoized repository inspection session per request key |
| `platform/worker.ts` | `runWorker` / `runWorkerProgram` for the inspection worker child processes |
| `platform/signals.ts` | `recordTerminationSignals`: remembers which of `SIGINT`/`SIGTERM` arrived and how many; `TerminationSignals` exposes them to `Process` |
| `platform/exit.ts` | `ReportedFailure`, `reportUsageFailure`, and `exitCodeFor`, the single exit-code mapping |
| `platform/layers.ts` | `NodeBaseLayer`, `commandLayer`, `makeNodeLayer` |
| `platform/testing.ts`, `platform/testing.fs.ts` | `makeTestLayer`, `effectTest`, `runScoped`, and the in-memory filesystem and glob |

Effect's own `FileSystem`, `Path`, `HttpClient`, `ChildProcessSpawner`, and
`Terminal` services are used directly where a command needs them.

### 5.2 Layers

- `NodeBaseLayer` wires every invocation-independent service
  (`BaseServices`: `Environment`, `FileSystem`, `Path`, `ChildProcessSpawner`,
  `Terminal`, `HttpClient`, `Glob`, `ReadOnlyFiles`, `GetOnlyHttp`,
  `TemporaryDirectories`, `Prompts`, `Sink`) to `NodeServices.layer`,
  `NodeHttpClient.layerUndici`, and the repository adapters. `scripts/cli.ts`
  provides it once.
- `commandLayer(settings)` builds the per-invocation `CommandServices`
  (`OutputSettings`, `Presenter`, `Process`, `Inspection`) after the global
  flags are parsed. It reads `ProcessLayerFactory` and
  `InspectionLayerFactory` references and builds each as a fresh layer, so no
  invocation reuses another invocation's process or inspection sessions.
- `makeNodeLayer(settings)` composes both for programs started outside the CLI
  (the worker runner).
- `makeTestLayer(options)` provides the same `PlatformServices` in memory
  (section 14.2).

### 5.3 Capability Profiles

Profiles are requirement types, checked by the compiler:

- **Read-only profile** (Doctor, Status, inspection): `DoctorRequirements`,
  `StatusRequirements = DoctorRequirements | Inspection`, and
  `InspectionRequirements` admit `ReadOnlyFiles`, the `GET`-only bounded
  `NetworkProbe` (over `GetOnlyHttp`), `Process` reached only through opaque
  allowlisted probes and the isolated workers, `TemporaryDirectories`,
  `Environment`, and `Presenter`. They exclude the mutating `FileSystem`, the
  unrestricted `HttpClient`, `writeTextAtomic`, and `Prompts`.
- **Mutation profile** (Setup, generators, documentation assembly, rates,
  containers, E2E): may require `FileSystem`, `Path`, `HttpClient`, `Prompts`,
  and `Process`, within each family's documented mutation boundary. Setup
  submits every mutation through its `SetupActions` service.

### 5.4 Environment Snapshot

`EnvironmentLive` snapshots `process` once when the layer is built. Business
modules read `Environment`, never `process.env`. Child-process environment
overrides are merged per `Process.run` call (`undefined` unsets a variable)
without changing the snapshot.

### 5.5 Time and Concurrency

`Clock`, `DateTime`, and `Effect.sleep` replace the revision 2 clock; the test
layer provides `TestClock`, so timeouts, delays, and polling run without real
waits. `Effect.all` and `Effect.forEach` with an explicit `concurrency` replace
the task scheduler, and `{mode: "result"}` replaces all-settled execution.
Explicit `Promise.all`-style orchestration is forbidden outside the frozen
closure (section 10).

### 5.6 Output

Semantic messages flow through `Effect.logDebug`/`logInfo`/`logWarning`/
`logError` and render as `[arolariu::<context>] <icon> <message>`: debug `🐛`
(verbose only), info `ℹ️`, warn `⚠️` (stderr), error `⛔` (stderr), and
success `✅`. Color uses `node:util` `styleText` and is disabled when stdout is
not a TTY or `NO_COLOR` is set. Presentation (success, sections, banners,
tables, progress, and the JSON document) flows through `Presenter`. Both
render into `Sink`, so tests capture every record. In JSON mode, semantic and
human presentation output is suppressed and `Presenter.json` may write once;
a second write fails with `JsonDocumentAlreadyWritten`.

---

## 6. Process Execution

### 6.1 Request and Options

```typescript
interface ProcessRequest {
  readonly command: string;
  readonly args: readonly string[];
}

interface ProcessOptions {
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly output?: "capture" | "tee" | "inherit";
  readonly input?: string | Uint8Array;
  readonly timeout?: Duration.Input;
  readonly echo?: boolean;
  readonly failureOutput?: "tail" | "full";
}
```

The executable and its arguments stay separate; there is no shell string.
`capture` (the default) collects output, `tee` collects it and writes it live
through `Presenter`, and `inherit` hands the child the terminal. `echo`
(default: `--verbose`) logs `$ <command>` at debug level; the echo never
includes stdin or environment values.

### 6.2 Typed Outcomes

`Process.run(request, options)` succeeds with `{stdout, stderr, durationMs}`
only when the child exits with code `0`. Every other outcome is a
`ProcessError`:

| Error | Meaning |
| --- | --- |
| `ProcessExited` | Non-zero `exitCode` |
| `ProcessSignalled` | Terminated by a `signal` the run did not cause |
| `ProcessSpawnFailed` | The process could not start, or its streams failed (`reason`) |
| `ProcessTimedOut` | The `timeout` elapsed and the child was terminated (`timeoutMs`) |

Each carries the formatted `command`, the captured `stdout` and `stderr`,
`durationMs`, and a `message`. Callers for which a non-zero exit is data use
`Effect.catchTag("ProcessExited", ...)` or `Effect.result`; everyone else lets
the failure propagate. Cancellation is fiber interruption, not an error
variant.

### 6.3 Bounded Evidence

A failure keeps the last `MAX_EVIDENCE_CHARACTERS` (2,000) of each stream
unless the caller selects `failureOutput: "full"` because it parses the output
of a non-zero exit (for example `npm ls --json`). `processErrorEvidence`
renders the diagnostic lines that the CLI prints (section 7.6). Output is not
masked (section 12.3).

### 6.4 Process Trees and Windows

Interruption closes the spawn scope, which terminates the child. A captured
child never talks to the terminal: it runs in its own process group off
Windows, and its whole tree is killed at once (`SIGTERM`, then `SIGKILL` after
1 s; `taskkill /T /F` on Windows). A terminal-attached child (`tee` or
`inherit` output) stays in the terminal's foreground process group, so `sudo`
can prompt and the terminal's Ctrl+C and hang-up reach it; on Windows it
shares the console. After a Ctrl+C it gets `INTERRUPT_GRACE_PERIOD` (15 s) to
finish its own shutdown, which keeps the Aspire AppHost, DCP, and
`docker compose up` shutdown graceful; a second Ctrl+C ends the wait. A child
still running is then terminated: the direct child on POSIX (its descendants
received the terminal's Ctrl+C themselves), the tree on Windows. A `SIGTERM`
sent to the CLI alone is forwarded to the direct child, followed by `SIGKILL`
after the grace period. A programmatic interruption (no signal) terminates the
child at once. `platform/windows.ts`
resolves `.cmd`/`.bat` shims and escapes their arguments, and keeps an
unresolved command distinguishable from a resolved shim.

### 6.5 The Closure's Runner

`common/runner.ts` (the engine-neutral `ProcessRunner` protocol with
discriminated outcomes) and `common/runner.execa.ts` (its Execa adapter)
remain only as private modules of the frozen closure (section 3.2).
`workers/shell.ts` uses them through `nodeProcessRunner` and keeps its
worker-facing `{code, output}` result.

---

## 7. Lifecycle, Error, and Exit Policy

### 7.1 Exit Codes

`platform/exit.ts` `exitCodeFor(exit, lastSignal)` is the only mapping, and
only `scripts/cli.ts` and `platform/worker.ts` call it:

| Exit | Outcome |
| ---: | --- |
| `0` | Success, including `--help`, a bare command group, `--version`, and `--completions` |
| `1` | `ReportedFailure{exitCode: 1}` (a business-negative result after its full output), a typed failure, or a defect |
| `2` | A `CliError` usage or parse failure, or `ReportedFailure{exitCode: 2}` |
| `130` | Interruption after `SIGINT`, interruption with no recorded signal, or a terminal quit (`QuitError`) |
| `143` | Interruption after `SIGTERM` |

Interruption takes precedence over any failure, finalizer failures included,
so a signalled run keeps its signal exit code.

### 7.2 Failure Types

- **Typed failures**: each family's `Schema.TaggedError` classes, the
  `ProcessError` union, `PlatformError`, `ResponseTooLarge`,
  `MaxBytesExceeded`, `PromptUnavailable`, and `RepositoryRootNotFound`.
- **`ReportedFailure`**: a failure the command has already rendered; it only
  selects exit `1` or `2`.
- **`CliError`**: parsing and usage failures from `effect/cli`; a `ShowHelp`
  without errors is a help request (exit `0`).
- **Defects**: invariant violations and unscripted test calls (`Effect.die`).

### 7.3 No Framework-level Silent Degradation

The platform never converts a failure into a success-shaped default. Only
explicit business policy may degrade:

- Status maps an unavailable collector or a collector defect to a `null`
  section;
- Doctor maps a module defect to one failed `<module>.module-error` row;
- Setup records independent phase failures and dependency-based skips;
- exchange-rate generation continues past a failed year and reports it;
- E2E report cleanup appends cleanup failures to the primary Newman failure.

### 7.4 Cancellation

`NodeRuntime.runMain` interrupts the main fiber on `SIGINT` and `SIGTERM`;
`platform/signals.ts` only records which signals arrived, so `exitCodeFor` can
choose `130` or `143` and `Process` can tell a Ctrl+C from a programmatic
interruption (the `TerminationSignals` reference). Interruption propagates to
every child fiber, stops in-flight HTTP requests, delays, and prompts, and
closes process scopes, which stop child processes after the Ctrl+C grace
period of a terminal-attached child (section 6.4).

A cancelled command interrupts. It does not produce failed rows, failed
phases, or a fabricated partial document: a Doctor module or Setup phase
interrupted by cancellation is not converted into a `module-error` row or a
failed phase, and a terminal quit at a prompt cancels the whole run with exit
`130`.

### 7.5 Cleanup

Finalizers registered in the command scope (`Effect.acquireRelease`,
`Effect.addFinalizer`, `Effect.ensuring`) run in LIFO order on success,
failure, and interruption. A finalizer failure is combined into the `Cause`
alongside the primary failure and never replaces it. Examples: the docs
pipeline removes a partial `_generated` tree; E2E sanitizes every registered
report on every exit path; temporary directories are removed when their scope
closes, after the processes using them have stopped.

### 7.6 Failure Rendering and JSON Mode

`runCli` renders every failure that no command already reported. A
`ReportedFailure`, a `CliError` (which `effect/cli` already printed), a
`QuitError`, and a pure interruption are not rendered again.

- **Human mode** writes `[arolariu::cli] ⛔ <message>` to stderr, followed for a
  `ProcessError` by its bounded `stdout: ...` and `stderr: ...` evidence lines.
- **JSON mode** (`--json` in any spelling `effect/cli` accepts before `--`;
  a `--json` after `--` is a passthrough argument) writes one JSON document on
  stdout for every completed command run and every usage failure,
  `JSON.stringify(value, null, 2)` plus a trailing newline: the command's
  typed result on success or business-negative completion,
  `{status: "failed", kind: "usage", message, evidence}` for a usage failure,
  or `{status: "failed", kind, message, evidence}` (`kind` is `operational`
  for a typed failure and `internal` for a defect) for any other failure.
  `effect/cli` help and error text goes to stderr. Container and E2E commands
  that report a child failure themselves write the same failed-document
  shape.

The guarantee covers what the CLI writes; these cases write no document or
share stdout with other output:

- `--help`, `--version`, `--completions`, `--wizard`, and a bare command group
  write no document;
- an interrupted run (exit `130`/`143`) writes no document;
- `format` and `lint` run the frozen closure with inherited output and write no
  document;
- a child with inherited output (the `dev aspire` AppHost, `setup` actions
  that inherit output) writes to the same stdout;
- an interactive prompt (`setup` without `--yes` or `--dry-run` on a
  terminal) draws on the terminal.

### 7.7 Error Detail

Failures carry enough context to diagnose the operation: the formatted
command, bounded output, the failing path or step, and the HTTP status. The
platform never includes stdin payloads or environment values in a diagnostic.
Secrets are handled by type (section 12.3), not by output filtering.

---

## 8. Per-command Business Boundaries

| Command family | Business logic retained | Mechanics provided by the platform |
| --- | --- | --- |
| Documentation assembly | Extractor selection, tier validation, normalization, landing pages, prose mirror rules | Parsing, concurrency, `Process` capture, `FileSystem`, scoped cleanup of `_generated` |
| Doctor | Read-only probe allowlist, modules, scoring, evidence, fixed ordering, quick/full policy | Parsing, `NetworkProbe` over `GetOnlyHttp`, concurrency, `Inspection`, failure rendering |
| Status | Six-section schema, strict payload parsing, null-on-unavailable policy, dashboard/JSON rendering | Parsing, `Process`, `ReadOnlyFiles`, concurrent independent collectors, Doctor composition as an effect |
| Generate | Selected tasks, ordering, stop-on-first-failure, aggregate summary | Parsing, plain-effect composition, output, exit mapping |
| Generate environment | Azure/local source, required keys, secret classification, env content, copy destinations | `HttpClient`, `Prompts`, `FileSystem`, `Environment`, `Redacted` |
| Generate i18n | English source of truth, locale traversal, missing-key insertion, deterministic serialization | `FileSystem`, repository paths, output |
| Generate GraphQL | Output location and placeholder behavior | `FileSystem` |
| Generate artifacts | Taxonomy/license algorithms, source validation, archive entry rules, output consistency | `HttpClient` with bounded reads, `FileSystem`, `Process`, concurrency, `Effect.sleep` retries |
| Setup | Phase graph, readiness, mutation scopes, consent, prerequisites, remediation, postconditions | Parsing, `Process` defaults, `Prompts`, files, HTTP, clock, interruption |
| E2E | Target/auth policy, collection/environment selection, Newman arguments, report sanitization | Parsing, `Process` capture, files, `Environment`, `Redacted`, scoped cleanup |
| Exchange rates | Year validation, Frankfurter request and schema, RON calculation, merge/write policy | Parsing, `HttpClient`, `FileSystem`, `Effect.sleep` |
| Aspire | Engine selection, preflight, AppHost command/environment | Parsing, `Process` inherit, exit mapping |
| Compose | File requirement, exact pass-through args, engine adapter | Parsing, `Process` tee, failure rendering |
| Image | Target mapping, tags, ports, build args, artifact prerequisite | Parsing, `Process` tee, artifact generation as an effect |
| Selfhost | Plans, bootstrap order, SQL secret, Cosmos/Azurite rules, Traefik lifecycle | Parsing, `Process`, `HttpClient` with bounded reads, `LocalBlobStorage`, `Effect.sleep`, `Redacted` |

### 8.1 Preserved Execution Shapes

- documentation extractors remain concurrent, followed by normalization;
- Doctor modules remain independently concurrent with a fixed report order;
- generation remains `env -> i18n -> gql -> artifacts`;
- Setup phases remain sequential and dependency-aware;
- Status collectors remain independently settled;
- E2E `all` remains sequential;
- exchange-rate years remain sequential with a polite delay;
- selfhost commands remain ordered with storage/bootstrap delays;
- long-running Aspire output remains inherited;
- Compose, image, and selfhost output remains live tee output.

### 8.2 Intentional Changes

- Newman runs in capture mode and its output is re-emitted only after
  redaction (section 12.3), so `test e2e` shows no live Newman progress; each
  target's output appears when its run settles.
- `--json` produces one document for every completed command run, including
  usage and failure documents, with the exceptions listed in section 7.6.
- A cancelled command interrupts instead of producing failed rows
  (section 7.4).
- A terminal quit exits `130`.
- Terminal-attached children are terminated after a bounded Ctrl+C grace
  period (section 6.4); the legacy runner killed only the direct child and
  left its descendants running.

---

## 9. Inspection, Setup, Doctor, and Status Contracts

### 9.1 Inspection Service

`Inspection` (`inspection/Inspection.ts`) keeps one layer-scoped session per
`repositoryInspectionRequestKey` (repository root, profile, and requested
container engine); a conflicting request for the same key dies with the
conflict message. `inspection/repository.ts` composes one provider per fact
(`workspace`, `aggregate`, `npm.root`, `npm.github-scripts`, `packages`,
`dotnet`, `python`, `react`, `svelte.cv`, `svelte.status`, `infrastructure`)
onto a session that runs each provider at most once, memoizes its outcome, and
traces each run as one `inspection.<key>` span. Providers still return:

```typescript
type InspectionOutcome<T> =
  | {readonly kind: "available"; readonly value: T; readonly durationMs: number}
  | {readonly kind: "unavailable"; readonly reason: string; readonly durationMs: number}
  | {readonly kind: "invalid"; readonly issues: readonly string[]; readonly durationMs: number};
```

Process failures become `ProbeOutcome`/`InspectionOutcome` data. Providers run
their processes as child fibers and own their temporary directories in their
own scope, so closing a session interrupts in-flight providers and stops their
processes before the directories are removed.

### 9.2 Worker Isolation

envinfo and systeminformation load only in `inspection/aggregate-worker.ts`,
and the Nx project graph is built only in `inspection/workspace.worker.ts`
with Nx state redirected to a disposable temporary directory. Both are native
Node child processes started through `runWorker`. Each accepts no
user-selected command or field, projects and bounds its data, and emits one
JSON document that its parent provider validates as untrusted input. Under the
`quick` profile, `aggregate` is a fixed `unavailable` stub and its worker
never starts.

### 9.3 Doctor Read-only Profile

Doctor retains repository read-only behavior, opaque allowlisted inspection
probes (`inspection/probes.ts`), `GET`-only network probing through
`NetworkProbe` (10 MiB body bound, one deadline for request and body),
read-only files, bounded evidence, score and grade validation, and
module-defect degradation. The `DoctorRequirements` type and
`commands/doctor/readonly.test.ts` enforce the profile at compile time and with
sentinel snapshots of `.nx` and `.arolariu`.

### 9.4 Setup Mutation Profile

Setup retains repository, user, and system mutation scopes; `--dry-run`;
`--yes` only for system-scoped approval; prompt interruption; dependency-based
skips; exact inspection invalidation; postcondition verification; and
independent phase continuation. `SetupActions` is the only place that decides
whether an action is `executed`, `planned`, or `declined`.

### 9.5 Status Composition

`collectStatus` composes `runDoctor({quick: true, verbose: false})` as a plain
effect in the same concurrent batch as its collectors. Both request the same
quick session, so every inspection provider runs at most once per `status`
run. Health is the one section that is not degradation-tolerant: passing and
failing Doctor reports are ordinary health data (Status exits `0` on
completion), while a Doctor defect fails the Status run. The five collector
sections (`workspaces`, `nxEdges`, `git`, `security`, `disk`) remain
individually nullable.

---

## 10. Architecture Enforcement

### 10.1 Architecture Tests

`scripts/architecture.test.ts` enforces the boundary with the TypeScript
compiler API. `scripts/common/output-policy.test.ts` keeps the direct-output
guards. No new ESLint rule is added for this boundary; the existing output,
prompt, and Doctor read-only ESLint restrictions stay as immediate feedback.

### 10.2 Rules

1. The format/lint value-import closure equals the pinned list of section 3.2,
   and its type-only frontier equals the pinned type-only list.
2. Only closure modules (and their colocated tests) load the closure's private
   modules at runtime; only the two pinned modules take a type from them.
3. No production module imports `node:child_process`; only
   `common/runner.execa.ts` imports `execa`; `workers/shell.ts` uses the
   generic process runner.
4. Each closure module is exempt from exactly the ambient rules it breaks.
5. Outside `scripts/platform/` and the closure exemptions, no production module
   reaches ambient filesystem, HTTP, network, process-control, OS-state, timer,
   or environment access, writes the process streams, calls `process.exit()`,
   assigns `process.exitCode`, detects its own entry, or orchestrates explicit
   promise concurrency.
6. `@effect/platform-node` is imported only inside `scripts/platform/` and by
   `scripts/cli.ts`.
7. Effect runtimes (`Effect.run*`, `ManagedRuntime.make`, `NodeRuntime.runMain`)
   start only in `scripts/cli.ts`, `platform/worker.ts`, `platform/testing.ts`,
   and the synchronous logger sink in `platform/Output.ts`.
8. The only production modules with an `import.meta.main` block are the five
   of section 4.7, with the block contents restricted as described there.
9. The platform fixtures under `scripts/platform/__fixtures__/` are the only
   modules exempt from these production scans.
10. The read-only families (`scripts/inspection/**`,
    `scripts/commands/{doctor,status}/**`) never import a mutating capability
    (`FileSystem`, `HttpClient`, `writeTextAtomic`, `Prompts`, the legacy
    process-runner port, the closure's Node and Execa adapters, or `node:fs`,
    `node:os`, `node:child_process`, `execa`), in any import form.
11. `effect/cli` is imported only under `scripts/commands/`, by
    `scripts/cli.ts`, by `platform/exit.ts`, and by `platform/Prompts.ts`.
12. No temporary migration marker remains under `scripts/`.

Architecture tests do not replace command behavior tests.

---

## 11. Package Ownership

| Package | Version | Ownership |
| --- | --- | --- |
| `effect` | `4.0.2` | Services, layers, fibers, scopes, `effect/cli`, `FileSystem`, `HttpClient`, `ChildProcessSpawner`, `Terminal`, test clock |
| `@effect/platform-node` | `4.0.2` | Node adapters (`NodeServices`, `NodeHttpClient`, `NodeRuntime`); imported only by `scripts/platform/` and `scripts/cli.ts` |
| `@nx/devkit` | `23.3.0` | Project discovery and dependency graph (workspace worker) |
| `envinfo` | `7.21.0` | Generic tooling inventory (aggregate worker) |
| `systeminformation` | `5.33.15` | Generic host inventory (aggregate worker) |
| `@azure/storage-blob` | `12.34.0` | Azurite provisioning (`LocalBlobStorageLive`) |
| `execa` | `10.1.0` | Frozen closure only (`common/runner.execa.ts`) |
| `piscina` | `5.3.2` | Frozen closure only (format/lint pools) |

`effect` and `@effect/platform-node` stay pinned exactly and move in lockstep.
The exact pins are owned by the [root package manifest](../../package.json).
A new package requires a concrete missing capability, comparison against the
existing platform, exact version approval, a security and transitive-dependency
review, and adapter ownership and rollback.

---

## 12. Security and Privacy

### 12.1 Process Safety

- command and arguments remain separate, and no shell string is accepted;
- stdin and environment values are never included in diagnostics or echoes;
- an interrupted run terminates the child: a captured child with its whole
  process tree at once, a terminal-attached child after its Ctrl+C grace
  period (section 6.4);
- secrets go to child processes through `env` wherever the tool allows it.

### 12.2 Capability Profiles

- Doctor, Status, and inspection: read-only files, `GET`-only bounded HTTP, and
  opaque probes (section 5.3);
- Setup and generators: mutating files, explicit HTTP methods, and prompts;
- container commands: processes, bounded HTTP, files, delays, and the Blob SDK
  service;
- inspection workers: one bounded JSON document and no prompts.

### 12.3 Secrets

Secret values are typed `Redacted<string>` from the point they are read and
unwrapped with `Redacted.value` only at the call that needs the raw value.
Effect renders a logged `Redacted` as `<redacted>`. There is no redaction
registry and **no output masking**: the platform does not scan child output or
diagnostics for secret literals (accepted risk, section 19).

Command-specific mitigations:

- `dev selfhost start` reads `MSSQL_SA_PASSWORD` as `Redacted` and unwraps it
  only into the `SQLCMDPASSWORD` environment variable of the
  `docker`/`podman exec -e SQLCMDPASSWORD` client, which copies the named
  variable into the container for `sqlcmd`, so it never reaches an argument
  vector; the run never echoes under `--verbose`, and a failure is rebuilt as
  a step-only `ContainerRuntimeError`;
- `test e2e` reads `E2E_TEST_AUTH_TOKEN` as `Redacted` and unwraps it only for
  Newman's `--env-var authToken=...` argument, because Newman has no
  environment channel. The Newman run never echoes its command, captures its
  output, and re-emits it only after removing the runtime token, bearer values,
  and JWT patterns; every `ProcessError` is rebuilt as a `NewmanFailed` from
  that redacted output alone;
- `generate env` keeps secret values `Redacted` until they are written.

### 12.4 Repository Mutation

Doctor and Status remain checkout-read-only. Nx workspace data and task cache
remain redirected to operating-system temporary directories. Setup,
generators, documentation assembly, E2E report generation, exchange rates,
and container tooling retain their documented mutation boundaries.

---

## 13. Performance

The production base layer is built once per process and the command layer once
per invocation. Concurrency preserves the existing parallelism:

- no new unbounded fan-out;
- no serialization of independent Doctor or Status work;
- no parallelization of consent, rate-limited, or order-dependent workflows;
- no worker thread outside the frozen closure.

Loading Effect and the full command tree costs startup time. Median wall
times on the Windows development host: `npm run doctor -- --quick` rose 14.7%
when the root CLI landed (11.02 s to 12.64 s) and another 9.3% when inspection,
Doctor, and Status migrated (to 13.81 s); `npm run status` rose 3.9% at each of
those steps; and `--help` takes about 1.6 s longer (0.86 s to 2.45 s) because
`scripts/cli.ts` imports every family eagerly. This is accepted (section 19).

---

## 14. Testing Strategy

### 14.1 Characterization First

Before each family migrated, its tests pinned the exit code, the JSON
document, and the key `[arolariu::<context>]` lines of every command path
against the revision 2 implementation. The migrated tests reproduce them,
except for the intentional changes of section 8.2.

### 14.2 Test Harness

`platform/testing.ts` replaces the revision 2 test runtime factory:

- `effectTest(name, body, layer, timeoutMs?)` registers a Vitest case whose
  body is an effect, run in a fresh scope by `runScoped`, which rejects with
  the original typed failure;
- `makeTestLayer(options)` provides every platform service in memory: a
  map-backed filesystem, glob, and temporary directories (or the real ones
  with `fileSystem: "node"`), scripted processes (`processes`,
  `scriptedOutcomes`), scripted HTTP, scripted prompts, scripted inspection
  outcomes, a recording sink, a fixed environment, and `TestClock` (or the live
  clock with `clock: "live"`), with `output()`, `processCalls()`,
  `httpCalls()`, and `files()` accessors.

Unscripted processes, HTTP requests, prompts, inspection keys, child-process
spawns, terminal reads, and unimplemented filesystem members die, so a test
never reaches a real boundary or a silent default. Only true external
boundaries are replaced; repository modules are never mocked. Family CLI tests
run `runCli` on a harness layer.

### 14.3 Platform Tests

Colocated tests cover the environment snapshot, output rendering in every
mode, the process service (success, each failure, timeout, stdin, capture,
tee, inherit, environment merge, echo, evidence bounds, Windows shims), bounded
reads, prompts with and without a TTY, signal recording, exit mapping, layers,
the worker runner, and the harness itself.

### 14.4 Cross-platform Cancellation

`platform/cancellation.integration.test.ts` starts
`platform/__fixtures__/cancellable-cli.ts`, which runs an inherited child and
grandchild under `NodeRuntime.runMain`. On POSIX the fixture leads its own
process group: a `SIGINT` to that group (a terminal Ctrl+C) must let the child
and grandchild exit on their own long before the grace period ends, with exit
`130`, and a `SIGTERM` to the CLI alone must reach the child, with exit `143`.
On Windows, where Node cannot deliver a catchable signal to another process, a
self-interrupt of the main fiber must kill the tree through `taskkill /T /F`,
with exit `130`. Each case checks that the processes it stops are gone within
three seconds.

### 14.5 Coverage

Coverage thresholds in `scripts/vitest.config.ts` stay at 90% for statements,
functions, lines, and branches. Test-support modules and adapters exercised
through focused contract tests are excluded there.

---

## 15. Migration and Rollback

### 15.1 Revision 2 Migration (Implemented)

Revision 2 migrated every script except format/lint to the declarative command
host in eight cohorts: characterize and guard; runner foundation; command
runtime; generation and data; Doctor, Status, and inspection; Setup;
documentation, E2E, and containers; and delete and document. It deleted
`common/cli.ts`, `common/process.ts`, `runWithSpinner()`, and the ambient
environment flags.

### 15.2 Revision 3 Migration (Implemented)

| Cohort | Content |
| --- | --- |
| 0 | Spike: Windows process-tree kill on interrupt, SIGINT versus SIGTERM exit codes under `runMain`, and `effect/cli` help on Windows |
| 1 | Platform services, layers, test harness, and a temporary Promise bridge beside the legacy kernel |
| 2 | Root CLI `scripts/cli.ts` with every subcommand; npm aliases and callers switched; Commander and slash aliases removed |
| 3 | Generate, rates, and docs migrated to Effect |
| 4 | Inspection, Doctor, and Status migrated; read-only profile by requirement type; workers started by `runWorker` |
| 5 | Setup migrated; consent through `Prompts`; `SetupActions` |
| 6 | Containers and E2E migrated; cross-platform cancellation test |
| 7 | Bridge, command host, capability kernel, test runtime, and prompt adapter deleted; `runtime.node.ts` trimmed to the closure adapter; architecture tests pinned to the final boundary; this revision finalized |

### 15.3 Rollback

Until cohort 7, the bridge kept the legacy interfaces alive, so each family
cohort was independently revertible. Cohort 7 can be rolled back only together
with the cohorts it cleans up after. After it, rollback is a revert of the
revision 3 change set.

---

## 16. Alternatives Considered

### 16.1 Inheritance-heavy God Command

One base class would directly implement parsing, logging, HTTP, filesystem,
processes, tasks, environment, and errors. Rejected because it couples
unrelated capabilities, weakens Doctor's read-only boundary, forces tests to
mock or subclass one large object, and encourages shared mutable state.

### 16.2 Pure Declarative Host Without Capability Services

Scripts would export descriptors consumed by one host while support modules
kept ambient Node access. Rejected because it shrinks entry files without
solving the infrastructure boundary.

### 16.3 Keep the Revision 2 Kernel

The homegrown kernel worked and was tested. Rejected because it was
repository-owned infrastructure whose every mechanic (DI, scheduling,
cleanup, cancellation, adapters, test runtime) a maintained library provides,
and keeping it meant maintaining, documenting, and testing it indefinitely.

### 16.4 One Root CLI

**Accepted.** `scripts/cli.ts` registers every family as a subcommand of the
`arolariu` root command (section 4). Revision 2 deferred a root CLI because
independent npm scripts were clear and used by automation. Revision 3 keeps
every npm script name as an alias of one command path, so automation is
unchanged, and gains one parser, one help and completion surface, one place to
record signals, and one exit-code mapping.

### 16.5 New TUI Framework

Clack, Listr, or a similar package could standardize prompts and progress.
Rejected because `effect/cli` `Prompt` and the `Presenter` service already
cover them without another dependency.

### 16.6 Unified Process and Piscina Runner Now

Rejected for this revision because worker-thread lifecycle, cancellation,
serialization, output, and failure semantics differ from child processes. The
format/lint migration needs its own design (section 20).

### 16.7 `@effect/vitest`

Rejected because `@effect/vitest@4.0.0` requires `vitest >=5`, and the
repository stays on vitest 4 for `@storybook/addon-vitest`. The local
`effectTest` helper covers the need.

---

## 17. Documentation Requirements

- `scripts/README.md` documents the command tree, global flags, exit codes,
  failure rendering, the platform services and layers, the test harness, each
  family's behavior and module map, the frozen closure, the architecture rules,
  and the targeted test commands.
- `DEVELOPMENT.md` documents the user-visible help, exit-code, cancellation,
  JSON, and composition behavior.
- `AGENTS.md` lists the root commands.
- Every module starts with an `@fileoverview`/`@module` header, and every
  exported function has JSDoc and an explicit return type.
- This RFC changes when implementation refines a public contract.

The RFC index keeps RFC 0002 as the canonical process and tooling architecture
record.

---

## 18. Success Criteria

Revision 3 is complete when:

1. every command is a subcommand of `scripts/cli.ts` and every npm script name
   is an alias of one command path;
2. `exitCodeFor` is the only exit-code mapping, and no command reads
   `process.argv`, assigns `process.exitCode`, or calls `process.exit()`;
3. commands compose plain effects, never sibling processes;
4. all production filesystem, HTTP, process, timer, environment, and
   concurrency access outside the frozen closure flows through Effect and
   `scripts/platform/`;
5. every child process outside the closure runs through `Process`, with
   typed failures;
6. Doctor, Status, and inspection compile against the read-only profile;
7. Setup retains consent, dry-run, invalidation, and postcondition behavior;
8. Status retains nullable collector sections, and `--json` writes one
   document for every completed command run (exceptions in section 7.6);
9. generator, documentation, E2E, exchange-rate, and container business
   contracts remain covered;
10. secrets are `Redacted` from the point they are read;
11. the frozen closure equals the pinned list and is behaviorally unchanged;
12. the bridge, command host, capability kernel, test runtime, prompt adapter,
    and `commander` are deleted;
13. the architecture, platform, command-family, and integration tests pass;
14. the scripts project type-checks with no explicit TypeScript `any`, lint
    passes, and `npm run build` succeeds.

---

## 19. Accepted Risks

| Risk | Decision |
| --- | --- |
| No output masking. Secrets can appear in child-process output or a command echo (selfhost SQL password, `generate env` values, setup user secrets, the E2E token in CI logs). | Accepted. Mitigations only: `Redacted<string>` keeps our own logs clean, secrets travel through `env` where the tool allows, and selfhost and E2E apply the targeted measures of section 12.3. |
| No CI job runs the scripts Vitest suite, so CI does not validate this architecture. | Accepted. Every change to `scripts/` records the local suite, type-check, and lint results. Adding a job is a separate workflow change. |
| The POSIX signal and process-tree legs of the cancellation test are not exercised on the Windows development host. | Accepted. The test runs them on POSIX (verified in a `node:24` Linux container); Windows uses the self-interrupt path. |
| On POSIX, a `SIGTERM` sent to the CLI alone, or a programmatic interruption, reaches only the direct child of a terminal-attached (`tee`/`inherit`) child, because that child must stay in the terminal's process group to prompt and to receive Ctrl+C. | Accepted. A terminal Ctrl+C or hang-up reaches the whole foreground group; signal the process group to stop every descendant. Captured children keep the process-group tree kill. |
| Newman has no live progress, because its output is captured and re-emitted after redaction. | Accepted in exchange for keeping the E2E token out of the output. |
| Startup time increased: `doctor --quick` +14.7% at the root-CLI cohort and a further +9.3% at the inspection cohort, `status` +3.9% at each, `--help` about +1.6 s. | Accepted (section 13). |
| The 90% global branch-coverage threshold of the scripts suite already failed before revision 3 and still fails (about 85%), so the suite exits `1` on coverage alone. | Accepted as pre-existing; thresholds are unchanged. |
| The format/lint closure still runs on Execa and the legacy logger. | Accepted until the follow-up of section 20. |

---

## 20. Future Work

- Migrate the Piscina format/lint stack and remove `execa` and `logger.ts`.
- Add a CI job that runs the scripts suite, type-check, and lint.
- Restore the scripts branch coverage to the configured threshold.
- Import command families lazily per subcommand to recover `--help` startup
  time.
- Live Windows, Linux, and macOS tooling validation in CI.
- Replace the GraphQL placeholder with a separately designed generator.

---

## 21. References

- [Effect](https://effect.website/)
- [Execa](https://github.com/sindresorhus/execa)
- [Piscina](https://github.com/piscinajs/piscina)
- [Nx Devkit](https://nx.dev/reference/core-api/devkit/documents/createProjectGraphAsync)
- [envinfo](https://github.com/tabrindle/envinfo)
- [systeminformation](https://systeminformation.io/)
- [`scripts/README.md`](https://github.com/arolariu/arolariu.ro/blob/main/scripts/README.md)
- [`AGENTS.md`](https://github.com/arolariu/arolariu.ro/blob/main/AGENTS.md)

---

**Document Version**: 3.0.0
**Last Updated**: 2026-10-05
**Status**: Accepted
