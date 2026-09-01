# RFC 0002: Lean Monorepo Tooling Architecture

- **Status**: Accepted
- **Date**: 2026-09-01
- **Revision**: 2 - Declarative Monorepo Command Runtime
- **Authors**: Alexandru-Razvan Olariu, GitHub Copilot
- **Related Components**: `scripts/`, `package.json`, `package-lock.json`, `.arolariu/tooling.local.json`
- **Supersedes**: RFC 0002 revision 1, dated 2026-08-31

---

## Abstract

This RFC defines the shared runtime for repository tooling under `scripts/`.
Every production script except the format and lint Piscina stack is authored as
a declarative command object backed by one Commander lifecycle, one
invocation-scoped capability runtime, and a generic runner contract with an
Execa implementation.

The design centralizes argument parsing, help, terminal presentation, process
execution, filesystem and HTTP access, environment and signal handling,
concurrency, delays, cleanup, failure normalization, and process exit behavior.
Script modules retain only repository business policy: setup phases, Doctor
diagnoses, Status degradation, generators, documentation assembly, E2E report
handling, exchange-rate transformation, and container lifecycle rules.

This revision replaces the narrower Commander factory and Execa
`CommandRunner` architecture from the previous revision. It preserves all
still-valid setup, Doctor, inspection, redaction, read-only, security, and
cross-platform contracts.

---

## 1. Context and Motivation

### 1.1 Current State

The first revision of this RFC successfully established:

- Commander as the parser for most user-facing scripts;
- Execa as the sole production child-process engine;
- a shared logger with chunk-safe redaction;
- a shared prompt adapter;
- an inspection session reused by Setup, Doctor, and Status;
- typed setup phases and Doctor diagnostic modules;
- architecture tests for output and process boundaries.

Those improvements removed low-level process code and several duplicated
inspection paths, but the command layer remains only partially centralized.
The current `scripts/common/cli.ts` factory configures a Commander instance,
while each entrypoint still owns some combination of:

- logger construction and re-construction after parsing;
- `try`/`catch` around Commander;
- Commander error-to-exit mapping;
- direct-entry detection;
- `process.exit()` or `process.exitCode`;
- unknown-error formatting;
- SIGINT and prompt interruption mapping;
- human, JSON, and fatal-error output selection;
- command-scoped timeout and logging wrappers;
- repeated child-process success and transport-failure checks;
- repeated filesystem, HTTP, timer, environment, and concurrency mechanics.

The shared Execa adapter also returns a flag-based result that callers must
interpret repeatedly:

```typescript
result.code === 0
  && !result.timedOut
  && result.signal === undefined
  && result.spawnError === undefined
```

That logic, command-failure evidence formatting, and top-level lifecycle code
now appear in multiple Setup modules, Status, documentation assembly,
container runtime commands, generators, and E2E tooling.

### 1.2 Command Inventory

This RFC covers these user-facing command families:

| Family | Entry points |
| --- | --- |
| Documentation | `docs-assemble.ts` |
| Health | `doctor.ts`, `status.ts` |
| Generation | `generate.ts`, `generate.env.ts`, `generate.gql.ts`, `generate.i18n.ts`, `generate.artifacts.ts` |
| Setup | `setup.ts` and `setup.*.ts` |
| Testing | `test-e2e.ts` |
| Data maintenance | `update-exchange-rates.ts` |
| Local containers | `container-runtime/aspire.ts`, `selfhost.ts`, `compose.ts`, `image.ts` |

The capability boundary also applies to supporting production modules under
`scripts/**`, including inspection providers and internal worker entrypoints.
The exclusions are defined in section 3.

### 1.3 Problem Statement

The current design centralizes libraries without centralizing the full command
lifecycle. As a result:

1. script entrypoints remain larger than their business behavior requires;
2. command semantics differ between scripts;
3. infrastructure access remains ambient and difficult to restrict by type;
4. command composition depends on exported `main()` or `run*()` functions;
5. process outcomes require repetitive, error-prone flag interpretation;
6. cleanup and cancellation policies are implemented inconsistently;
7. tests replace many individual dependencies instead of one invocation
   runtime;
8. architectural drift is easy because a script can still reach Node or Execa
   APIs directly.

### 1.4 Goals

This RFC has the following goals:

1. Make each migrated script declare only metadata, typed input, business
   execution, and business completion policy.
2. Make the command object the only executable API for direct and composed
   invocation.
3. Centralize Commander, terminal, runner, HTTP, filesystem, environment,
   signal, timer, concurrency, cleanup, and exit mechanics.
4. Define a generic runner protocol and an Execa-backed process runner without
   exposing Execa types.
5. Replace flag combinations with discriminated execution outcomes.
6. Preserve repository-specific behavior, security, read-only, redaction, and
   cross-platform contracts.
7. Keep every invocation re-entrant and independently testable.
8. Enforce the architecture with focused TypeScript AST tests.
9. Preserve separate npm command entrypoints; do not require a root umbrella
   CLI.
10. Avoid new dependencies unless implementation proves a concrete capability
    gap.

### 1.5 Non-goals

This RFC does not:

- change `format.ts`, `lint.ts`, their Piscina pools, their workers, or their
  behavior;
- unify Execa and Piscina in this implementation;
- introduce a single `arolariu` root command;
- replace the existing logger, progress, redaction, or prompt implementations;
- replace Nx Devkit, envinfo, systeminformation, Commander, or Execa;
- redesign setup consent, Doctor scoring, Status schemas, generation
  algorithms, exchange-rate calculations, container plans, or Newman report
  sanitization;
- make every pure helper a runtime service;
- impose a line-count quota;
- add a dependency solely to reduce a small amount of adapter code.

---

## 2. Decision

### 2.1 Chosen Architecture

The repository adopts a hybrid of:

- a **capability kernel** for internal isolation; and
- a **declarative command host** for script authoring.

```text
script command definition
  |
  v
MonorepoCommand<TInput, TOutput>
  |
  v
AbstractMonorepoCommand<TInput, TOutput>
  |
  +-- fresh Commander parser per run
  +-- run(argv) and invoke(input)
  +-- output, signal, error, cleanup, and exit lifecycle
  |
  v
CommandRuntime
  |
  +-- logger and prompts
  +-- generic runner
  +-- HTTP client
  +-- filesystem
  +-- clock and delay
  +-- task orchestration
  +-- immutable environment/platform snapshot
  |
  v
Node adapters and Execa
```

