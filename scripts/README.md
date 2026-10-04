# Root Tooling Scripts

The root [`package.json`](../package.json) owns the supported npm commands that invoke this directory. Root scripts coordinate repository
tooling; the declarative command runtime, capability kernel, and process runner belong in [`common`](./common), container runtime behavior
belongs in [`container-runtime`](./container-runtime), the Effect platform layer that replaces them belongs in [`platform`](./platform),
and worker entry points belong in [`workers`](./workers).

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

[`cli.ts`](./cli.ts) is the single command entrypoint (`node scripts/cli.ts <command>`), recorded as
[RFC 0002 §21.5](../docs/rfc/0002-lean-monorepo-tooling-architecture.md#215-cli-topology). It builds the `arolariu` root command with
`effect/cli`, owns all argv parsing, and starts the program once with `NodeRuntime.runMain`. Every npm script is an alias of one command
path, for example `"doctor": "node scripts/cli.ts doctor"` and `"generate:artifacts": "node scripts/cli.ts generate artifacts"`.

### Command tree

```text
arolariu setup [--dry-run] [--yes] [--engine <rancher|podman>]
arolariu doctor [--quick]
arolariu status
arolariu generate [env] [i18n] [gql] [artifacts]       variadic task names; none selected warns that nothing is selected (exit 0); the first failing task stops the run (exit 1)
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

Pass arguments through npm after `--`: `npm run doctor -- --quick --json`, `npm run rates:update -- --year 2025`. A command group run
without a subcommand (`arolariu`, `arolariu docs`) prints its help. Slash aliases (`/h`, `/v`, `/q`, `/?`, …) no longer exist.

### Global flags

Global flags are accepted before or after the subcommand.

| Flag | Meaning |
|------|---------|
| `--json` | Writes exactly one JSON document to stdout per invocation, usage failures included; human output is suppressed and effect/cli help/error text goes to stderr |
| `--verbose` | Also emits debug diagnostics. It has no short form: `-v` is `--version` |
| `--log-level <level>` | effect/cli's minimum Effect log level (`all`, `trace`, `debug`, `info`, `warn`, `error`, `fatal`, `none`) |
| `--help`, `-h` | Prints effect/cli help for the selected command |
| `--version`, `-v` | Prints the root `package.json` version |
| `--completions <bash\|zsh\|fish\|sh>` | Prints an effect/cli shell completion script; PowerShell is not supported |
| `--wizard` | effect/cli's interactive wizard for building a command line |

### Exit codes

[`platform/exit.ts`](./platform/exit.ts) `exitCodeFor` is the only exit-code mapping, and only `cli.ts` calls it:

| Exit | Outcome |
|------|---------|
| `0` | Success, including `--help`, `--version`, and `--completions` |
| `1` | `ReportedFailure{exitCode: 1}` (a business-negative result, such as doctor with a failing check, after its full output), a typed failure, or a defect |
| `2` | A `CliError` usage or parse failure, or `ReportedFailure{exitCode: 2}` (for example legacy `CommandInputError`) |
| `130` | Interruption after `SIGINT`, interruption with no recorded signal, or a terminal quit |
| `143` | Interruption after `SIGTERM` |

`cli.ts` renders any failure that no command reported as `[arolariu::cli] ⛔ <message>` on stderr, followed for a process failure
(`ProcessExited`/`ProcessSignalled`/`ProcessSpawnFailed`/`ProcessTimedOut`) by its bounded `stdout: …` and `stderr: …` evidence lines, as
the legacy failure diagnostic did; in JSON mode it renders `{status: "failed", kind, message, evidence}` on stdout. No script calls
`process.exit()`.

### Adding a subcommand

1. Create `commands/<family>/cli.ts` exporting `make<Family>Command(...): CliSubcommand` (see
   [`commands/rates/cli.ts`](./commands/rates/cli.ts)). Build it with `Command.make`, declare its flags and arguments with `Flag`/`Argument`,
   and wrap the handler program in `withCommandOutput("<context>")` from [`commands/flags.ts`](./commands/flags.ts), which provides the
   per-invocation `OutputSettings`, `Presenter`, and `Process` from `--json`, `--verbose`, and the environment.
2. Give the factory a typed seam (for example the legacy invoker) so its colocated `cli.test.ts` can run the command without a real boundary;
   a family migrated to Effect needs no seam: its `cli.test.ts` runs `runCli` on `makeTestLayer` (see [`commands/generate/cli.test.ts`](./commands/generate/cli.test.ts)).
3. Register the factory in the `rootCommand` list of [`cli.ts`](./cli.ts) and add the npm alias to the root `package.json`.

`CliSubcommand` restricts handler requirements to the base services plus the `--json`/`--verbose` settings, so a family that forgets to
provide a service fails to compile. Only `scripts/commands/**`, `cli.ts`, `platform/exit.ts`, and `platform/Prompts.ts` import
`effect/cli` (enforced by [`runtime-boundary.test.ts`](./common/runtime-boundary.test.ts)).

### Legacy command kernel (until cohort 7)

Every root script that has not yet migrated to Effect, except the format/lint pair, is still one declarative legacy command object built on
[`common/commander.ts`](./common/commander.ts) and one injected capability kernel from [`common/runtime.ts`](./common/runtime.ts). Those
commands no longer parse argv: their family `cli.ts` decodes the typed input and [`commands/legacy.ts`](./commands/legacy.ts) `runLegacy`
reaches them only through `invoke(input, {presentation, signal})`. `invoke()` also remains the way legacy commands compose until cohort 7
deletes the kernel. The rest of this section documents that kernel.

#### Command definition anatomy

A command is a `CommandDefinition<TInput, TOutput>` handed to `MonorepoCommand`. Each member owns exactly one concern:

| Member | Owns |
|--------|------|
| `metadata` | `name`, used as the logger context and in lifecycle diagnostics |
| `execute(context, input)` | Runs business orchestration against `context.runtime` capabilities only |
| `completion(output, context)` | Maps completed business output to `{exitCode, human?, json?}` |

```typescript
export function createExampleCommand(
  runtimeFactory?: CommandRuntimeFactory,
): MonorepoCommand<ExampleInput, ExampleResult> {
  return new MonorepoCommand<ExampleInput, ExampleResult>(
    {
      metadata: {name: "example"},
      execute: runExample,
      completion: (result) => ({exitCode: 0, human: (logger) => logger.success(result.summary)}),
    },
    runtimeFactory,
  );
}
```

Business code never reads `process.argv` and never writes `process.exitCode`. Semantically invalid typed input throws
`CommandInputError`, which the lifecycle maps to a `usage` failure with exit code `2`.

#### Production singletons and typed factory seams

Each command module exports a `create<Name>Command(...)` factory and one production singleton built from it:

```typescript
export const statusCommand: MonorepoCommand<StatusInput, StatusDocument> = createStatusCommand();
```

The factory is the deterministic test seam. It accepts either a `CommandRuntimeFactory` directly or a small `dependencies` object
carrying one, so a test replaces the whole capability kernel instead of mocking repository modules:

```typescript
const command = createStatusCommand({runtimeFactory: createTestRuntimeFactory({runner, files}), doctor: fakeDoctor});
```

[`common/runtime.testing.ts`](./common/runtime.testing.ts) owns those typed fakes — a scripted process runner, in-memory logger sink,
fixture filesystem, deterministic clock, and stub inspection session. It is test infrastructure and is excluded from coverage.

#### `invoke()`

`invoke(input, options?)` runs the command from typed input. It never registers an OS signal handler, never assigns an exit code, and
defaults to `"silent"` presentation; `options.presentation` selects `"human"` or `"json"`, and `options.signal` links a caller abort.

Only [`cli.ts`](./cli.ts), [`format.ts`](./format.ts), [`lint.ts`](./lint.ts), and the two inspection workers
([`inspection/aggregate-worker.ts`](./inspection/aggregate-worker.ts) and [`inspection/workspace.worker.ts`](./inspection/workspace.worker.ts))
start a process. Each worker's `import.meta.main` block only calls `runWorker(<worker definition>)`
([`platform/worker.ts`](./platform/worker.ts)), which decodes its argv with the worker's `decodeWorkerArgs`, writes the single JSON
document, and maps the exit code. No script calls `process.exit()`.

`invoke()` is also how commands compose. `commands/status/index.ts` runs doctor as a typed child (`doctorCommand.invoke({quick: true, verbose: false},
{parent: context, presentation: "silent"})`) rather than spawning a sibling process or parsing JSON.

#### Invocation outcomes

`invoke()` never throws across the command boundary; it returns a discriminated `CommandExecution<TOutput>`:

| `status` | `exitCode` | Meaning |
|----------|-----------|---------|
| `completed` | `0` or `1` | Business execution finished and produced typed `value` |
| `failed` | `1` or `2` | `usage` (`2`), or `operational`/`cleanup`/`internal` (`1`) |
| `cancelled` | `130` or `143` | SIGINT / SIGTERM or a linked caller abort |
| `help` | `0` | Reserved for help output; `invoke()` never produces it, and `runLegacy` treats it as success |

A **completed exit `1` is not an error**. It is the normal way a command reports a negative business result while still returning typed
output: doctor completes with `exitCode: 1` and a full `DoctorReport` when a check fails, and the caller may still read
`execution.value`. Reserve `failed` for conditions that produced no usable output.

`CommandFailure` carries a `kind`, a redacted `message`, bounded `evidence` lines, and the original `cause`. Cleanup evidence is appended
to the failure that caused it rather than replacing it.

#### Runner outcomes and `expectSuccess()`

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

#### Capability profiles and child scope ownership

`context.runtime` is the only source of effects. It carries `logger`, `prompts`, `runner`, `http`, `files`, `clock`, `tasks`,
`inspection`, `environment`, `signal`, and `cleanup`. [`common/runtime.node.ts`](./common/runtime.node.ts) is the single production
adapter that implements them; it is the only production module allowed to import `node:fs`, `node:os`, or `node:timers`, to call bare
`fetch`/`setInterval`, to read `process.env`/`process.cwd()`, to register SIGINT/SIGTERM, or to assign `process.exitCode`.

Narrow a capability before handing it to a consumer that must not widen it: `asReadOnlyFileSystem()` and `asGetOnlyHttpClient()` produce
the legacy read-only profiles. The Effect-native doctor instead declares its read-only profile as a requirement type (see
[Read-only command policy](#read-only-command-policy)), and `inspection/probes.ts` produces the opaque, allowlisted probe runner.

A **root scope** snapshots the environment once and owns its logger and prompts; `invoke()` never asks it to register process signals.
A **child scope** created by `invoke({parent})` reuses the parent's immutable environment, prompts, and inspection registry, and receives
its own forked logger, invocation runner, cancellation controller, and cleanup registry. Cancellation always flows parent to child and
never child to parent.

#### JSON, human, and silent output

Presentation is decided from typed input before any capability exists, and rendering is deferred to `completion()`:

- **human** — `completion.human(logger)` runs; semantic and presentation methods are live.
- **json** — `completion.json` is serialized exactly once through `logger.json()`. A JSON-mode command that omits `json` is an internal
  failure rather than a silently empty document. A fatal error writes exactly one plain redacted line to standard error so no partial
  success document is emitted.
- **silent** — nothing is rendered, including failure diagnostics. This is the default for composed `invoke()` calls, whose caller owns
  presentation.

#### Cancellation and cleanup

`runtime.signal` is the single cancellation source: SIGINT maps to `CommandCancellation(…, 130)`, SIGTERM to `143`, and a linked caller
signal propagates the same way. Long-running work passes `runtime.signal` into the runner, the HTTP client, and `clock.delay()` instead
of polling.

`runtime.cleanup` is a LIFO registry. Register a compensating action as soon as the resource exists:

```typescript
context.runtime.cleanup.register("temporary compose file", () => files.remove(composeFile));
```

The lifecycle drains the registry **before** rendering the completion, so a cleanup failure can still change the outcome. Every cleanup
entry runs even when an earlier one throws; each failure becomes bounded evidence on the reported failure.

#### Sensitive values

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

## Platform layer (Effect)

[`platform/`](./platform) is the Effect v4 replacement for the command runtime above, recorded as the draft
[RFC 0002 revision 3](../docs/rfc/0002-lean-monorepo-tooling-architecture.md#21-revision-3-effect-platform). Commands migrate to it
family by family; until then it runs beside the legacy kernel. Every service key is `"arolariu/scripts/<ServiceName>"`.

- [`Environment`](./platform/Environment.ts) — immutable snapshot of variables, cwd, platform, architecture, CI, and TTY flags.
- [`exit.ts`](./platform/exit.ts) — `ReportedFailure` and `exitCodeFor`, the single exit-code mapping (`0`, `1`, `2`, `130`, `143`).
- [`signals.ts`](./platform/signals.ts) — records whether `SIGINT` or `SIGTERM` ended the run, so interruption maps to `130` or `143`.
- [`Output.ts`](./platform/Output.ts) — `Sink` (the only direct stream writer), `OutputSettings`, the Effect logger
  (`[arolariu::<context>]` lines, human/JSON/silent), and `Presenter` (`success`, `fatal`, `line`, `write`, `section`, `banner`, `table`,
  `progress`, `json`).
- [`Process`](./platform/Process.ts) — child processes over `ChildProcessSpawner` with capture/tee/inherit output, stdin, timeout, command
  echo, bounded evidence (`failureOutput: "full"` keeps a failure's whole captured output for callers that parse it, such as
  `npm ls --json`), and typed `ProcessExited`/`ProcessSignalled`/`ProcessSpawnFailed`/`ProcessTimedOut` failures;
  [`windows.ts`](./platform/windows.ts) resolves and escapes `.cmd` shims.
- [`Files.ts`](./platform/Files.ts) — `Glob`, read-only `ReadOnlyFiles`, `GetOnlyHttp`, `TemporaryDirectories` (a scope-owned
  temporary directory, removed when the scope closes), `writeTextAtomic`, and `readBytesBounded`.
- [`Inspection`](./inspection/Inspection.ts) — shares one memoized repository inspection session per request
  (`repositoryInspectionRequestKey`) for the invocation; a request whose key is used by a different request dies with the legacy
  conflict message. Sessions ([`inspection/session.ts`](./inspection/session.ts)) run each fact's provider once in the session scope,
  and [`inspection/probes.ts`](./inspection/probes.ts) `inspectionProbeRunner` reports every probe completion as `ProbeOutcome` data.
  Every provider is an Effect over `ReadOnlyFiles`, `TemporaryDirectories`, `Process`, and `Environment`
  ([`inspection/files.ts`](./inspection/files.ts) keeps the `ENOENT`/`missing` observation vocabulary): its processes run as child
  fibers and its temporary directories live in its own scope, so interrupting a session stops the processes before the directories go.
- [`Prompts`](./platform/Prompts.ts) — `confirm`, `select`, `text`, and `secret` (returned as `Redacted<string>`) over effect/cli
  `Prompt`. Without an interactive stdin it never reads input: `confirm`/`select` return their default when one is given, and every
  other prompt fails with `PromptUnavailable` carrying the legacy `Cannot request <kind> without an interactive terminal…` message.
- [`layers.ts`](./platform/layers.ts) — `makeNodeLayer` (production), built from `NodeBaseLayer` and the per-invocation `commandLayer`
  (output services, `Process`, and `Inspection`).
- [`testing.ts`](./platform/testing.ts) — `makeTestLayer` (in-memory files and temporary directories, scripted processes, HTTP, and
  prompts, recording sink, fixed environment, `TestClock`) with `output()`, `processCalls()`, `httpCalls()`, and `files()` accessors,
  and `effectTest`. `fileSystem: "node"` serves files, glob, and temporary directories from the real filesystem instead (for fixtures
  in a real temporary directory, such as symbolic links), and `scriptedOutcomes(respond)` answers every process request from a
  `ProbeOutcome`-returning responder that sees `{cwd, env, timeoutMs, output}`. Scripted prompts follow the same TTY rule as `Prompts`; with `environment: {stdinIsTTY: true}` they consume
  `prompts` answers in order. With `inspection: {<key>: outcome}`, `Inspection` returns a scripted session that dies with
  `unscripted inspection: <key>` for any other key; otherwise `InspectionLive` runs over the harness services.
- [`worker.ts`](./platform/worker.ts) — `runWorker` runs a child-process worker (`decode` → `program` → `encode`) with
  `NodeRuntime.runMain` over the JSON-mode node layer, writes its single document through `Presenter.json`, and exits through
  `exitCodeFor` (a decode throw is a usage failure, exit `2`, with nothing on stdout); `runWorkerProgram` is its testable core.
- [`bridge.ts`](./platform/bridge.ts) — temporary interop with the legacy kernel (below).

Write a platform test with one harness per test; unscripted processes, HTTP requests, prompts, and spawns die instead of reaching a real
boundary:

```ts
const harness = makeTestLayer({
  processes: [{match: (request) => request.command === "git", respond: {stdout: "main\n", stderr: "", durationMs: 1}}],
});
effectTest("reads the current branch", () => Effect.gen(function* () {
  const result = yield* (yield* Process).run({command: "git", args: ["branch", "--show-current"]});
  expect(result.stdout).toBe("main\n");
  expect(harness.processCalls()).toHaveLength(1);
}), harness.layer);
```

The bridge works in both directions. `runEffect(program, options)` lets a legacy Promise command run an Effect program on a fresh
`makeNodeLayer`, turning its `AbortSignal` into fiber interruption. `legacyInvoker(context, program, exitCodeOf)` exposes a migrated Effect
program as a legacy `CommandInvoker`, so unmigrated callers compose it unchanged. The bridge is the only platform module that may import
the legacy kernel, and cohort 7 deletes it.

Until cohort 7 converts the shared Promise helpers (`resolveRepositoryPaths`, `loadRepositoryRequirements`, `readToolingConfig`,
`writeToolingConfig`), Effect code hands them legacy-shaped capabilities from the bridge: `legacyReadOnlyFiles` and `legacyFileSystem`
are Promise views over `ReadOnlyFiles` and `FileSystem`/`Path`/`Glob` that capture the current context, and `legacyTaskScheduler` is a
shared `DefaultTaskScheduler`, so a family never value-imports `common/runtime.ts`. The views reject with a legacy `FileSystemError`
whose `code` is the underlying Node code, or the mapped platform reason (`NotFound` → `ENOENT`, …) when there is none
(`toLegacyFileSystemError`), so helpers that branch on `ENOENT` keep working on the in-memory harness:

```ts
const files = yield* legacyReadOnlyFiles;
const paths = yield* Effect.promise(() => resolveRepositoryPaths(import.meta.url, files));
```

The legacy commands still on the command runtime (Status until Task 4.5, Setup until cohort 5) reach the Effect
`Inspection` service through `createLegacyInspectionRuntime`: `createNodeRuntimeScope` builds one per root scope (one `ManagedRuntime`
over a silent `makeNodeLayer`), exposes it as `runtime.inspection`, and registers its `dispose` in the scope's cleanup registry. Its
`getRepositorySession` is synchronous and keeps the legacy semantics — one `LegacyRepositoryInspectionSession` per request key, the
legacy conflict error thrown synchronously, `invalidate`/`updateInfrastructureEngine` applied before any later `inspect`, and an aborted
scope signal rejecting with its `CommandCancellation`.

[`runtime-boundary.test.ts`](./common/runtime-boundary.test.ts) sanctions `scripts/platform/**` — like `runtime.node.ts` — as an owner of
ambient `process.*`, timer, and `node:*` access, and enforces the platform and CLI rules: `@effect/platform-node` is imported only inside
`scripts/platform/` and the [`cli.ts`](./cli.ts) entrypoint; Effect runtimes (`Effect.run*`, `ManagedRuntime.make`, `NodeRuntime.runMain`)
start only in `cli.ts`, `platform/worker.ts`, `bridge.ts`, `testing.ts`, and `Output.ts`'s synchronous logger sink; no platform module except `bridge.ts`
imports the legacy kernel; `effect/cli` is imported only under `scripts/commands/`, by `cli.ts`, by `platform/exit.ts`, and by
`platform/Prompts.ts`; the effect-native families (`scripts/commands/{generate,rates,docs}/**`, tests included) never import a value from
the legacy kernel (`common/{runtime,runtime.node,commander,runner,logger,prompts}.ts` or the `common/index.ts` barrel) — a clause-level
`import type` stays allowed until cohort 7; and the only modules with an `import.meta.main` block are `cli.ts`, `format.ts`, `lint.ts`, and the two
inspection workers. Inside that block, `cli.ts` may read `process.argv` and no other ambient state (the exemption does not apply
elsewhere in the file), and each inspection worker's block consists of exactly one `runWorker(...)` call.

## Output-policy exemptions

The logger sink implementation in [`common/logger.ts`](./common/logger.ts) is the sole owner of semantic and non-interactive presentation
output. The interactive terminal-protocol adapter in [`common/prompts.ts`](./common/prompts.ts) is a separate narrow exemption because
readline, visible input echo, cursor state, validation feedback, and non-echoing secret entry must share one writable terminal stream.
That adapter may emit only prompt labels, questions, choices, validation feedback, and terminal-control newlines; lifecycle diagnostics and
submitted secret values remain forbidden there. The platform `Sink` in [`platform/Output.ts`](./platform/Output.ts) is the Effect
counterpart of the logger sink and holds the same exemption.

[`output-policy.test.ts`](./common/output-policy.test.ts)'s AST guards enforce these boundaries, including property, direct-function, and
destructured aliases. [`runtime-boundary.test.ts`](./common/runtime-boundary.test.ts) enforces the wider runtime boundary — Execa and
child-process imports, ambient filesystem/HTTP/timer/environment/OS-state access, direct process exit, manual direct-entry detection,
explicit concurrency, doctor capability width, the exact six format/lint exclusions, and the platform-layer rules above. The root ESLint
configuration provides immediate feedback for direct output syntax. Direct console/process-stream output stays confined to the logger
sinks, while injected `output.write(...)` prompt presentation stays confined to the prompt adapter. No exemption includes a script entry
point.

Every legacy production script under root `scripts/**` — including [`setup.ts`](./setup.ts) and
[`commands/status/index.ts`](./commands/status/index.ts) — routes its presentation and semantic output through `MonorepositoryConsoleLogger`; the
Effect-native families (generate, rates, docs, and doctor) route it through the platform `Presenter` and logger. There are no remaining
transitional setup/doctor/status exceptions.

## Generate, rates, and docs (Effect-native)

The `generate`, `rates`, and `docs` families run as native Effect programs on the [platform layer](#platform-layer-effect). Each
`commands/<family>/cli.ts` decodes its flags, runs the family program inside `withCommandOutput("<context>")`, and renders the completion
through `Presenter`. With `--json`, the family's typed result is the single stdout document; a business-negative run (a stopped `generate`,
or `rates update` with failed years) still writes that document before exiting `1`, while a typed failure is rendered by `cli.ts` as
`{status: "failed", …}`. Typed failures are `Schema.TaggedError` classes in each family's `errors.ts`; process failures stay
`ProcessError`. Where a shared Promise helper needs a legacy capability (docs passes `legacyReadOnlyFiles` to `resolveRepositoryPaths`),
the family takes it from the bridge, so none of these modules value-imports the legacy kernel.

### Module map

| Module | Responsibility |
|--------|----------------|
| [`commands/generate/cli.ts`](./commands/generate/cli.ts) | `generate [env] [i18n] [gql] [artifacts]`; renders the stop line or the success lines |
| [`commands/generate/index.ts`](./commands/generate/index.ts) | `runGenerate` orchestrator: runs the selected leaves silently, one at a time, in the fixed order `env`, `i18n`, `gql`, `artifacts` |
| [`commands/generate/env.ts`](./commands/generate/env.ts) | Website `.env`: exp build-time configuration with `INFRA=azure`, otherwise prompts for each missing required key; secrets stay `Redacted` |
| [`commands/generate/i18n.ts`](./commands/generate/i18n.ts) | Synchronizes `ro`/`fr` locale files with the English source, adding missing keys as empty strings |
| [`commands/generate/gql.ts`](./commands/generate/gql.ts) | Writes the GraphQL placeholder artifact under `scripts/__generated__/gql` |
| [`commands/generate/artifacts.ts`](./commands/generate/artifacts.ts) | Taxonomy and license artifacts from pinned sources, with bounded retries and a validated cached-mirror fallback |
| [`commands/rates/cli.ts`](./commands/rates/cli.ts) | `rates update [--year <y>] [--from <y>] [--to <y>]`; invalid years are usage failures (exit `2`) |
| [`commands/rates/update.ts`](./commands/rates/update.ts) | `updateExchangeRates`: yearly Frankfurter averages merged into `sites/arolariu.ro/public/data/exchange-rates.csv` |
| [`commands/docs/cli.ts`](./commands/docs/cli.ts) | `docs assemble`; renders the extractor and tier summary |
| [`commands/docs/assemble.ts`](./commands/docs/assemble.ts) | `assembleDocumentation`: concurrent TypeDoc, pydoc-markdown, and DefaultDocumentation runs, tier validation, landing pages, prose mirroring |
| [`commands/docs/normalize.ts`](./commands/docs/normalize.ts) | Fills missing Docusaurus frontmatter (`title`, `sidebar_position`) without overwriting existing keys |

### Behavior

- **`npm run generate -- <tasks…>`** (aliases `generate:env`, `generate:i18n`, `generate:gql`, `generate:artifacts`) logs
  `Running <label>...` and each leaf summary. The first typed failure, or an i18n run that changed locale files, stops the run with
  `Generation stopped at the <task> task.` (exit `1`); otherwise it prints `All requested generation tasks completed.` and the executed
  count. Without a task it warns `No generation tasks selected. Nothing to do.`, prints the tip
  `Tip: Pass one or more tasks (e.g. npm run generate -- env i18n gql artifacts).`, and exits `0`. The JSON document is
  `{selected, completed, failed?}`. A terminal quit at an env prompt exits `130`.
- **`npm run rates:update`** (`-- --year 2025`, or `-- --from 2020 --to 2025`) fetches each year from Frankfurter (2018 to the current
  year by default) with a polite delay between requests and prints `Updated <n> of <m> year(s).`. When any year fails it warns with every
  failed year and message and exits `1`. The JSON document is `{years, updatedYears, failedYears: [{year, message}]}`.
- **`npm run docs:assemble`** cleans `sites/docs.arolariu.ro/_generated/`, runs the three extractor families concurrently, and prints
  `Assembled documentation from <n> extractor(s) across <m> tier(s).`. When the pipeline fails or is interrupted it removes the partial
  `_generated` tree again. The JSON document is `{generatedTiers, extractorCount}`.

### Generate, rates, and docs test commands

```powershell
npx vitest run --config scripts\vitest.config.ts --coverage.enabled=false scripts\commands\generate scripts\commands\rates scripts\commands\docs scripts\common\runtime-boundary.test.ts
npx eslint scripts\commands\generate scripts\commands\rates scripts\commands\docs
```

## Setup orchestrator (`npm run setup`)

`npm run setup` runs `arolariu setup` (`--dry-run`, `--yes`, `--engine rancher|podman`, plus the global flags); [`setup.ts`](./setup.ts)
owns the command. It
resolves canonical paths through [`common/repository-paths.ts`](./common/repository-paths.ts), loads manifest-derived runtime and package
requirements through [`common/requirements.ts`](./common/requirements.ts), and reads/writes the non-secret persisted selection at
`.arolariu/tooling.local.json` through [`common/tooling-config.ts`](./common/tooling-config.ts). Setup restores dependencies, prepares
toolchains, and generates checkout artifacts; it never builds, type-checks, tests, or starts/stops a service.

### Module map

| Module | Owns |
|--------|------|
| [`setup.ts`](./setup.ts) | Input decoding, phase ordering, dependency gating, and the exit-code/readiness rollup; [`commands/setup/cli.ts`](./commands/setup/cli.ts) parses its flags |
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
npx vitest run --config scripts\vitest.config.ts --coverage.enabled=false scripts\common\repository-paths.test.ts scripts\common\requirements.test.ts scripts\common\tooling-config.test.ts scripts\common\prompts.test.ts scripts\setup.test.ts scripts\setup.workspace.test.ts scripts\setup.dotnet.test.ts scripts\setup.react.test.ts scripts\setup.svelte.test.ts scripts\setup.python.test.ts scripts\setup.infrastructure.test.ts scripts\commands\generate\env.test.ts scripts\container-runtime\selection.test.ts scripts\common\output-policy.test.ts
npx eslint scripts\setup.ts scripts\setup.types.ts scripts\setup.*.ts scripts\common\repository-paths.ts scripts\common\requirements.ts scripts\common\tooling-config.ts scripts\common\prompts.ts scripts\commands\generate\env.ts scripts\container-runtime
git --no-pager diff --check
```

The full root-tooling suite in [Targeted validation](#targeted-validation) below includes these setup and shared-dependency test files
too; it exercises every common, setup, doctor, inspection, container-runtime, and worker test file under `scripts/`. Doctor, its reporter
and specialist modules, and `commands/status/index.ts` also have a narrower focused command in [Doctor test commands](#doctor-test-commands).

## Doctor diagnostics (`npm run doctor`)

`npm run doctor` runs `arolariu doctor` (`--quick`, plus the global `--json`, `--verbose`, and `--help` flags). Doctor is Effect-native:
[`commands/doctor/index.ts`](./commands/doctor/index.ts) owns `runDoctor`, and [`commands/doctor/cli.ts`](./commands/doctor/cli.ts) renders its
completion. `runDoctor` resolves canonical repository paths and manifest-derived requirements through the bridge's legacy read-only views,
obtains one shared repository inspection session from the `Inspection` service, then runs every bounded-context module concurrently
(`Effect.forEach(..., {concurrency: "unbounded"})`), flattening their results back into a fixed rendering order. Every specialist module
requires only the read-only `DoctorRequirements` profile (`ReadOnlyFiles`, the `GET`-only bounded `NetworkProbe`, `Process` reached through
opaque probes, `Environment`, and `Presenter`) and receives a plain-data `DoctorContext` (input, paths, requirements, the shared inspection
session, and the opaque probe runner). In `--json` mode the report is the single JSON document; a report with any failed check exits `1`
(`ReportedFailure{exitCode: 1}`) after it is rendered.
Doctor is strictly read-only at the repository
and local-tooling boundary: it never mutates repository files, `.nx`, or `.arolariu`, and never installs/upgrades, restores, generates,
starts/stops a service, builds, type-checks, or tests. Approved metadata/status probes may update external package-manager caches or
container-engine client/cache state outside that boundary.

### Module map

| Module | Owns |
|--------|------|
| [`commands/doctor/index.ts`](./commands/doctor/index.ts) | `runDoctor`: module orchestration/ordering, fact prewarming, and module-defect normalization; the temporary `doctorCommand` legacy invoker for status (deleted in Task 4.5) |
| [`commands/doctor/cli.ts`](./commands/doctor/cli.ts) | Flag parsing, the live `NetworkProbe` layer, JSON/human completion, and the exit-code rollup |
| [`commands/doctor/types.ts`](./commands/doctor/types.ts) | Shared `DiagnosticResult`/`DoctorContext`/`DoctorInput`/`DoctorRequirements` contracts and diagnostic-result helpers |
| [`commands/doctor/NetworkProbe.ts`](./commands/doctor/NetworkProbe.ts) | The bounded, `GET`-only `NetworkProbe` service (10 MiB body bound, one deadline for request and body) |
| [`commands/doctor/reporter.ts`](./commands/doctor/reporter.ts) | Stable per-check score weights, schema-v1 validation (`createDoctorReport`), and human rendering through `Presenter` |
| [`commands/doctor/modules/workspace.ts`](./commands/doctor/modules/workspace.ts) | Repository root, git, Node/npm runtime, dependency trees, Nx workspace graph (read from repository metadata, see below), config files, generated artifacts, host capacity, npm audit/outdated |
| [`commands/doctor/modules/dotnet.ts`](./commands/doctor/modules/dotnet.ts) | .NET SDK/host/workloads, NuGet state, solution, local tools, HTTPS certificate trust, AppHost configuration and required local parameters, NuGet feed reachability |
| [`commands/doctor/modules/react.ts`](./commands/doctor/modules/react.ts) | Website packages, workspace link, environment, i18n, taxonomy/licenses, Playwright, framework config |
| [`commands/doctor/modules/svelte.ts`](./commands/doctor/modules/svelte.ts) | CV and status SvelteKit packages, Node engine, scripts, generated `.svelte-kit` state, adapter |
| [`commands/doctor/modules/python.ts`](./commands/doctor/modules/python.ts) | `exp` runtime, virtual environment, pip, requirements, dependency conflicts, PyPI reachability |
| [`commands/doctor/modules/infrastructure.ts`](./commands/doctor/modules/infrastructure.ts) | Container engine selection, CLI/backend/Compose/socket checks, ports, certificates, manifests, known containers |

Modules are invoked independently and concurrently, but `commands/doctor/index.ts` always flattens their results back into the module-map order above
regardless of which module settles first. A module that reads more than one inspection fact declares those facts (`DiagnosticModule.facts`)
so `commands/doctor/index.ts` starts them together (child fibers started immediately, plus `aggregate` in full mode) before the first module
runs; the module then reads each memoized outcome sequentially without ever owning a concurrency primitive of its own. A module defect never
produces a passing or skipped result — it becomes exactly one failed `<module>.module-error` row so the report degrades to one row instead of
losing the whole run.

### Stable result contract

Every check is one `DiagnosticResult`: a stable `id` (module-prefixed, e.g. `workspace.git`), its owning `module`, `name`, `status`
(`pass`/`warn`/`fail`/`skipped`), `summary`, `evidence`, `durationMs`, `fixes`, and exactly one diagnosis form for a `warn`/`fail` row —
either `rootCause` or ranked `potentialCauses` (`high`/`medium`/`low`), never both. [`commands/doctor/reporter.ts`](./commands/doctor/reporter.ts) rejects an
unknown or duplicate `id`, a `warn`/`fail` row missing evidence/fixes/diagnosis, and an ANSI-bearing or empty report string. The completed
`DoctorReportV1` (`schemaVersion: 1`, `score`, `grade`, `summary`, `checks`, `timestamp`) is scored with a stable per-`id` weight: a pass
earns full weight, a warn half, a fail none, and a `skipped` check contributes to neither the earned total nor the denominator.

### Read-only command policy

Every diagnostic command runs through the shared inspection probe runner backed by the allowlisted read-only command set in
[`inspection/probes.ts`](./inspection/probes.ts). Specialist modules never take a `ProcessRunner`, the Node runtime adapter, the Execa
adapter, the mutable `FileSystem`, the unrestricted `HttpClient`, or `Prompts`: `DoctorRequirements` excludes them at compile time.
[`commands/doctor/readonly.test.ts`](./commands/doctor/readonly.test.ts) asserts that exclusion with `expectTypeOf`, AST-scans every Doctor
production module (except `cli.ts`, which provides the live layers) for `FileSystem` imports from `effect`/`effect/FileSystem` and `HttpClient`
imports from `effect/http`, and snapshots `.nx` and `.arolariu` sentinel files to prove real quick and full-profile Doctor runs do not mutate
them. [`runtime-boundary.test.ts`](./common/runtime-boundary.test.ts)'s source-level AST guard rejects the same Effect imports plus
mutation-capable or unrestricted filesystem imports, child-process imports, widened runtime imports, and direct adapter imports across the
Doctor production surface.

No Nx child command is dispatched by doctor or status, and none is allowlisted. Nx always opens (and rewrites) its native workspace
database when it constructs a project graph. `workspace.nx-projects`, `workspace.nx-graph`, and status's `nxEdges` are instead derived
from the shared inspection session's workspace facts, which use an isolated Nx Devkit worker process
([`inspection/workspace.ts`](./inspection/workspace.ts)) that redirects Nx state to a disposable temporary directory.

### Status integration

[`commands/status/index.ts`](./commands/status/index.ts) composes doctor as a typed child command (`doctorCommand.invoke(…, {parent: context, presentation: "silent"})`)
rather than a subprocess. Until status migrates (Task 4.5), `doctorCommand` is a legacy invoker over `runDoctor` that reads the parent
invocation's inspection sessions, so the child still reuses status's own inspection session. Health is the one status section that is **not**
degradation-tolerant: both doctor completion exit codes (`0` and `1`) are ordinary health data, while a `failed`, `cancelled`, or `help`
child outcome is owned by status and becomes a status command failure or cancellation. No dashboard or JSON document is rendered in that
case, so status never reports a fabricated "unavailable" health section for a broken doctor. The five collector sections
(`workspaces`, `nxEdges`, `git`, `security`, `disk`) remain individually degradation-tolerant and may still be `null`.

### Doctor test commands

Focused validation for doctor, its reporter, every specialist module, and `commands/status/index.ts`:

```powershell
npx vitest run --config scripts\vitest.config.ts --coverage.enabled=false scripts\commands\doctor scripts\commands\status scripts\common\runtime-boundary.test.ts
npx eslint scripts\commands\doctor scripts\commands\status\index.ts scripts\common\taxonomy-artifacts.ts
git --no-pager diff --check
```

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
