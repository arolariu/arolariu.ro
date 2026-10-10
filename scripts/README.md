# Root Tooling Scripts

The root [`package.json`](../package.json) owns the supported npm commands that invoke this directory. Every one of them is an alias of
a command path of [`cli.ts`](./cli.ts), the single Effect v4 command entrypoint. Command families live in [`commands`](./commands), the
Effect platform services they run on live in [`platform`](./platform), repository inspection lives in [`inspection`](./inspection),
container runtime behavior lives in [`container-runtime`](./container-runtime), and shared repository helpers live in
[`common`](./common) beside the frozen format/lint closure (see [Format, lint, and the frozen closure](#format-lint-and-the-frozen-closure)).

[RFC 0002](../docs/rfc/0002-lean-monorepo-tooling-architecture.md) (revision 3, Effect Command Platform) is the accepted architecture
record for everything below.

## Command runtime

[`cli.ts`](./cli.ts) is the single command entrypoint (`node scripts/cli.ts <command>`), recorded in
[RFC 0002 section 4](../docs/rfc/0002-lean-monorepo-tooling-architecture.md#4-command-line-interface). It builds the `arolariu` root
command with `effect/cli`, owns all argv parsing, help, version, and shell completions, and starts the program once with
`NodeRuntime.runMain` over `NodeBaseLayer`. Every npm script is an alias of one command path, for example
`"doctor": "node scripts/cli.ts doctor"` and `"generate:artifacts": "node scripts/cli.ts generate artifacts"`.

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

Pass arguments through npm after `--`: `npm run doctor -- --quick --json`, `npm run rates:update -- --year 2025`. `--help` and a command
group run without a subcommand (`arolariu`, `arolariu docs`, `arolariu dev`) print help and exit `0`. Slash aliases (`/h`, `/v`, `/q`,
`/?`, …) do not exist.

### Global flags

Global flags are accepted before or after the subcommand.

| Flag | Meaning |
|------|---------|
| `--json` | Writes one JSON document to stdout for each command run and usage failure (see [Failures and JSON output](#failures-and-json-output) for the exceptions); human output is suppressed and effect/cli help/error text goes to stderr |
| `--verbose` | Also emits debug diagnostics (the log level becomes at least `debug`). It has no short form: `-v` is `--version` |
| `--log-level <level>` | effect/cli's minimum Effect log level (`all`, `trace`, `debug`, `info`, `warn`, `error`, `fatal`, `none`); default `info`. It filters the `[arolariu::…]` log lines (`none` also hides warnings and errors) but not presenter output such as tables, success lines, or the `--json` document |
| `--help`, `-h` | Prints effect/cli help for the selected command and exits `0` |
| `--version`, `-v` | Prints the root `package.json` version |
| `--completions <bash\|zsh\|fish\|sh>` | Prints an effect/cli shell completion script; PowerShell is not supported |
| `--wizard` | effect/cli's interactive wizard for building a command line |

### Exit codes

[`platform/exit.ts`](./platform/exit.ts) `exitCodeFor` is the only exit-code mapping; only `cli.ts` and the worker runner
([`platform/worker.ts`](./platform/worker.ts)) call it:

| Exit | Outcome |
|------|---------|
| `0` | Success, including `--help`, a bare command group, `--version`, and `--completions` |
| `1` | `ReportedFailure{exitCode: 1}` (a business-negative result, such as doctor with a failing check, after its full output), a typed failure, or a defect |
| `2` | A `CliError` usage or parse failure, or `ReportedFailure{exitCode: 2}` (for example an invalid `rates update` year range or `containers compose` without passthrough arguments) |
| `130` | Interruption after `SIGINT`, interruption with no recorded signal, or a terminal quit (`QuitError`) |
| `143` | Interruption after `SIGTERM` |

Interruption wins over any failure, finalizer failures included, so a signalled run keeps its signal exit code. No script calls
`process.exit()` or assigns `process.exitCode`.

### Failures and JSON output

`cli.ts` renders every failure that no command already reported (a `ReportedFailure`, a `CliError` that effect/cli printed, a `QuitError`,
and a pure interruption are not rendered again):

- **Human mode** writes `[arolariu::cli] ⛔ <message>` on stderr, followed for a process failure
  (`ProcessExited`/`ProcessSignalled`/`ProcessSpawnFailed`/`ProcessTimedOut`) by its bounded `stdout: …` and `stderr: …` evidence lines.
- **JSON mode** (`--json`, `--json=true`, or any other spelling effect/cli accepts before `--`; a `--json` after `--` is a passthrough
  argument) writes one document on stdout (`JSON.stringify(value, null, 2)` plus a newline): the command's typed result on
  success or business-negative completion; `{status: "failed", kind: "usage", message, evidence}` for a usage failure; otherwise
  `{status: "failed", kind, message, evidence}`, where `kind` is `operational` for a typed failure and `internal` for a defect.

The one-document guarantee covers what the CLI itself writes. These cases write no document, or share stdout with other output:

- `--help`, `--version`, `--completions`, `--wizard`, and a bare command group print their text (to stderr under `--json`) and write no
  document.
- An interrupted run (Ctrl+C or `SIGTERM`, exit `130`/`143`) writes no document.
- `format` and `lint` run the frozen Piscina closure with inherited output: the child renders everything and no document is written.
- A child run with inherited output writes straight to the same stdout: `dev aspire` (the AppHost output precedes the document) and the
  `setup` actions that inherit output (package-manager installs, `dotnet workload restore`, `dotnet dev-certs https --trust`, …).
- An interactive prompt (for example `setup` without `--yes` or `--dry-run` on a terminal) draws on the terminal. Use `--yes`,
  `--dry-run`, or a non-interactive stdin for machine-readable `setup` runs.

### Cancellation and cleanup

`NodeRuntime.runMain` interrupts the main fiber on `SIGINT` and `SIGTERM`; [`platform/signals.ts`](./platform/signals.ts) only records
which signals arrived, so the exit is `130` or `143` and `Process` can tell a Ctrl+C from a programmatic interruption. Interruption
reaches every child fiber, stops in-flight HTTP requests, delays, and prompts, and closes each `Process` scope:

- A captured child (the default `capture` output) never talks to the terminal. It runs in its own process group on POSIX and is killed
  at once with its whole process tree (`SIGTERM`, then `SIGKILL` after 1 s; `taskkill /T /F` on Windows).
- A terminal-attached child (`tee` or `inherit` output, such as the Aspire AppHost, `docker compose up`, `format`, or a `sudo` install)
  stays in the terminal's foreground process group on POSIX, so it can prompt (`sudo`) and it receives the terminal's Ctrl+C and hang-up
  itself; on Windows it shares the console. After a Ctrl+C it gets `INTERRUPT_GRACE_PERIOD` (15 s, or the `interruptGracePeriod`
  option) to finish its own shutdown; a second Ctrl+C ends the wait. A child still running then is terminated: `SIGTERM` and `SIGKILL`
  1 s later to the direct child on POSIX (its descendants already got the terminal's Ctrl+C), `taskkill /T /F` on Windows. A `SIGTERM`
  sent to the CLI alone is forwarded to the direct child, followed by `SIGKILL` once the grace period elapses; signal the whole process
  group to stop its descendants too. A programmatic interruption (no signal) kills it at once.

A cancelled command interrupts: it never turns the cancellation into failed rows, failed phases, or a partial document.

Register cleanup in the command scope with `Effect.acquireRelease`, `Effect.addFinalizer`, or `Effect.ensuring`. Finalizers run in LIFO
order on success, failure, and interruption; a finalizer failure joins the `Cause` beside the primary failure and never replaces it.

### Sensitive values

Read a secret as `Redacted<string>` at the point it enters the program and unwrap it with `Redacted.value` only at the call that needs
the raw value. Pass it to a child process through `env` where the tool allows. There is no redaction registry and no output masking:
nothing scans child output or diagnostics for secret literals (an accepted risk recorded in RFC 0002 section 19), so never place a raw
secret in a log line, an echoed command, or an error message.

### Adding a subcommand

1. Create `commands/<family>/cli.ts` exporting `make<Family>Command(...): CliSubcommand` (see
   [`commands/rates/cli.ts`](./commands/rates/cli.ts)). Build it with `Command.make`, declare its flags and arguments with `Flag`/`Argument`,
   and wrap the handler program in `withCommandOutput("<context>")` from [`commands/flags.ts`](./commands/flags.ts), which provides the
   per-invocation `OutputSettings`, `Presenter`, `Process`, and `Inspection` from `--json`, `--verbose`, and the environment.
2. Write the business program as `Effect.fn("<family>.<name>")(function* (input) { … })` with an explicit requirement type, put its
   `Schema.TaggedError` classes in `commands/<family>/errors.ts`, and render the completion through `Presenter`. A business-negative
   completion renders its full output, then fails with `ReportedFailure{exitCode: 1, message}`. Input the parser accepted but the command
   rejects fails through `reportUsageFailure(message)` ([`platform/exit.ts`](./platform/exit.ts)): one `⛔` line, or under `--json` the
   `{status: "failed", kind: "usage", message, evidence: []}` document, then exit `2`.
3. Test the family on `makeTestLayer` with `effectTest`, and test its `cli.ts` by running `runCli` on a harness layer (see
   [`commands/generate/cli.test.ts`](./commands/generate/cli.test.ts)).
4. Register the factory in the `rootCommand` list of [`cli.ts`](./cli.ts) and add the npm alias to the root `package.json`.

`CliSubcommand` restricts handler requirements to the base services plus the `--json`/`--verbose` settings, so a family that forgets to
provide a service fails to compile. Commands compose plain effects, never sibling processes: `status` runs `runDoctor` directly.

### Direct entrypoints

Only [`cli.ts`](./cli.ts), [`format.ts`](./format.ts), [`lint.ts`](./lint.ts), and the two inspection workers
([`inspection/aggregate-worker.ts`](./inspection/aggregate-worker.ts) and [`inspection/workspace.worker.ts`](./inspection/workspace.worker.ts))
start a process. Each worker's `import.meta.main` block only calls `runWorker(<worker definition>)`
([`platform/worker.ts`](./platform/worker.ts)), which decodes its argv with the worker's `decodeWorkerArgs`, writes the single JSON
document, and maps the exit code.

## Platform layer

[`platform/`](./platform) holds the Effect services every command runs on
([RFC 0002 section 5](../docs/rfc/0002-lean-monorepo-tooling-architecture.md#5-platform-services-and-layers)). Every service key is
`"arolariu/scripts/<ServiceName>"`.

- [`Environment`](./platform/Environment.ts) — immutable snapshot of variables, cwd, executable path, platform, architecture, CI, and TTY
  flags, taken once when the layer is built.
- [`exit.ts`](./platform/exit.ts) — `ReportedFailure`, `reportUsageFailure`, and `exitCodeFor`, the single exit-code mapping (`0`, `1`,
  `2`, `130`, `143`).
- [`signals.ts`](./platform/signals.ts) — records which of `SIGINT`/`SIGTERM` arrived (and how many), so interruption maps to
  `130` or `143`; `cli.ts` provides the recorder as the `TerminationSignals` reference that `Process` reads for the Ctrl+C grace
  period.
- [`Output.ts`](./platform/Output.ts) — `Sink` (the only direct stream writer), `OutputSettings`, the Effect logger
  (`[arolariu::<context>]` lines, human/JSON/silent), and `Presenter` (`success`, `fatal`, `line`, `write`, `section`, `banner`, `table`,
  `progress`, `json`; a second `json` write fails with `JsonDocumentAlreadyWritten`).
- [`Process`](./platform/Process.ts) — child processes over `ChildProcessSpawner` with capture/tee/inherit output, stdin, timeout, command
  echo, bounded evidence (`failureOutput: "full"` keeps a failure's whole captured output for callers that parse it, such as
  `npm ls --json`), the Ctrl+C grace period of terminal-attached children (`interruptGracePeriod`, see
  [Cancellation and cleanup](#cancellation-and-cleanup)), and typed
  `ProcessExited`/`ProcessSignalled`/`ProcessSpawnFailed`/`ProcessTimedOut` failures;
  [`windows.ts`](./platform/windows.ts) resolves and escapes `.cmd` shims.
- [`Files.ts`](./platform/Files.ts) — `Glob`, read-only `ReadOnlyFiles`, `GetOnlyHttp`, `TemporaryDirectories` (a scope-owned
  temporary directory, removed when the scope closes), `writeTextAtomic`, and `readBytesBounded`.
- [`Http.ts`](./platform/Http.ts) — `readBoundedBytes`/`readBoundedText` stream a response body and fail with `ResponseTooLarge` past
  `MAX_RESPONSE_BYTES` (10 MiB) without buffering the rest.
- [`Inspection`](./inspection/Inspection.ts) — shares one memoized repository inspection session per request
  (`repositoryInspectionRequestKey`) for the invocation (see [Repository inspection](#repository-inspection)).
- [`Prompts`](./platform/Prompts.ts) — `confirm`, `select`, `text`, and `secret` (returned as `Redacted<string>`) over effect/cli
  `Prompt`. Without an interactive stdin it never reads input: `confirm`/`select` return their default when one is given, and every
  other prompt fails with `PromptUnavailable` carrying the `Cannot request <kind> without an interactive terminal…` message.
- [`layers.ts`](./platform/layers.ts) — `NodeBaseLayer` (every invocation-independent service, provided once by `cli.ts`),
  `commandLayer` (the per-invocation output services, `Process`, and `Inspection`, each built fresh from `ProcessLayerFactory` and
  `InspectionLayerFactory`), and `makeNodeLayer`, which composes both.
- [`worker.ts`](./platform/worker.ts) — `runWorker` runs a child-process worker (`decode` → `program` → `encode`) with
  `NodeRuntime.runMain` over the JSON-mode node layer, writes its single document through `Presenter.json`, and exits through
  `exitCodeFor` (a decode throw is a usage failure, exit `2`, with nothing on stdout); `runWorkerProgram` is its testable core.
- [`testing.ts`](./platform/testing.ts) and [`testing.fs.ts`](./platform/testing.fs.ts) — the test harness (below).

### Test harness

`makeTestLayer` provides every platform service in memory: in-memory files and temporary directories, scripted processes, HTTP, and
prompts, a recording sink, a fixed environment, and `TestClock`, with `output()`, `processCalls()`, `httpCalls()`, and `files()`
accessors. `effectTest(name, body, layer)` registers a Vitest case whose body is an effect run in a fresh scope (`runScoped` rejects with
the original typed failure). `fileSystem: "node"` serves files, glob, and temporary directories from the real filesystem instead (for
fixtures in a real temporary directory, such as symbolic links), `clock: "live"` keeps real time, and `scriptedOutcomes(respond)` answers
every process request from a `ProbeOutcome`-returning responder that sees `{cwd, env, timeoutMs, output}`. Scripted prompts follow the
same TTY rule as `Prompts`; with `environment: {stdinIsTTY: true}` they consume `prompts` answers in order. With
`inspection: {<key>: outcome}`, `Inspection` returns a scripted session that dies with `unscripted inspection: <key>` for any other key;
otherwise `InspectionLive` runs over the harness services.

Build one harness per test. Unscripted processes, HTTP requests, prompts, spawns, and unimplemented filesystem members die instead of
reaching a real boundary, and repository modules are never mocked:

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

### Shared repository helpers

The shared repository helpers are Effects over the platform services. `resolveRepositoryPaths(import.meta.url)` (`common/repository-paths.ts`)
walks up from the module through `ReadOnlyFiles` and fails with the typed `RepositoryRootNotFound` (rendered by `cli.ts`, exit `1`) when
no ancestor `package.json` names `@arolariu/monorepo`. `loadRepositoryRequirements(paths)` (`common/requirements.ts`) reads every
manifest source concurrently through `ReadOnlyFiles` and never fails: read and validation problems become an `invalid` result.
`readToolingConfig(path)` (`common/tooling-config.ts`) needs only `ReadOnlyFiles` and maps a missing file to `{status: "missing"}`;
`writeToolingConfig(path, config)` writes through `writeTextAtomic` and so requires `FileSystem` and `Path`:

```ts
const paths = yield* resolveRepositoryPaths(import.meta.url);
const requirements = yield* loadRepositoryRequirements(paths);
```

## Format, lint, and the frozen closure

[`format.ts`](./format.ts), [`lint.ts`](./lint.ts), and their Piscina workers keep their pre-Effect implementation and behavior
([RFC 0002 section 3.2](../docs/rfc/0002-lean-monorepo-tooling-architecture.md#32-frozen-format-and-lint-closure)). `format` and `lint`
([`commands/quality/cli.ts`](./commands/quality/cli.ts)) spawn `node scripts/format.ts|lint.ts <target> [patterns...]` with inherited
output, so the child renders everything; a non-zero exit becomes `ReportedFailure{exitCode: 1}`.

The closure is the value-import closure of `format.ts`, `lint.ts`, and `workers/*.ts`, pinned exactly by
[`architecture.test.ts`](./architecture.test.ts): `format.ts`, `lint.ts`, [`workers/format.worker.ts`](./workers/format.worker.ts),
[`workers/lint.worker.ts`](./workers/lint.worker.ts), [`workers/shell.ts`](./workers/shell.ts), [`common/index.ts`](./common/index.ts),
[`common/logger.ts`](./common/logger.ts), [`common/runner.ts`](./common/runner.ts), [`common/runner.execa.ts`](./common/runner.execa.ts),
[`common/runtime.node.ts`](./common/runtime.node.ts), and `../eslint.config.ts` (which `workers/lint.worker.ts` loads through a dynamic
import). It reaches [`types/format.ts`](./types/format.ts), [`types/lint.ts`](./types/lint.ts), and
[`platform/Environment.ts`](./platform/Environment.ts) only through `import type`, so those three are pinned as type-only dependencies.

- `common/{index,logger,runner,runner.execa,runtime.node}.ts` are private to the closure; no other production module loads one at
  runtime. `container-runtime/adapters.ts` and `inspection/probes.ts` take only the structural `ProcessRequest` type from
  `common/runner.ts`.
- `common/runtime.node.ts` is only the closure's frozen adapter: `snapshotNodeEnvironment`, `createNodeProcessRunner`,
  `nodeProcessRunner` (which the Piscina-hosted `workers/shell.ts` takes, because it has no command scope, while keeping its
  `{code, output}` worker-facing API), and `nodeLoggerRuntimeHost` (real TTY, `NO_COLOR`, and progress for the orchestrators' loggers).
- `common/runner.execa.ts` is the only production module that imports `execa`.

Migrating the closure, and removing `execa` and `logger.ts` with it, is future work.

## Architecture rules

[`architecture.test.ts`](./architecture.test.ts) sanctions `scripts/platform/**` as the only owner of ambient `process.*`, timer,
filesystem, network, and `node:*` access outside the frozen closure, whose modules are each exempt from exactly the ambient rules they
already break (a stale exemption fails as loudly as a new violation). It also enforces:

- the format/lint closure, its type-only frontier, and its private modules exactly as listed above, with no `child_process` import
  anywhere;
- `@effect/platform-node` is imported only inside `scripts/platform/` and by [`cli.ts`](./cli.ts);
- Effect runtimes (`Effect.run*`, `ManagedRuntime.make`, `NodeRuntime.runMain`) start only in `cli.ts`, `platform/worker.ts`,
  `platform/testing.ts`, and `Output.ts`'s synchronous logger sink;
- the only modules with an `import.meta.main` block are `cli.ts`, `format.ts`, `lint.ts`, and the two inspection workers. Inside that
  block, `cli.ts` may read `process.argv` and no other ambient state (the exemption does not apply elsewhere in the file), and each
  inspection worker's block consists of exactly one `runWorker(...)` call;
- the read-only families (`scripts/inspection/**` and `scripts/commands/{doctor,status}/**`) never import a mutating capability (see
  [Read-only command policy](#read-only-command-policy));
- `effect/cli` is imported only under `scripts/commands/`, by `cli.ts`, by `platform/exit.ts`, and by `platform/Prompts.ts`;
- no temporary migration marker remains under `scripts/`.

The process fixtures under `scripts/platform/__fixtures__/` (and only those) are exempt from these production scans, so
`cancellable-cli.ts` may start itself with `NodeRuntime.runMain`.

## Output-policy exemptions

The platform `Sink` in [`platform/Output.ts`](./platform/Output.ts) is the only writer of the process streams for every command; the
logger, the `Presenter`, and effect/cli's help and error text (routed by `cli.ts` through a `Console` over the sink) all render into it.
The pre-Effect logger sink in [`common/logger.ts`](./common/logger.ts) holds the same exemption for the frozen closure only.

[`common/output-policy.test.ts`](./common/output-policy.test.ts)'s AST guards enforce these boundaries, including property,
direct-function, and destructured aliases, and [`architecture.test.ts`](./architecture.test.ts) enforces the wider runtime boundary
above. The root ESLint configuration provides immediate feedback for direct output syntax. No exemption includes a script entry point.

## Generate, rates, and docs

The `generate`, `rates`, and `docs` families run as Effect programs on the [platform layer](#platform-layer). Each
`commands/<family>/cli.ts` decodes its flags, runs the family program inside `withCommandOutput("<context>")`, and renders the completion
through `Presenter`. With `--json`, the family's typed result is the single stdout document; a business-negative run (a stopped `generate`,
or `rates update` with failed years) still writes that document before exiting `1`, while a typed failure is rendered by `cli.ts` as
`{status: "failed", …}`. Typed failures are `Schema.TaggedError` classes in each family's `errors.ts`; process failures stay
`ProcessError`. The [shared repository helpers](#shared-repository-helpers) (for example `resolveRepositoryPaths`, which docs uses) are
Effects over `ReadOnlyFiles`.

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
npx vitest run --config scripts\vitest.config.ts --coverage.enabled=false scripts\commands\generate scripts\commands\rates scripts\commands\docs scripts\architecture.test.ts
npx eslint scripts\commands\generate scripts\commands\rates scripts\commands\docs
```

## Containers

`dev aspire`, `dev selfhost`, and `containers build|run|compose` run as Effect programs (`runAspire`, `runSelfhost`, `runImage`,
`runCompose`) from [`container-runtime`](./container-runtime) on the [platform layer](#platform-layer). Each program resolves the
container engine (`--engine`, then `AROLARIU_CONTAINER_ENGINE`, then the persisted `.arolariu/tooling.local.json` selection) and runs
the shared preflight probes under the `<command>::preflight` log context (`prepareContainerEngine`), then drives the engine CLI,
Compose provider, or AppHost through the `Process` service, so every test scripts the processes instead of spawning Docker, Podman, or
AppHost. The image build (frontend and backend targets) and `dev selfhost start` run `generateArtifacts` silently first. Domain failures
are `ContainerRuntimeError`; process failures stay `ProcessError`.
Cancellation is fiber interruption: `runMain` interrupts the command, the `Process` scope finalizer stops the child (after the Ctrl+C
grace period for the attached AppHost, Compose, image, and selfhost children, see [Cancellation and cleanup](#cancellation-and-cleanup)),
and the CLI exits `130` (`143` after `SIGTERM`).
[`platform/cancellation.integration.test.ts`](./platform/cancellation.integration.test.ts) proves this end to end with
[`platform/__fixtures__/cancellable-cli.ts`](./platform/__fixtures__/cancellable-cli.ts), whose inherited child spawns a grandchild. On
POSIX a SIGINT to the fixture's process group (a terminal Ctrl+C) lets the child and grandchild exit on their own long before the grace
period ends (exit `130`), and a SIGTERM to the CLI alone is forwarded to the child (exit `143`). On Windows, where Node cannot deliver a
catchable signal to another process, a self-interrupt of the main fiber takes the immediate `taskkill /T /F` path (exit `130`). In each
case the processes it stops are gone within three seconds.

| Module | Responsibility |
|--------|----------------|
| [`commands/dev/cli.ts`](./commands/dev/cli.ts) | `dev aspire [--engine]` and `dev selfhost [start\|stop\|logs] [--engine]`; provides `LocalBlobStorageLive` to selfhost only |
| [`commands/containers/cli.ts`](./commands/containers/cli.ts) | `containers build\|run --target` and `containers compose --file -- <args…>`; Compose without passthrough arguments is a usage failure (exit `2`) |
| [`commands/containers/output.ts`](./commands/containers/output.ts) | `renderContainerCompletion` (the JSON document or the success line) and `reportChildExit` (a non-zero engine or AppHost exit) |
| [`container-runtime/selection.ts`](./container-runtime/selection.ts) | Pure `resolveContainerEngine` (also used by Setup and Doctor) and its Effect counterpart for the commands |
| [`container-runtime/preflight.ts`](./container-runtime/preflight.ts) | Engine CLI and Compose provider probes plus Docker Desktop backend rejection; a failing probe is a `ContainerRuntimeError` describing the failing check and its probe output |
| [`container-runtime/aspire.ts`](./container-runtime/aspire.ts) | AppHost startup with inherited output |
| [`container-runtime/compose.ts`](./container-runtime/compose.ts), [`image.ts`](./container-runtime/image.ts) | Compose passthrough and image build/run with tee output; frontend/backend images generate the taxonomy artifacts silently first |
| [`container-runtime/selfhost.ts`](./container-runtime/selfhost.ts) | Selfhost start/stop/logs over the `infra/Local` stacks, artifacts, certificates, the Traefik config, and the storage bootstrap |
| [`container-runtime/selfhost.bootstrap.ts`](./container-runtime/selfhost.bootstrap.ts) | Cosmos provisioning through `HttpClient` (bounded bodies) and Azurite through the `LocalBlobStorage` service, the only Blob SDK owner |

- **JSON.** With `--json`, every completed invocation writes one stdout document, failures included: the typed result (`{engine}`,
  `{engine, file, passthrough}`, `{engine, action, target}`, or `{action, engine, stacks}`) on success; on a non-zero engine or AppHost
  exit, `reportChildExit` writes `{status: "failed", kind: "operational", message, evidence}` and exits `1`; any other typed failure is
  rendered by `cli.ts` in the same shape. `dev aspire` runs the AppHost with inherited output, so its output shares stdout and precedes
  the document; an interrupted run writes none.
- **Child output.** AppHost runs with inherited output; Compose, image, and selfhost commands use tee output (each command echoed as
  `$ <command>`), so the user sees the child's diagnostics live. A non-zero exit therefore renders one `<tool> exited with code <n>` line
  (`reportChildExit`, then `ReportedFailure{exitCode: 1}`) instead of repeating the output as evidence.
- **SQL password.** Selfhost start reads `MSSQL_SA_PASSWORD` from the invocation environment as a `Redacted` value (missing or blank is a
  `ContainerRuntimeError` that tells you to set it in the shell only) and unwraps it only into the `SQLCMDPASSWORD` environment variable
  of the `docker`/`podman exec -e SQLCMDPASSWORD mssql …` client: the engine copies the named variable into the container, where
  `sqlcmd` reads it, so the password never appears in an argument vector or the host process list. The run never echoes under
  `--verbose`, and a `sqlcmd` failure is rebuilt as a step-only message that carries no process evidence.
- **Persistent state.** Started stacks and the generated Traefik file are requested state: a failed or interrupted start leaves what it
  started running, and only `dev selfhost stop` removes the Traefik file.

## E2E

`test e2e <all|backend|frontend|cv>` ([`commands/e2e/cli.ts`](./commands/e2e/cli.ts)) runs [`commands/e2e/index.ts`](./commands/e2e/index.ts)
`runE2e`, one Newman run per target. Typed failures are `NewmanFailed` and `NewmanReportFailed`
([`commands/e2e/errors.ts`](./commands/e2e/errors.ts)).

- **Auth token.** `E2E_TEST_AUTH_TOKEN` is read as a `Redacted` value and unwrapped only for Newman's `--env-var authToken=…` argument,
  because Newman has no environment channel. Tracked collection and environment files are never mutated.
- **Captured, redacted output.** Because its command line carries the token, the Newman run never echoes its command, captures its output,
  and writes it only after redaction (the runtime token, bearer values, and JWTs). There is no live Newman progress: each target's output
  appears when that run settles. Every `ProcessError` is rebuilt as a `NewmanFailed` from the redacted output alone, never from the error
  message or command.
- **Report cleanup.** Each target registers its report cleanup (assertion summary, then JSON, JUnit, and summary sanitization) before its
  run; one `Effect.ensuring` finalizer runs every registered cleanup, last registered first, on success, failure, or interruption, and
  attempts every step even after one fails. A Newman failure stays primary, with any cleanup failure appended to its evidence.
- **JSON.** With `--json`, the single document is `{targets, completed}` on success, or `{status: "failed", kind: "operational", message,
  evidence}` (redacted evidence) on a Newman failure, which exits `1`.

### Containers and E2E test commands

```powershell
npx vitest run --config scripts\vitest.config.ts --coverage.enabled=false scripts\container-runtime scripts\commands\dev scripts\commands\containers scripts\commands\e2e scripts\platform\cancellation.integration.test.ts scripts\architecture.test.ts
npx eslint scripts\container-runtime scripts\commands\dev scripts\commands\containers scripts\commands\e2e
```

## Setup orchestrator (`npm run setup`)

`npm run setup` runs `arolariu setup` (`--dry-run`, `--yes`, `--engine rancher|podman`, plus the global flags).
[`commands/setup/index.ts`](./commands/setup/index.ts) `runSetup` resolves canonical paths through [`common/repository-paths.ts`](./common/repository-paths.ts), loads manifest-derived runtime and package
requirements through [`common/requirements.ts`](./common/requirements.ts), and reads/writes the non-secret persisted selection at
`.arolariu/tooling.local.json` through [`common/tooling-config.ts`](./common/tooling-config.ts). Setup restores dependencies, prepares
toolchains, and generates checkout artifacts; it never builds, type-checks, tests, or starts/stops a service. Every phase (workspace,
.NET, React, Svelte, Python, infrastructure) is an Effect phase that reads every capability from platform services and submits
every mutation through `SetupActions`. A required phase that failed (or was skipped by a blocking dependency,
or outside a dry run) makes the command exit `1` after the summary table; with `--json`, the `{phases}` result is the single document.
Cancellation (including a terminal quit at a consent prompt, exit `130`) interrupts the whole run rather than failing the current phase.

### Module map

| Module | Owns |
|--------|------|
| [`commands/setup/index.ts`](./commands/setup/index.ts) | `runSetup`: phase ordering, paths, requirements, the shared inspection session, and the readiness rollup |
| [`commands/setup/cli.ts`](./commands/setup/cli.ts) | Flag decoding and the completion: summary table, degraded capabilities, next actions, banner, and exit code |
| [`commands/setup/runner.ts`](./commands/setup/runner.ts) | `runSetupPhases`: sequential, dependency-gated phase execution and per-phase rendering |
| [`commands/setup/actions.ts`](./commands/setup/actions.ts) | `SetupActions`: the consent-gated runner of every setup mutation |
| [`commands/setup/phase-support.ts`](./commands/setup/phase-support.ts) | Native phase building blocks: `runPhaseCommand` (setup command defaults), `submitSetupAction`, and `phaseResult` |
| [`commands/setup/phase-testing.ts`](./commands/setup/phase-testing.ts) | Test support for the native phase tests: scripted commands, recording inspection/actions, and the counting clock |
| [`commands/setup/errors.ts`](./commands/setup/errors.ts) | `SetupActionFailed`, the typed failure of a setup action |
| [`commands/setup/types.ts`](./commands/setup/types.ts) | `SetupInput`, `SetupContext`, `SetupPhaseDefinition`, `SetupAction`, `SetupRequirements`, and the status/scope/disposition contracts |
| [`commands/setup/phases/workspace.ts`](./commands/setup/phases/workspace.ts) | Prerequisite validation, root and `.github/scripts` npm restore, and generated taxonomy/GraphQL/i18n artifacts |
| [`commands/setup/phases/dotnet.ts`](./commands/setup/phases/dotnet.ts) | .NET SDK install, workload/solution/tool restore, AppHost user secrets, and the local HTTPS dev certificate |
| [`commands/setup/phases/react.ts`](./commands/setup/phases/react.ts) | Website package validation, additive website `.env` defaults, and Playwright Chromium |
| [`commands/setup/phases/svelte.ts`](./commands/setup/phases/svelte.ts) | CV and status SvelteKit generated `.svelte-kit` state |
| [`commands/setup/phases/python.ts`](./commands/setup/phases/python.ts) | Isolated `exp` Python virtual environment, pinned dependency install, and its requirements fingerprint |
| [`commands/setup/phases/infrastructure.ts`](./commands/setup/phases/infrastructure.ts) | Container engine selection/persistence/install, mkcert, selfhost certificates, required ports, and required runtime files |

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

Every mutation runs through the `SetupActions` service of [`commands/setup/actions.ts`](./commands/setup/actions.ts) (phases submit
actions with `submitSetupAction` from [`commands/setup/phase-support.ts`](./commands/setup/phase-support.ts)), which is the sole place
that decides whether an action is `executed`, `planned`, or `declined`. The consent policy, checked in this order:

1. **`--dry-run` wins.** Every action is `planned`; nothing executes and nothing prompts, even under `--yes`.
2. **`--yes` only skips `system` consent.** A `system` action without `--yes` asks
   `Allow system setup action '<id>' (<scope>): <summary>?` with a `false` default; `repository` and `user` actions never prompt.
3. **No TTY means declined.** Without an interactive terminal the defaulted `system` confirmation resolves `false`, so the action is
   `declined`. A terminal quit at the prompt cancels the whole setup run (exit `130`).

Each decision renders exactly one action line under the invocation context `[arolariu::setup]` (never the submitting phase's context),
with `<metadata>` = `'<id>' (<scope>): <summary>`:

| Disposition | Line | Stream |
|-------------|------|--------|
| `planned` | `ℹ️ Planned setup action <metadata>` | stdout |
| prompt | `Allow system setup action <metadata>?` (the consent question) | terminal |
| `declined` | `⚠️ Declined setup action <metadata>` | stderr |
| `executed` | `✅ Executed setup action <metadata>` (after the action succeeds) | stdout |

| Scope | Consent behavior | Representative actions |
|-------|-------------------|-------------------------|
| `repository` | Never prompts (still only planned under `--dry-run`) | Root/`.github/scripts` `npm ci`, dependency fingerprint writes, checkout-artifact generation, additive website `.env` writes, Playwright Chromium install, Python venv creation/pip install/fingerprint write, SvelteKit generated-state preparation, container engine persistence to `.arolariu/tooling.local.json` |
| `user` | Never prompts (still only planned under `--dry-run`) | .NET local tool restore, AppHost local-development user-secret generation, HTTPS dev certificate creation, selfhost certificate generation |
| `system` | Requires an interactive confirm unless `--yes`; without a TTY it is declined | .NET SDK install, .NET workload restore, HTTPS certificate trust, Playwright system dependency install, container engine install, mkcert install/trust |

`--yes` approves only `system`-scoped actions; it never selects a container engine, invents prompted text, or supplies a secret. Under
`--dry-run`, no phase mutates the repository, the invoking user's profile, or the host — every action reports `planned` instead.
`commands/setup/index.test.ts` pins this end to end: `setup --dry-run --yes` over the production phases records only read-only probes
(pinned exactly, and checked against an installer/mutation denylist), leaves the in-memory filesystem unchanged, and renders only
`Planned setup action` lines.

### Setup test commands

Focused validation for setup and its direct shared dependencies:

```powershell
npx vitest run --config scripts\vitest.config.ts --coverage.enabled=false scripts\common\repository-paths.test.ts scripts\common\requirements.test.ts scripts\common\tooling-config.test.ts scripts\platform\Prompts.test.ts scripts\commands\setup\index.test.ts scripts\commands\setup\cli.test.ts scripts\commands\setup\actions.test.ts scripts\commands\setup\runner.test.ts scripts\commands\setup\phases\workspace.test.ts scripts\commands\setup\phases\dotnet.test.ts scripts\commands\setup\phases\react.test.ts scripts\commands\setup\phases\svelte.test.ts scripts\commands\setup\phases\python.test.ts scripts\commands\setup\phases\infrastructure.test.ts scripts\commands\generate\env.test.ts scripts\container-runtime\selection.test.ts scripts\common\output-policy.test.ts
npx eslint scripts\commands\setup scripts\common\repository-paths.ts scripts\common\requirements.ts scripts\common\tooling-config.ts scripts\platform\Prompts.ts scripts\commands\generate\env.ts scripts\container-runtime
git --no-pager diff --check
```

The full root-tooling suite in [Targeted validation](#targeted-validation) below includes these setup and shared-dependency test files
too; it exercises every common, setup, doctor, inspection, container-runtime, and worker test file under `scripts/`. Doctor, its reporter
and specialist modules, and `commands/status/index.ts` also have a narrower focused command in [Doctor test commands](#doctor-test-commands).

## Doctor diagnostics (`npm run doctor`)

`npm run doctor` runs `arolariu doctor` (`--quick`, plus the global `--json`, `--verbose`, and `--help` flags).
[`commands/doctor/index.ts`](./commands/doctor/index.ts) owns `runDoctor`, and [`commands/doctor/cli.ts`](./commands/doctor/cli.ts) renders its
completion. `runDoctor` resolves canonical repository paths and manifest-derived requirements through `ReadOnlyFiles`,
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
| [`commands/doctor/index.ts`](./commands/doctor/index.ts) | `runDoctor`: module orchestration/ordering, fact prewarming, and module-defect normalization |
| [`commands/doctor/cli.ts`](./commands/doctor/cli.ts) | Flag parsing, the live `NetworkProbe` layer, JSON/human completion, and the exit-code rollup |
| [`commands/doctor/types.ts`](./commands/doctor/types.ts) | Shared `DiagnosticResult`/`DoctorContext`/`DoctorInput`/`DoctorRequirements` contracts and diagnostic-result helpers |
| [`commands/doctor/NetworkProbe.ts`](./commands/doctor/NetworkProbe.ts) | The bounded, `GET`-only `NetworkProbe` service (10 MiB body bound, one deadline for request and body) |
| [`commands/doctor/reporter.ts`](./commands/doctor/reporter.ts) | Stable per-check score weights, schema-v1 validation (`createDoctorReport`), and human rendering through `Presenter` |
| [`commands/doctor/modules/workspace.ts`](./commands/doctor/modules/workspace.ts) | Repository root, git, Node/npm runtime, dependency trees, Nx workspace graph (read from repository metadata, see below), config files, generated artifacts, host capacity, npm audit/outdated |
| [`commands/doctor/modules/dotnet.ts`](./commands/doctor/modules/dotnet.ts) | .NET SDK/host/workloads, NuGet state, solution, local tools, HTTPS certificate trust, AppHost configuration and required local parameters, NuGet feed reachability |
| [`commands/doctor/modules/react.ts`](./commands/doctor/modules/react.ts) | Website packages, registry component dependency, environment, i18n, taxonomy/licenses, Playwright, framework config |
| [`commands/doctor/modules/svelte.ts`](./commands/doctor/modules/svelte.ts) | CV and status SvelteKit packages, Node engine, scripts, generated `.svelte-kit` state, adapter |
| [`commands/doctor/modules/python.ts`](./commands/doctor/modules/python.ts) | `exp` runtime, virtual environment, pip, requirements, dependency conflicts, PyPI reachability |
| [`commands/doctor/modules/infrastructure.ts`](./commands/doctor/modules/infrastructure.ts) | Container engine selection, CLI/backend/Compose/socket checks, ports, certificates, manifests, known containers |

Modules are invoked independently and concurrently, but `commands/doctor/index.ts` always flattens their results back into the module-map order above
regardless of which module settles first. A module that reads more than one inspection fact declares those facts (`DiagnosticModule.facts`)
so `commands/doctor/index.ts` starts them together (child fibers started immediately, plus `aggregate` in full mode) before the first module
runs; the module then reads each memoized outcome sequentially without ever owning a concurrency primitive of its own. A module defect never
produces a passing or skipped result — it becomes exactly one failed `<module>.module-error` row so the report degrades to one row instead of
losing the whole run. Interruption is not a defect: a cancelled doctor run interrupts and renders no rows.

### Stable result contract

Every check is one `DiagnosticResult`: a stable `id` (module-prefixed, e.g. `workspace.git`), its owning `module`, `name`, `status`
(`pass`/`warn`/`fail`/`skipped`), `summary`, `evidence`, `durationMs`, `fixes`, and exactly one diagnosis form for a `warn`/`fail` row —
either `rootCause` or ranked `potentialCauses` (`high`/`medium`/`low`), never both. [`commands/doctor/reporter.ts`](./commands/doctor/reporter.ts) rejects an
unknown or duplicate `id`, a `warn`/`fail` row missing evidence/fixes/diagnosis, and an ANSI-bearing or empty report string. The completed
`DoctorReport` (`score`, `grade`, `summary` with `passed`/`warnings`/`failed`/`skipped` counts, `checks`, `timestamp`; the `--json`
document has exactly these keys and no schema version) is scored with a stable per-`id` weight: a pass
earns full weight, a warn half, a fail none, and a `skipped` check contributes to neither the earned total nor the denominator.

### Read-only command policy

Every diagnostic command runs through the shared inspection probe runner backed by the allowlisted read-only command set in
[`inspection/probes.ts`](./inspection/probes.ts). Specialist modules never take an unrestricted `Process`, the mutable `FileSystem`, the
unrestricted `HttpClient`, or `Prompts`: `DoctorRequirements` excludes them at compile time, and
[`commands/doctor/readonly.test.ts`](./commands/doctor/readonly.test.ts) asserts that exclusion with `expectTypeOf` and snapshots `.nx` and
`.arolariu` sentinel files to prove real quick and full-profile Doctor runs do not mutate them.

At the import level, one rule of [`architecture.test.ts`](./architecture.test.ts) — **read-only families never import
mutating capabilities** — AST-scans every production module under `scripts/inspection/**` and `scripts/commands/{doctor,status}/**`,
`cli.ts` adapters included. It rejects `FileSystem` from `effect` and any import of `effect/FileSystem`, `HttpClient` from `effect/http`,
`Prompts` (`platform/Prompts.ts`), `writeTextAtomic` (`platform/Files.ts`), the closure's `ProcessRunner` port and its Node runtime and
Execa adapters, and every `node:fs`/`node:os`/`node:child_process`/`execa`
import, whether named, aliased, type-only, whole-module, re-exported, or dynamic. Like every module outside the frozen closure, these
trees never load the closure's private modules. Read-only families may still use `ReadOnlyFiles`, `GetOnlyHttp` (through
`NetworkProbe`), `Process` (through the opaque probe runner and the isolated inspection workers), `TemporaryDirectories` (scope-owned
directories outside the repository), and the shared `resolveRepositoryPaths`, `loadRepositoryRequirements`, and `readToolingConfig`
helpers, which require only `ReadOnlyFiles`.

No Nx child command is dispatched by doctor or status, and none is allowlisted. Nx always opens (and rewrites) its native workspace
database when it constructs a project graph. `workspace.nx-projects`, `workspace.nx-graph`, and status's `nxEdges` are instead derived
from the shared inspection session's workspace facts, which use an isolated Nx Devkit worker process
([`inspection/workspace.ts`](./inspection/workspace.ts)) that redirects Nx state to a disposable temporary directory.

### Status integration

[`commands/status/index.ts`](./commands/status/index.ts) `collectStatus` requires only
`StatusRequirements = DoctorRequirements | Inspection` (the same read-only profile) and composes `runDoctor({quick: true, verbose: false})`
as a plain effect in the same concurrent batch as its collectors (`Effect.all(…, {concurrency: "unbounded"})`), never as a subprocess. Both programs request the identical quick session from the invocation's `Inspection` service, so every inspection
provider runs at most once per `status` run (each provider run is traced as one `inspection.<key>` span, which the status tests count).
Health is the one status section that is **not** degradation-tolerant: passing and failing doctor reports are ordinary health data (status
always exits `0` on completion), while a doctor defect fails the status run, so status never reports a fabricated "unavailable" health
section for a broken doctor. The five collector sections (`workspaces`, `nxEdges`, `git`, `security`, `disk`) remain individually
degradation-tolerant: an unavailable result or a collector defect maps that section to `null`. [`commands/status/cli.ts`](./commands/status/cli.ts)
has no input: with the global `--json` it writes the document as the single JSON document; otherwise it renders the dashboard, whose header
alone adds the `<node> --version` probe. Because the shared session uses the quick profile, its `aggregate` fact is the fixed
quick-profile stub and the `envinfo`/`systeminformation` aggregate worker is never spawned during `status` (the provider-count test
asserts no process call references `aggregate-worker`). Status formats disk sizes with its own copy of the `formatBytes` rendering, so it
does not load the closure-private `common/index.ts` barrel.

### Repository inspection

Doctor and Status read repository facts through the [`Inspection`](./inspection/Inspection.ts) service rather than probing on their own.
`InspectionLive` keeps one layer-scoped session per request key (`repositoryInspectionRequestKey`: repository root, profile, and requested
container engine), so every
program in an invocation that asks for the same request shares one session, and a conflicting request for the same key dies with a
conflict message. [`inspection/repository.ts`](./inspection/repository.ts) composes one provider per fact (`workspace`, `aggregate`,
`npm.root`, `npm.github-scripts`, `packages`, `dotnet`, `python`, `react`, `svelte.cv`, `svelte.status`, `infrastructure`) onto a
[`session`](./inspection/session.ts) that runs each provider at most once, memoizes its `InspectionOutcome`
(`available`/`unavailable`/`invalid`), and traces each run as one `inspection.<key>` span. Dependent providers (React, both Svelte
providers, infrastructure) resolve `packages`/`aggregate` through the same session instead of building their own.

Every provider is an Effect over the read-only `InspectionRequirements` (`ReadOnlyFiles`, `TemporaryDirectories`, `Process`,
`Environment`) plus its own scope. Process failures become `ProbeOutcome`/`InspectionOutcome` data, never exceptions; processes run as
child fibers, and temporary directories live in the provider scope, so closing the session interrupts in-flight providers and stops their
processes before the directories are removed. Two facts run in isolated Node child processes started with `runWorker`
([`platform/worker.ts`](./platform/worker.ts)): [`inspection/workspace.worker.ts`](./inspection/workspace.worker.ts) builds the Nx project
graph with Nx state redirected to a disposable temporary directory (a malformed argument list is a usage failure, exit `2`), and
[`inspection/aggregate-worker.ts`](./inspection/aggregate-worker.ts) is the only module that loads `envinfo`/`systeminformation`. Each parent
provider validates the worker's single untrusted JSON document and reconstructs bounded facts from it. Under the `quick` profile, `aggregate`
is a fixed `unavailable` stub and its worker never starts.

### Doctor test commands

Focused validation for doctor, its reporter, every specialist module, `commands/status/index.ts`, and the inspection layer:

```powershell
npx vitest run --config scripts\vitest.config.ts --coverage.enabled=false scripts\commands\doctor scripts\commands\status scripts\inspection scripts\architecture.test.ts
npx eslint scripts\commands\doctor scripts\commands\status scripts\inspection scripts\common\taxonomy-artifacts.ts
git --no-pager diff --check
```

## Targeted validation

Run the policy tests after changing script output or the runtime boundary:

```powershell
npx vitest run --config scripts\vitest.config.ts --coverage.enabled=false scripts\common\output-policy.test.ts scripts\architecture.test.ts
```

Run the complete root-tooling suite through the scripts-scoped Vitest configuration:

```powershell
npx vitest run --config scripts\vitest.config.ts --coverage.enabled=false
npx eslint scripts
git --no-pager diff --check
```