The command object owns the public lifecycle. It does not implement every
capability in one God class. Instead, it composes immutable, invocation-scoped
capabilities and passes either the full runtime or a narrower capability view
to business modules.

### 2.2 Responsibility Split

The architecture separates three responsibilities:

1. **Lifecycle**
   - Commander parser construction;
   - slash aliases;
   - help and usage behavior;
   - logger mode;
   - cancellation;
   - error normalization;
   - cleanup;
   - process exit mapping.
2. **Capabilities**
   - external command execution;
   - filesystem access;
   - HTTP requests;
   - prompts and terminal progress;
   - timing and delays;
   - controlled concurrency;
   - environment and platform values.
3. **Business policy**
   - what a command validates;
   - what operations it performs;
   - what failures mean;
   - what data it renders or returns;
   - whether a partial failure degrades, blocks, or aborts.

### 2.3 Why This Is Not a God Class

One class still coordinates every invocation, but unrelated implementations
remain isolated behind interfaces. This preserves the requested single command
facade while avoiding:

- a large inheritance surface;
- shared mutable state between commands;
- unrestricted capabilities in Doctor modules;
- tests that must subclass a monolithic object;
- command-specific policy embedded in generic infrastructure.

---

## 3. Scope and Exclusions

### 3.1 Included Production Code

The architecture applies to every production module under `scripts/**` that
participates in the commands listed in section 1.2. Included modules must not
directly own stateful platform mechanics after migration.

Representative included code:

- direct CLI entrypoints;
- Setup, Doctor, Status, generation, documentation, E2E, exchange-rate, and
  container support modules;
- inspection sessions and providers;
- aggregate and workspace inspection worker entrypoints;
- repository path, requirement, and tooling configuration modules;
- shared command-oriented utilities.

### 3.2 Explicit Format and Lint Exclusion

The following remain outside this RFC:

- `scripts/format.ts`;
- `scripts/lint.ts`;
- `scripts/workers/format.worker.ts`;
- `scripts/workers/lint.worker.ts`;
- `scripts/types/format.ts`;
- `scripts/types/lint.ts`;
- focused tests that exercise only those Piscina contracts.

They continue to use Piscina and worker-thread-specific contracts. They may
reuse the logger, but they are not migrated to the command runtime or generic
runner in this record.

`scripts/workers/shell.ts` is intentionally not excluded. Its legacy
`{code, output}` API remains stable for the format and lint workers, while its
implementation migrates from `common/process.ts` to the generic process
runner. This adapter-only migration must not change Piscina scheduling,
serialization, worker messages, or format/lint behavior.

### 3.3 Pure Platform Utilities

The runtime boundary covers stateful or effectful mechanics. Pure operations
such as `node:path` joins/resolution, URL construction, string decoding, and
data transformation may remain direct imports where they do not perform I/O,
inspect ambient process state, or write presentation output.

---

## 4. Command Authoring Contract

### 4.1 Declarative Definition

The following names and semantics are the normative authoring contract:

```typescript
type CommandPresentation = "human" | "json" | "silent";
type CommandExitCode = 0 | 1 | 2 | 130 | 143;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | Readonly<{[key: string]: JsonValue}>;

interface CommandMetadata {
  readonly name: string;
  readonly description: string;
  readonly usage?: string;
  readonly examples?: readonly string[];
  readonly slashAliases?: Readonly<Record<string, string>>;
}

interface CommandContext {
  readonly runtime: CommandRuntime;
  readonly presentation: CommandPresentation;
}

interface CommandCompletion {
  readonly exitCode: 0 | 1;
  readonly human?: (
    logger: MonorepositoryLogger,
  ) => void | Promise<void>;
  readonly json?: JsonValue;
}

interface CommandDefinition<TInput, TOutput> {
  readonly metadata: CommandMetadata;
  readonly configure: (program: Command) => void;
  readonly decode: (program: Command) => TInput;
  readonly presentation?: (input: Readonly<TInput>) => CommandPresentation;
  readonly execute: (
    context: Readonly<CommandContext>,
    input: Readonly<TInput>,
  ) => Promise<TOutput>;
  readonly completion: (
    output: Readonly<TOutput>,
    context: Readonly<CommandContext>,
  ) => CommandCompletion | Promise<CommandCompletion>;
}
```

`configure()` declares Commander arguments and options. `decode()` converts
Commander state into one typed input and owns command-specific semantic
validation. `execute()` contains business orchestration. `completion()` builds
a deferred final presentation and maps the completed business output to exit
code `0` or `1`; it does not write output itself.

The lifecycle invokes `human` only in human mode, serializes `json` exactly
once in JSON mode, and invokes neither in silent mode. A command that selects
JSON mode must supply `json`; absence is an internal command-definition
failure, not an empty success document.

### 4.2 Abstract and Concrete Classes

`scripts/common/commander.ts` defines:

```typescript
interface CommandInvocationOptions {
  readonly parent?: Readonly<CommandContext>;
  readonly presentation?: CommandPresentation;
  readonly signal?: AbortSignal;
}

interface RuntimeCreationOptions {
  readonly presentation: CommandPresentation;
  readonly signal?: AbortSignal;
  readonly registerProcessSignals: boolean;
}

interface CommandProcessHost {
  readonly argv: readonly string[];
  readonly isDirectEntry: (moduleUrl: string) => boolean;
  readonly setExitCode: (exitCode: CommandExitCode) => void;
}

interface CommandRuntimeFactory {
  readonly processHost: CommandProcessHost;
  readonly createParseLogger: () => MonorepositoryLogger;
  readonly createRoot: (
    options: Readonly<RuntimeCreationOptions>,
  ) => Promise<CommandRuntime>;
  readonly createChild: (
    parent: Readonly<CommandContext>,
    options: Readonly<RuntimeCreationOptions>,
  ) => Promise<CommandRuntime>;
}

abstract class AbstractMonorepoCommand<TInput, TOutput> {
  public run(argv?: readonly string[]): Promise<CommandExecution<TOutput>>;

  public invoke(
    input: Readonly<TInput>,
    options?: Readonly<CommandInvocationOptions>,
  ): Promise<CommandExecution<TOutput>>;

  public runIfMain(moduleUrl: string): Promise<void>;
}

class MonorepoCommand<TInput, TOutput>
  extends AbstractMonorepoCommand<TInput, TOutput> {
  public constructor(
    definition: Readonly<CommandDefinition<TInput, TOutput>>,
    runtimeFactory?: CommandRuntimeFactory,
  );
}
```

The abstract class owns the lifecycle template. The concrete class delegates
command-specific behavior to a typed definition. The production runtime
factory creates Node-backed root and child scopes; tests may inject a factory
without replacing command business code. An omitted `run()` argv reads the
immutable value from `processHost`; the command host itself does not import
ambient process state.

### 4.3 Fresh Parser Per Invocation

Commander `Command` instances are mutable. An exported command object must
therefore create a fresh parser for every `run()` call.

This guarantees:

- repeated tests do not retain prior options or arguments;
- nested invocation cannot corrupt a later CLI run;
- exported command objects are safe to reuse;
- help and error configuration remains invocation-local.

The command host normalizes slash aliases before calling `parseAsync()`. It
does not monkey-patch Commander's `parse()` or `parseAsync()` methods.

### 4.4 Command-only Execution API

Migrated commands do not export `main()`, `runDoctor()`, `runSetup()`, or
equivalent execution functions as parallel entrypoints.

They export a command object:

```typescript
export const doctorCommand = new MonorepoCommand(doctorDefinition);

await doctorCommand.runIfMain(import.meta.url);
```

Pure types, parsers, domain helpers, renderers, and builders may remain
exported where tests or other modules legitimately consume them. The command
object is the only API that starts a command execution.

### 4.5 Direct and Composed Invocation

`run(argv)` is the CLI path:

1. normalize aliases;
2. build and parse a fresh Commander program;
3. decode typed input;
4. select presentation;
5. create an owned root runtime with process-signal handling;
6. execute business behavior and build the deferred completion;
7. run invocation cleanup;
8. render the completion or normalized failure;
9. return a typed execution result.

`run()` returns the exit meaning but never writes it to the process. Only
`runIfMain()` assigns that exit code when the module is the direct entrypoint.

`invoke(input)` is the composition and programmatic path:

1. skip argv and Commander parsing;
2. default presentation to `silent` unless explicitly overridden;
3. derive a child runtime when `parent` is supplied, otherwise create an owned
   standalone root runtime without process-signal registration;
4. execute business behavior;
5. build completion, run child-owned cleanup, and apply presentation;
6. return a typed execution result;
7. never write a process exit code or register OS signal handlers.

Commands compose commands through `invoke()`. They never spawn sibling CLI
scripts.

Examples:

- `statusCommand` invokes `doctorCommand` in quick, silent mode;
- `generateCommand` invokes the selected generator commands;
- image and selfhost commands may invoke artifact generation through the
  generator command object.

### 4.6 Invocation Outcomes

Command boundaries do not leak thrown exceptions:

```typescript
type CommandExecution<TOutput> =
  | {
      readonly status: "completed";
      readonly value: TOutput;
      readonly exitCode: 0 | 1;
    }
  | {
      readonly status: "failed";
      readonly failure: CommandFailure;
      readonly exitCode: 1 | 2;
    }
  | {
      readonly status: "cancelled";
      readonly failure: CommandFailure;
      readonly exitCode: 130 | 143;
    }
  | {
      readonly status: "help";
      readonly exitCode: 0;
    };
```

Business code may throw internally. The command lifecycle classifies the
failure once and returns the appropriate variant. `completed` means the
business operation produced its typed output; it does not imply exit code
`0`. Doctor, for example, returns a completed report with exit code `1` when
diagnostics ran successfully but checks failed. A composing command may still
consume that report.

### 4.7 Presentation Modes

The shared lifecycle supports:

- `human`;
- `json`;
- `silent`.

Human mode uses the existing logger and prompt contracts. JSON mode emits
exactly one success document. Silent mode is used for nested command
composition when the parent owns presentation.

Help and usage errors always route through the runtime factory's parse logger.
Help aliases short-circuit before business execution.

---

## 5. Invocation Runtime

### 5.1 Runtime Contract

`scripts/common/runtime.ts` defines the capability kernel:

```typescript
interface CommandRuntime {
  readonly logger: MonorepositoryLogger;
  readonly prompts: PromptProvider;
  readonly runner: ProcessRunner;
  readonly http: HttpClient;
  readonly files: FileSystem;
  readonly clock: Clock;
  readonly tasks: TaskScheduler;
  readonly inspection: InspectionSession;
  readonly environment: RuntimeEnvironment;
  readonly signal: AbortSignal;
  readonly cleanup: CleanupRegistry;
}
```

The runtime is immutable for one invocation. The inspection session is lazily
created so commands that do not inspect the workspace pay no discovery cost.
Child loggers, scoped runners, read-only capability views, and linked
cancellation signals may be derived without mutating the parent.

### 5.2 Invocation Scope Ownership

Every command execution that reaches runtime creation owns exactly one cleanup
scope and one `AbortController`. Help and parse failures return before a
business runtime exists.

- `run()` creates a root scope, registers SIGINT and SIGTERM, and disposes the
  scope before returning.
- standalone `invoke()` creates a root scope linked to an optional caller
  signal, registers no OS signal handlers, and disposes the scope before
  returning.
- nested `invoke()` creates a child scope linked to both the parent signal and
  an optional caller signal. It shares the parent's immutable environment,
  redaction registry, and lazy inspection session, but receives a child logger,
  scoped runner, cancellation controller, and cleanup registry.

Child cleanup runs before nested `invoke()` returns. A child may dispose only
resources registered in its own cleanup scope; parent-owned resources remain
alive until the parent finishes. Child cancellation does not abort the parent.
Parent cancellation always aborts the child.

Completion is built before cleanup but rendered only after cleanup succeeds.
If cleanup fails, the lifecycle discards the success presentation, preserves
the primary failure when one exists, aggregates cleanup evidence, and returns
one normalized failed outcome. This ordering prevents a JSON success document
from being emitted before a cleanup failure is known.

### 5.3 Production Adapter

`scripts/common/runtime.node.ts` is the approved production adapter for:

- filesystem access;
- native `fetch`;
- timers and delays;
- process environment, current directory, executable path, platform, and
  architecture;
- SIGINT and SIGTERM registration;
- final process exit-code assignment;
- task orchestration over native promises.

It supplies the production `CommandProcessHost` used by `run()` and
`runIfMain()` for default argv, direct-entry detection, and final exit-code
assignment. `commander.ts` and business modules do not read these ambient
sources directly.

### 5.4 Logger and Prompt Ownership

The current `MonorepositoryConsoleLogger` remains the semantic and presentation
boundary. The current prompt adapter remains the interactive terminal-protocol
boundary.

The command runtime:

- creates the parse logger before input is available;
- creates the final invocation logger after presentation options are decoded;
- shares one redaction registry across child loggers and streamed process
  output;
- ensures JSON and silent modes do not accidentally emit human presentation;
- never logs submitted prompt secrets.

Direct `console`, process stream, and `styleText()` presentation remains
confined to approved logger or prompt adapters.

### 5.5 Filesystem Capability

The filesystem capability is async-first and covers the operations production
tooling requires, including:

- text and binary reads and writes;
- atomic or mode-aware writes where required;
- existence and kind inspection;
- directory creation, traversal, copy, move, and removal;
- temporary directories;
- file metadata;
- globbing.

Command policy still owns:

- which paths are valid;
- whether a missing path is acceptable;
- schemas and content validation;
- overwrite and cleanup rules;
- security-sensitive file modes;
- whether an operation is read-only or mutating.

Doctor and Status receive read-only filesystem views. Setup and generators may
receive mutating views.

### 5.6 HTTP Capability

The HTTP capability wraps native `fetch` and provides:

- linked cancellation;
- bounded timeout;
- request method, headers, and body;
- response status, headers, text, bytes, and JSON acquisition;
- bounded error detail;
- optional explicit retry policy.

It does not own repository payload schemas or domain validation.

Examples:

- Doctor retains GET-only reachability classification;
- environment generation retains exp-service mapping validation;
- exchange-rate generation retains Frankfurter response validation and RON
  calculation;
- selfhost retains Cosmos bootstrap status semantics.

There are no implicit global retries. A command may opt into retries only for
an idempotent operation with an explicit bound.

### 5.7 Clock, Delay, and Task Scheduling

The runtime clock provides monotonic time and ISO timestamps. Delay operations
honor the invocation cancellation signal.

The task scheduler provides explicit operations equivalent to:

- ordered parallel execution;
- ordered all-settled execution;
- sequential execution;
- bounded-concurrency mapping.

This centralizes cancellation, ordering, and concurrency limits. Ordinary
`await` remains language-native. The excluded format/lint stack retains
Piscina.

### 5.8 Environment Snapshot

Each invocation receives an immutable environment snapshot containing:

- environment variables;
- current working directory;
- executable path;
- platform;
- architecture;
- TTY and CI indicators.

Business modules do not read or mutate `process.env`. Child-process environment
overrides are applied through the runner without changing the parent snapshot.

### 5.9 Narrow Capability Views

The command object owns the full runtime, but lower-level modules receive only
what they need.

Examples:

- Doctor modules receive the inspection session, read-only files, GET-only
  HTTP, clock, logger, and opaque probe runner;
- Setup phases receive mutation actions, files, prompts, runner, inspection,
  clock, and logger;
- pure parsers receive no runtime;
- renderers receive only the logger and typed data.

This keeps the facade comprehensive without turning every module dependency
into the full runtime.

---

## 6. Generic Runner and Execa Adapter

### 6.1 Generic Runner Protocol

`scripts/common/runner.ts` defines an engine-neutral protocol:

```typescript
interface Runner<TRequest, TOptions, TOutcome> {
  run(
    request: Readonly<TRequest>,
    options?: Readonly<TOptions>,
  ): Promise<TOutcome>;
}
```

The first implementation is an external-process runner. The generic contract
leaves room for a future Piscina adapter, but this RFC does not implement or
migrate one.

### 6.2 Process Request

The engine-neutral process request retains argument separation:

```typescript
interface ProcessRequest {
  readonly command: string;
  readonly args: readonly string[];
}
```

Shell strings are not part of the public request contract.

### 6.3 Process Options

The process options support:

- working directory;
- environment overrides;
- `capture`, `tee`, and `inherit` output;
- optional stdin payload;
- timeout;
- cancellation signal;
- logger for tee output.

A scoped runner can apply invocation, phase, or command defaults:

```typescript
const phaseRunner = runtime.runner.scope({
  cwd: paths.root,
  logger: phaseLogger,
  signal: runtime.signal,
  timeoutMs: 120_000,
  logCommands: options.verbose,
});
```

Explicit call options override scoped defaults.

### 6.4 Discriminated Process Outcomes

The flag-based `CommandResult` is replaced by a discriminated outcome:

```typescript
interface ProcessOutput {
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
}

type ProcessOutcome =
  | (ProcessOutput & {
      readonly kind: "succeeded";
      readonly exitCode: 0;
    })
  | (ProcessOutput & {
      readonly kind: "exited";
      readonly exitCode: number;
    })
  | (ProcessOutput & {
      readonly kind: "signalled";
      readonly signal: NodeJS.Signals;
    })
  | (ProcessOutput & {
      readonly kind: "spawn-failed";
      readonly message: string;
    })
  | (ProcessOutput & {
      readonly kind: "timed-out";
      readonly signal?: NodeJS.Signals;
    })
  | (ProcessOutput & {
      readonly kind: "cancelled";
      readonly signal?: NodeJS.Signals;
    });
```

Callers switch on `kind`; they do not reconstruct transport state from
independent fields. `exited` represents a nonzero numeric exit code.
`signalled` represents child termination by a signal that was not caused by
the invocation's cancellation signal or timeout. Adapter configuration and
programmer errors are typed runner failures; they are not misreported as
child-process outcomes.

Outcome mapping uses this precedence: a pre-aborted or linked caller signal is
`cancelled`; an elapsed runner timeout is `timed-out`; an unrelated child
signal is `signalled`; exit code `0` is `succeeded`; a nonzero numeric code is
`exited`; and failure to start the process is `spawn-failed`.

### 6.5 Inspection and Required-success Policies

The process runner exposes two semantic paths:

1. `run()`
   - returns a process outcome for every child-process lifecycle result;
   - suitable for probes, npm audit/outdated JSON, and commands where a
     nonzero exit has business meaning.
2. `expectSuccess()`
   - returns the successful output;
   - throws a typed `RunnerError` for every other outcome;
   - suitable for installs, generation, documentation extraction, image
     operations, and Newman execution.

The command lifecycle owns the final handling of `RunnerError`.

### 6.6 Shared Process Diagnostics

`runner.ts` owns:

- safe command formatting;
- success and transport classification;
- stderr/stdout/spawn-failure precedence;
- bounded excerpts;
- structured evidence generation;
- redacted `RunnerError`;
- command-result test builders where useful.

This removes duplicated helpers from Setup, Status, container preflight,
documentation assembly, E2E, workers outside the exclusion, and artifact
extraction.

### 6.7 Execa Implementation

`scripts/common/runner.execa.ts` owns the configured reusable Execa instance.
Its stable defaults include:

- `reject: false`;
- `shell: false`;
- `cleanup: true`;
- `windowsHide: true`;
- `stripFinalNewline: false`;
- authoritative environment merging;
- bounded force-kill behavior.

The adapter also owns:

- capture, tee, and inherit stdio mapping;
- stdin mapping;
- linked cancellation and timeout;
- pre-aborted no-spawn behavior;
- independent UTF-8 decoders for stdout and stderr;
- chunk-safe logger redaction in tee mode;
- Execa result and exception mapping;
- the existing Windows unresolved-command versus resolved `.cmd` shim
  distinction.

Execa types and result shapes do not escape this module.

---

## 7. Lifecycle, Error, and Exit Policy

### 7.1 Standard Exit Meanings

Migrated direct CLIs use:

| Exit code | Meaning |
| ---: | --- |
| `0` | Success or help displayed |
| `1` | Operational or business failure |
| `2` | Usage, option, argument, or command-input validation failure |
| `130` | SIGINT or user-cancelled interactive input |
| `143` | SIGTERM |

`runIfMain()` is the only migrated production lifecycle that requests a final
process exit code, and it delegates the assignment to the production
`CommandProcessHost`.

### 7.2 Failure Types

The command lifecycle normalizes failures into:

- usage/input failure;
- operational failure;
- runner failure;
- HTTP failure;
- filesystem failure;
- cancellation;
- unexpected failure.

Command-specific error classes may add safe metadata, but they do not bypass
the common rendering and exit policy.

### 7.3 No Framework-level Silent Degradation

The shared runtime never converts a failure into a success-shaped default.

Only explicit business policy may degrade:

- Status maps an unavailable collector to `null`;
- Doctor maps an unhandled module failure to one failed diagnostic row;
- Setup records independent phase failures and dependency-based skips;
- exchange-rate generation retains its approved per-year continuation policy;
- E2E report cleanup records a cleanup warning while preserving the Newman
  failure.

### 7.4 Cancellation

Each invocation creates one `AbortController`.

Direct CLI runs:

- register SIGINT and SIGTERM;
- abort runner, HTTP, delay, and task operations;
- stop prompts safely;
- run cleanup;
- set `130` or `143`.

Nested invocation links the parent signal and does not register duplicate
process handlers. Standalone programmatic invocation links only the optional
caller signal and never registers process handlers. A child command has its
own controller and cleanup scope as defined in section 5.2.

### 7.5 Cleanup

The runtime exposes a LIFO cleanup registry. Cleanup:

- runs after success, failure, or cancellation;
- completes before the process exit code is written;
- preserves the primary failure;
- aggregates cleanup failures instead of swallowing them;
- supports temporary directories, signal listeners, terminal state, generated
  transient files, and other invocation-owned resources.

### 7.6 Error Detail and Redaction

Command, HTTP, and filesystem failures include enough context to diagnose the
operation without exposing secrets.

The runtime must not include in logs or thrown messages:

- stdin payloads;
- environment values;
- prompt secrets;
- bearer tokens;
- unredacted child output;
- raw envinfo or systeminformation payloads.

Logger redaction remains the final output boundary.

### 7.7 JSON Failure Behavior

JSON success emits exactly one JSON document.

If parsing, context assembly, or execution fails before the document exists:

- the command writes one normalized fatal diagnostic to stderr;
- it emits no fabricated or partial success document;
- it returns a failed command outcome.

---

## 8. Per-command Business Boundaries

| Command family | Business logic retained | Shared mechanics removed |
| --- | --- | --- |
| Documentation assembly | Extractor selection, tier validation, normalization, landing pages, prose mirror rules | Commander lifecycle, parallel tasks, capture runner, filesystem, bounded errors |
| Doctor | Read-only probe allowlist, modules, scoring, evidence, fixed ordering, quick/full policy | CLI parsing, HTTP timeout, task orchestration, runtime state, failure normalization |
| Status | Six-section schema, strict payload parsing, null-on-unavailable policy, dashboard/JSON rendering | CLI shell, process classification, filesystem, task settling, Doctor composition |
| Generate | Selected tasks, ordering, stop-on-first-failure, aggregate summary | CLI shell, child-command composition, logger and exit lifecycle |
| Generate environment | Azure/local source, required keys, secret classification, env content, copy destinations | HTTP, prompts, filesystem, environment, redaction wiring |
| Generate i18n | English source of truth, locale traversal, missing-key insertion, deterministic serialization | Filesystem, runtime paths, logger lifecycle |
| Generate GraphQL | Output location and placeholder behavior until a separate GraphQL design replaces it | Filesystem and entry lifecycle |
| Generate artifacts | Taxonomy/license algorithms, source validation, archive entry rules, output consistency | HTTP, filesystem, process runner, parallel tasks, delay |
| Setup | Phase graph, readiness, mutation scopes, consent, prerequisites, remediation, postconditions | CLI shell, scoped runner defaults, prompts, files, HTTP, clock, interruption mapping |
| E2E | Target/auth policy, collection/environment selection, Newman arguments, report sanitization | CLI shell, inherit runner, files, environment, redaction, cleanup |
| Exchange rates | Year validation, Frankfurter request and schema, RON calculation, merge/write policy | CLI shell, HTTP, filesystem, delay, top-level errors |
| Aspire | Engine selection, preflight, AppHost command/environment | CLI shell, inherit runner, exit handling |
| Compose | File requirement, exact pass-through args, engine adapter | CLI shell, tee runner, failure formatting |
| Image | Target mapping, tags, ports, build args, artifact prerequisite | CLI shell, tee runner, child-command composition |
| Selfhost | Plans, bootstrap order, SQL secret, Cosmos/Azurite rules, Traefik lifecycle | CLI shell, runner, HTTP, files, delay, redaction, cleanup |

### 8.1 Preserved Execution Shapes

- documentation extractors remain parallel, followed by normalization;
- Doctor modules remain independently concurrent with fixed report order;
- generation remains `env -> i18n -> gql -> artifacts`;
- Setup phases remain sequential and dependency-aware;
- Status collectors remain independently all-settled;
- E2E `all` remains sequential;
- exchange-rate years remain sequential with a polite delay;
- selfhost commands remain ordered with storage/bootstrap delays;
- long-running Aspire output remains inherited;
- Compose and image output remains logger-backed tee output.

---

## 9. Inspection, Setup, Doctor, and Status Contracts

### 9.1 Inspection Session

The existing per-invocation inspection session remains. It memoizes immutable
typed observations and supports exact invalidation after Setup mutations.

Inspectors continue to return:

```typescript
type InspectionOutcome<T> =
  | {readonly kind: "available"; readonly value: T; readonly durationMs: number}
  | {readonly kind: "unavailable"; readonly reason: string; readonly durationMs: number}
  | {readonly kind: "invalid"; readonly issues: readonly string[]; readonly durationMs: number};
```

No provider returns raw process output or a success-shaped fallback.

### 9.2 Aggregate Worker Isolation

envinfo and systeminformation remain isolated in the aggregate worker. The
worker:

- accepts no user-selected command or field;
- projects and redacts before emitting;
- emits one validated JSON document;
- is invoked through the process runner with a bounded timeout;
- retains raw host data only in worker memory;
- remains disabled for quick inspection.

Internal inspection workers adopt the same command runtime entry lifecycle,
using silent or JSON presentation as appropriate.

### 9.3 Doctor Read-only Profile

Doctor retains:

- repository read-only behavior;
- opaque named inspection probes;
- no unrestricted runner access in specialist modules;
- GET-only network probing;
- read-only filesystem capabilities;
- bounded evidence;
- score and grade validation;
- module-error degradation.

The runtime profile and architecture tests replace direct import access as the
enforcement mechanism.

### 9.4 Setup Mutation Profile

Setup retains:

- repository, user, and system mutation scopes;
- `--dry-run`;
- `--yes` only for system-scoped approval;
- prompt interruption;
- dependency-based skips;
- exact inspection invalidation;
- postcondition verification;
- independent phase continuation.

The command runtime supplies capabilities; it does not decide whether a
mutation is permitted.

### 9.5 Status Composition

Status invokes Doctor through the Doctor command object:

```typescript
const health = await doctorCommand.invoke(
  {quick: true, verbose: false},
  {
    parent: context,
    presentation: "silent",
  },
);
```

Status does not spawn Doctor, parse Doctor JSON, or call a parallel execution
function. The child runtime reuses `context.runtime.inspection`. Status accepts
both `completed` exit codes, consumes `health.value`, and treats `failed` or
`cancelled` as command-execution failures.

---

## 10. Architecture Enforcement

### 10.1 Architecture Tests Only

The new command/runtime boundary is enforced by focused Vitest architecture
tests using the TypeScript compiler API.

No new ESLint rule is added for this boundary. Existing duplicate tooling
import restrictions may be removed after equivalent architecture tests pass.
General TypeScript, security, React, and repository lint rules remain.

The architecture suite is tightened with each migration cohort. Temporary
compatibility files and an explicit current-debt allowlist keep intermediate
cohorts green; each cohort removes the entries it migrates, and the final
cohort removes the allowlist.

### 10.2 Required Checks

Architecture tests scan production modules and verify:

1. only `runner.execa.ts` imports `execa`;
2. only approved Node runtime adapters import filesystem, fetch, timers, or
   process-control APIs;
3. only logger and prompt adapters access direct console or process streams;
4. migrated commands do not call `process.exit()` or assign
   `process.exitCode`;
5. migrated commands do not implement direct-entry detection manually;
6. migrated commands export command objects and use shared `runIfMain()`;
7. migrated modules do not import the superseded `cli.ts` or `process.ts`;
8. explicit parallel/all-settled/delay orchestration uses runtime tasks and
   clock capabilities;
9. Doctor modules receive only approved read-only and opaque probe
   capabilities;
10. format/lint and their Piscina files are explicit, narrow exclusions;
11. `workers/shell.ts` depends on the generic runner while preserving its
    legacy worker-facing result.

Architecture tests do not replace command behavior tests.

### 10.3 Output Policy

The existing AST output-policy tests remain and are updated for the new file
names and adapters. Direct output remains prohibited outside logger and prompt
boundaries.

---

## 11. Package Ownership

The existing exact dependencies remain authoritative:

| Package | Version | Ownership |
| --- | --- | --- |
| `@nx/devkit` | `23.1.1` | Project discovery and dependency graph |
| `commander` | `15.0.0` | CLI parsing, validation, and help |
| `execa` | `10.0.1` | External process mechanics |
| `envinfo` | `7.21.0` | Generic tooling inventory |
| `systeminformation` | `5.33.6` | Generic host inventory |

No additional package is approved by default.

Commander 15 supports local command objects, `parseAsync()`,
`configureOutput()`, `exitOverride()`, and lifecycle hooks. Execa 10 supports
reusable configured instances, `reject: false`, output modes, timeouts,
cancellation signals, cleanup, and custom verbose integration. Node 24
provides the required fetch, filesystem, timer, signal, and language runtime.

A new package requires:

1. a concrete missing capability;
2. comparison against the existing platform;
3. exact version approval;
4. security and transitive-dependency review;
5. adapter ownership and rollback.

---

## 12. Security and Privacy

### 12.1 Process Safety

- command and arguments remain separate;
- `shell` remains disabled by default;
- stdin and environment are never included in command diagnostics;
- tee output passes through chunk-safe redaction;
- a pre-aborted signal does not start a child process;
- timeout and cancellation terminate descendants according to the Execa
  policy;
- Windows unresolved commands remain distinguishable from resolved command
  shims.

### 12.2 Capability Profiles

The command facade owns all capabilities, but commands receive typed profiles:

- Doctor and Status: read-only files and bounded observational HTTP;
- Setup and generators: mutating files and explicit HTTP methods;
- container commands: process, HTTP, files, delay, and secret redaction;
- inspection workers: bounded JSON output and no interactive prompts.

### 12.3 Sensitive Data

The runtime must keep these values out of logs, reports, and errors:

- user-entered secrets;
- AppHost and SQL secrets;
- E2E bearer tokens;
- environment values classified as secret;
- raw host inventory;
- unbounded third-party response bodies;
- raw process arguments that contain registered sensitive literals.

### 12.4 Repository Mutation

Doctor and Status remain checkout-read-only. Nx workspace data and task cache
remain redirected to operating-system temporary directories.

Setup, generators, documentation assembly, E2E report generation, exchange
rates, and container tooling retain their explicitly documented mutation
boundaries.

---

## 13. Performance

The runtime is created once per invocation. A fresh Commander parser is cheap
and prevents retained state. The Execa implementation uses a configured
instance so stable options are not reconstructed inconsistently.

Task scheduling preserves current parallelism while making ordering and
cancellation explicit:

- no new unbounded fan-out;
- no serialization of currently independent Doctor or Status work;
- no parallelization of consent, rate-limited, or order-dependent workflows;
- no worker thread introduced outside the existing format/lint stack.

The migration must not add a second process execution layer or duplicate
filesystem/HTTP wrappers per command.

---

## 14. Testing Strategy

### 14.1 Characterization First

Before each command cohort migrates, tests characterize:

- accepted options and aliases;
- execution order;
- output mode;
- business exit meaning;
- partial-failure behavior;
- read-only or mutation boundaries;
- redaction;
- cleanup.

The CLI shell may intentionally standardize help, usage errors, and exit
taxonomy. Business behavior changes require a separate explicit decision.

### 14.2 Commander Runtime Tests

Tests cover:

- metadata, usage, examples, and slash aliases;
- help short-circuiting;
- unknown options and invalid arguments;
- async parsing;
- fresh parser state across repeated runs;
- human, JSON, and silent presentation;
- `run()` versus `invoke()`;
- nested command composition;
- completed business output with exit code `1`;
- parent/child cleanup ownership;
- shared lazy inspection reuse;
- linked cancellation;
- SIGINT and SIGTERM exit mapping;
- cleanup order and aggregated cleanup failure;
- fatal JSON-mode behavior;
- logger and runtime injection.

### 14.3 Runner Tests

Tests cover:

- success and nonzero exit;
- signal-only termination;
- spawn failure;
- timeout;
- cancellation;
- pre-aborted no-spawn;
- capture, tee, and inherit;
- stdin;
- environment merge and removal;
- working directory;
- trailing newlines;
- split UTF-8 chunks;
- chunk-split redaction;
- scoped defaults and call overrides;
- `run()` and `expectSuccess()`;
- bounded failure detail;
- Windows unresolved command detection;
- resolved npm/cmd shim classification.

### 14.4 Capability Tests

Tests cover:

- read-only and mutating filesystem views;
- HTTP timeout, cancellation, status, body limits, and explicit retries;
- environment snapshot immutability;
- cancellation-aware delay;
- ordered parallel and all-settled tasks;
- bounded concurrency;
- LIFO cleanup and primary-failure preservation.

### 14.5 Command-family Tests

Existing focused tests migrate to command objects without weakening their
business assertions.

Black-box tests cover each public entrypoint's:

- help;
- invalid input;
- success exit;
- representative failure exit;
- direct-entry behavior.

Doctor read-only, Setup consent/dry-run, Status JSON, E2E redaction,
documentation cleanup, generator ordering, exchange-rate transformation, and
container pass-through contracts remain explicitly tested.

### 14.6 Architecture Tests

The architecture checks from section 10 run with the root tooling test suite.
Tests use current source discovery and explicit exclusions, not a manually
maintained list of every production file.

### 14.7 Cross-platform Validation

Platform branches continue to use injected Windows, Linux, and macOS values in
unit tests. Live validation runs on the available Windows development host.
The lack of a repository-wide live Linux/macOS matrix remains a documented
residual risk.

---

## 15. Migration and Rollback

Implementation uses one plan with eight reversible cohorts.

### 15.1 Cohort 1: Characterize and Guard

- capture current business contracts;
- add the architecture-test harness with an explicit current-debt allowlist;
- define explicit format/lint exclusions;
- record direct platform imports and duplicated lifecycle helpers;
- require every later cohort to remove its migrated entries without leaving
  the committed test suite failing.

### 15.2 Cohort 2: Runner Foundation

- add `runner.ts`;
- add `runner.execa.ts`;
- port process contract tests;
- migrate `workers/shell.ts` to the generic runner while preserving its
  worker-facing `{code, output}` contract;
- add temporary compatibility exports from `process.ts`;
- migrate callers only after outcome parity is proven.

### 15.3 Cohort 3: Command Runtime

- add `commander.ts`;
- add `runtime.ts`;
- add `runtime.node.ts`;
- implement `run()`, `invoke()`, `runIfMain()`, presentation, cancellation,
  cleanup, and exit policy;
- retain `cli.ts` compatibility only while command cohorts migrate.

### 15.4 Cohort 4: Generation and Data

- migrate `generate.ts`;
- migrate environment, i18n, GraphQL, and artifact generators;
- migrate exchange rates;
- replace direct child-module execution with command `invoke()`.

### 15.5 Cohort 5: Doctor, Status, and Inspection

- migrate inspection providers and worker entrypoints to runtime capabilities;
- migrate Doctor to the read-only runtime profile;
- migrate Status;
- replace typed `runDoctor()` composition with `doctorCommand.invoke()`;
- preserve inspection reuse.

### 15.6 Cohort 6: Setup

- migrate Setup and all phase modules;
- replace phase runner wrappers with scoped runner defaults;
- preserve consent, dry-run, invalidation, and postcondition behavior;
- preserve interruption mapping.

### 15.7 Cohort 7: Documentation, E2E, and Containers

- migrate documentation assembly;
- migrate E2E;
- migrate Aspire, Compose, Image, and Selfhost;
- prove capture, tee, inherit, pass-through, long-running cancellation,
  cleanup, and secret redaction.

### 15.8 Cohort 8: Delete and Document

- delete `common/cli.ts` and tests made obsolete by `commander.ts`;
- delete `common/process.ts` after all imports move;
- delete obsolete entry helpers, error helpers, and duplicate result checks;
- delete unused `runWithSpinner()` if format/lint no longer consume it;
- remove duplicate ESLint import-boundary configuration after architecture
  tests cover it;
- update `scripts/README.md`, `DEVELOPMENT.md`, command help examples, and this
  RFC.

### 15.9 Rollback

Compatibility exports keep each intermediate cohort reversible.

If a cohort fails:

1. retain the new shared foundation;
2. revert only that command cohort to its compatibility imports;
3. keep prior migrated cohorts operational;
4. do not remove old files until every caller and test has moved.

No cohort changes package script names or requires a root CLI.

---

## 16. Alternatives Considered

### 16.1 Inheritance-heavy God Command

One base class would directly implement Commander, logger, HTTP, filesystem,
runner, tasks, environment, and errors.

Rejected because it:

- couples unrelated capabilities;
- weakens Doctor's read-only boundary;
- makes tests mock or subclass one large object;
- encourages shared mutable state;
- turns the base class into repository business infrastructure.

### 16.2 Pure Declarative Host Without Capability Kernel

Scripts would export descriptors consumed by one generic host, while support
modules continued to use ambient Node and process APIs.

Rejected because it makes entry files smaller without solving the deeper
infrastructure boundary.

### 16.3 Explicit Command Subclass Per Script

Every script would subclass an abstract command and override lifecycle hooks.

Rejected as the default authoring surface because it adds repetitive
constructors and overrides. The declarative concrete host provides the same
typed lifecycle with less ceremony.

### 16.4 One Root CLI

A root command would register all scripts as subcommands.

Deferred because current npm scripts are clear, independent, and used by
automation. The command objects can be composed into a root CLI later without
changing their business implementation.

### 16.5 New TUI Framework

Clack, Listr, or a similar package could standardize prompts and progress.

Rejected because the current logger and prompt adapters already own redaction,
JSON suppression, terminal behavior, and tested output policy. Replacing them
does not solve the command-runtime problem.

### 16.6 Unified Execa and Piscina Runner Now

The generic runner could immediately model both external processes and worker
threads.

Deferred because their lifecycle, cancellation, serialization, output, and
failure semantics differ. Format and lint require a separate approved design.

---

## 17. Documentation Requirements

Implementation updates:

- `scripts/README.md`;
- `DEVELOPMENT.md`;
- command help and examples;
- architecture-test documentation;
- any JSDoc that names `createToolProgram`, `CommandRunner`,
  `defaultCommandRunner`, or `process.ts`;
- this RFC when implementation refines a public contract.

The RFC index keeps RFC 0002 as the canonical process/tooling architecture
record.

---

## 18. Success Criteria

The redesign is complete when:

1. every included direct entrypoint exports a declarative command object;
2. direct execution uses shared `runIfMain()` and no migrated script calls
   `process.exit()` or assigns `process.exitCode`;
3. command composition uses typed `invoke()`, not sibling subprocesses or
   parallel execution functions;
4. all included production filesystem, HTTP, process, timer, environment, and
   explicit concurrency access flows through approved runtime adapters;
5. every external command flows through the generic runner and Execa adapter;
6. process outcomes are discriminated and duplicate success/transport checks
   are removed;
7. Execa types do not escape `runner.execa.ts`;
8. Doctor remains repository-read-only and its modules retain opaque probes;
9. Setup retains consent, dry-run, invalidation, and postcondition behavior;
10. Status retains nullable degradation and single-document JSON behavior;
11. generator, documentation, E2E, exchange-rate, and container business
    contracts remain covered;
12. logger redaction prevents secrets from reaching command, HTTP, filesystem,
    or process diagnostics;
13. format/lint and their Piscina workers remain behaviorally unchanged;
14. `workers/shell.ts` uses the generic runner without changing its public
    worker contract;
15. compatibility `cli.ts` and `process.ts` are removed after the final cohort;
16. command runtime, runner, capability, architecture, command-family, and
    black-box tests pass;
17. the repository builds and type-checks with no explicit TypeScript `any`.

---

## 19. Future Work

The following are intentionally deferred:

- a Piscina implementation of the generic runner;
- migration of format and lint;
- a root `arolariu` CLI composed from command objects;
- live Windows/Linux/macOS tooling validation in CI;
- a separately exportable command-runtime package;
- structured machine-readable error documents for every JSON-mode command;
- replacing the GraphQL placeholder with a separately designed generator.

---

## 20. References

- [Commander.js](https://github.com/tj/commander.js)
- [Execa](https://github.com/sindresorhus/execa)
- [Nx Devkit](https://nx.dev/reference/core-api/devkit/documents/createProjectGraphAsync)
- [envinfo](https://github.com/tabrindle/envinfo)
- [systeminformation](https://systeminformation.io/)
- [`scripts/README.md`](../../scripts/README.md)
- [`AGENTS.md`](../../AGENTS.md)

---

**Document Version**: 2.0.0
**Last Updated**: 2026-09-01
**Status**: Accepted
