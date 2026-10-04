/**
 * @fileoverview Generation orchestrator for monorepository build artifacts as an Effect program.
 * @module scripts/commands/generate/index
 *
 * @remarks
 * {@link runGenerate} runs the selected leaf generators (`env`, `i18n`, `gql`, `artifacts`) one at
 * a time in that fixed order. Each leaf runs silently, as the legacy orchestrator's nested
 * `presentation: "silent"` invocations did, so the orchestrator stays the only renderer of
 * progress: it logs `Running <label>...` and the leaf summary, and the first typed failure (or an
 * i18n run that changed locale files) stops the run and is reported as {@link GenerateResult.failed}.
 * A terminal quit and interruption propagate unchanged.
 */

import {Effect, Layer, Terminal} from "effect";

import type {CommandInvoker} from "../../common/commander.ts";
import {legacyInvoker, type LayerFactory} from "../../platform/bridge.ts";
import {Environment} from "../../platform/Environment.ts";
import {debugLogsEnabled, outputLayer, Presenter, Sink, type OutputSettings} from "../../platform/Output.ts";
import {generateArtifacts, type ArtifactGenerationError} from "./artifacts.ts";
import {generateEnvironment, type GenerateEnvironmentError, type GenerateRequirements} from "./env.ts";
import {generateGraphql} from "./gql.ts";
import {generateI18n, type GenerateI18nError} from "./i18n.ts";

/** Every generator the orchestrator can select, in fixed execution order. */
export type GenerateTaskName = "env" | "i18n" | "gql" | "artifacts";

/** Typed input accepted by the generation orchestrator. */
export interface GenerateInput {
  /** Enables verbose logging for the orchestrator and every selected generator. */
  readonly verbose: boolean;
  /** Selects the environment configuration generator. */
  readonly env: boolean;
  /** Selects the internationalization generator. */
  readonly i18n: boolean;
  /** Selects the GraphQL type generator. */
  readonly gql: boolean;
  /** Selects the taxonomy and license artifact generator. */
  readonly artifacts: boolean;
}

/** Typed business result produced by the generation orchestrator. */
export interface GenerateResult {
  /** Selected generators, in fixed execution order. */
  readonly selected: readonly GenerateTaskName[];
  /** Generators that completed successfully before the run ended. */
  readonly completed: readonly GenerateTaskName[];
  /** The first generator that failed or reported a negative result, when one did. */
  readonly failed?: GenerateTaskName;
}

/** Every failure a leaf generator may report. */
type GenerateTaskError = GenerateEnvironmentError | GenerateI18nError | ArtifactGenerationError;

/** Outcome of one leaf generator that completed. */
interface GenerateTaskOutcome {
  /** Human-readable leaf summary. */
  readonly summary: string;
  /** Whether the leaf completed with the legacy nonzero (business-negative) result. */
  readonly negative: boolean;
}

/** One selectable generator: its input key, its human label, and its program. */
interface GenerateTask {
  /** Input key and result identity of this generator. */
  readonly name: GenerateTaskName;
  /** Label rendered in orchestrator progress output. */
  readonly label: string;
  /** Runs the generator. */
  readonly run: (verbose: boolean) => Effect.Effect<GenerateTaskOutcome, GenerateTaskError, GenerateRequirements>;
}

/** Line logged when required environment values were not provided. */
const MISSING_ENVIRONMENT_LINE = "Aborting: Missing environment variables were not provided.";

/** The fixed `env -> i18n -> gql -> artifacts` execution plan. */
const GENERATE_TASKS: readonly GenerateTask[] = [
  {
    name: "env",
    label: "environment configuration generator",
    run: () => Effect.map(generateEnvironment, ({summary}) => ({summary, negative: false})),
  },
  {
    name: "i18n",
    label: "internationalization (i18n) generator",
    // A run that added missing keys changed locale files: the legacy nonzero result that stops generation.
    run: () => Effect.map(generateI18n, ({summary, changedFiles}) => ({summary, negative: changedFiles.length > 0})),
  },
  {
    name: "gql",
    label: "GraphQL types generator",
    run: () => Effect.map(generateGraphql, ({summary}) => ({summary, negative: false})),
  },
  {
    name: "artifacts",
    label: "taxonomy and license artifact generator",
    run: (verbose) => Effect.map(generateArtifacts({verbose}), ({summary}) => ({summary, negative: false})),
  },
];

/**
 * Returns the short display name used in the selected-task summary and the stop line.
 *
 * @param name - Generator identity.
 * @returns Human-readable generator name.
 */
export function generateTaskDisplayName(name: GenerateTaskName): string {
  switch (name) {
    case "env": {
      return "Env";
    }
    case "i18n": {
      return "i18n";
    }
    case "gql": {
      return "GraphQL";
    }
    case "artifacts": {
      return "Artifacts";
    }
  }
}

/** Sink that discards every record of a silenced leaf. */
const discardingSink = Layer.succeed(Sink, {write: () => Effect.void});

/**
 * Runs a leaf generator with silent output: no presenter line and no log line reaches the user.
 *
 * @param effect - The leaf program.
 * @returns The program with a silent `Presenter`, `OutputSettings`, and logger, at the current verbosity.
 */
function silently<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, Exclude<R, Presenter | OutputSettings>> {
  return Effect.flatMap(debugLogsEnabled, (verbose) =>
    Effect.provide(effect, outputLayer({mode: "silent", verbose, color: false, context: "generate"}).pipe(Layer.provide(discardingSink))),
  );
}

/**
 * Renders the orchestrator banner, configuration, and selected-task summary.
 *
 * @param input - Typed orchestrator input.
 * @returns An effect writing the configuration lines.
 */
function renderConfiguration(input: Readonly<GenerateInput>): Effect.Effect<void, never, Presenter | Environment> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    const environment = yield* Environment;
    const lines = [
      "",
      "╔══════════════════════════════════════════════════════════════════╗",
      "║          ||arolariu.ro|| Generation Orchestrator                 ║",
      "╚══════════════════════════════════════════════════════════════════╝",
      "",
      "🔧 Configuration:",
      "",
      `   Verbose: ${input.verbose ? "✅ Enabled" : "❌ Disabled"}`,
      `   Working Directory: ${environment.cwd}`,
      "   Selected Tasks:",
      ...GENERATE_TASKS.map((task) => `     • ${generateTaskDisplayName(task.name)} (${input[task.name] ? "✓" : "✗"})`),
      "",
    ];
    yield* Effect.forEach(lines, (line) => presenter.line("stdout", line), {discard: true});
  });
}

/**
 * Runs one selected leaf and reports whether it completed.
 *
 * @param task - The selected generator.
 * @param verbose - Verbosity forwarded to the leaf input.
 * @returns `true` when the leaf completed with a zero result; a terminal quit propagates.
 */
function runTask(task: GenerateTask, verbose: boolean): Effect.Effect<boolean, Terminal.QuitError, GenerateRequirements> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    yield* Effect.logInfo(`Running ${task.label}...`);
    const outcome = yield* silently(task.run(verbose)).pipe(
      Effect.map((value) => ({kind: "completed", value}) as const),
      Effect.catch((error) => (Terminal.isQuitError(error) ? Effect.fail(error) : Effect.succeed({kind: "failed", error} as const))),
    );

    if (outcome.kind === "failed") {
      const {error} = outcome;
      if (error._tag === "MissingEnvironmentValues") {
        yield* Effect.logError(MISSING_ENVIRONMENT_LINE);
      } else {
        yield* Effect.logError(`The ${task.label} failed: ${error.message}`);
        if (error._tag === "PromptUnavailable") {
          yield* Effect.logError(MISSING_ENVIRONMENT_LINE);
        }
      }
      return false;
    }

    if (outcome.value.negative) {
      // The silent leaf never rendered its summary; surface it before the generic stop warning.
      yield* Effect.logWarning(outcome.value.summary);
      yield* Effect.logWarning(`The ${task.label} reported a nonzero result; later generators were skipped.`);
      return false;
    }

    yield* presenter.success(outcome.value.summary);
    return true;
  });
}

/**
 * Runs every selected generator sequentially in the fixed `env -> i18n -> gql -> artifacts` order.
 *
 * @remarks
 * No selection renders a warning and a tip and completes with nothing run. Otherwise the first
 * typed leaf failure is logged (`MissingEnvironmentValues` and `PromptUnavailable` also log the
 * legacy abort line), the run stops, and the result names the failing task; an i18n run that
 * changed locale files stops the run the same way. A `Terminal.QuitError` (Ctrl+C at a prompt) and
 * interruption propagate unchanged.
 *
 * @param input - Typed orchestrator input.
 * @returns Selected generators, completed generators, and the first failing generator.
 */
export const runGenerate: (input: Readonly<GenerateInput>) => Effect.Effect<GenerateResult, Terminal.QuitError, GenerateRequirements> =
  Effect.fn("generate.run")(function* (input: Readonly<GenerateInput>) {
    const presenter = yield* Presenter;
    const tasks = GENERATE_TASKS.filter((task) => input[task.name]);
    const selected = tasks.map((task) => task.name);

    yield* renderConfiguration(input);

    if (selected.length === 0) {
      yield* Effect.logWarning("No generation tasks selected. Nothing to do.");
      yield* presenter.line("stdout", "   Tip: Pass one or more tasks (e.g. npm run generate -- env i18n gql artifacts).");
      return {selected, completed: []};
    }

    const completed: GenerateTaskName[] = [];
    let failed: GenerateTaskName | undefined;
    // Sequential by design: a later generator observes every earlier generator's written files,
    // and the first failing generator stops the run.
    yield* Effect.forEach(
      tasks,
      (task) =>
        Effect.suspend(() =>
          failed === undefined
            ? Effect.map(runTask(task, input.verbose), (succeeded) => {
                if (succeeded) {
                  completed.push(task.name);
                } else {
                  failed = task.name;
                }
              })
            : Effect.void,
        ),
      {concurrency: 1, discard: true},
    );

    return failed === undefined ? {selected, completed} : {selected, completed, failed};
  });

/**
 * Builds a legacy invoker over {@link runGenerate}.
 *
 * @param makeLayer - Builds the platform layer of each invocation; defaults to the Node layer.
 * @returns An invoker completing with exit `1` when a task failed, otherwise `0`.
 */
export function makeGenerateInvoker(makeLayer?: LayerFactory): CommandInvoker<GenerateInput, GenerateResult> {
  return legacyInvoker("generate", runGenerate, (result) => (result.failed === undefined ? 0 : 1), makeLayer);
}

/**
 * Legacy invoker over {@link runGenerate} for the unmigrated setup command.
 *
 * @remarks Deleted in cohort 5 (Task 5.3).
 */
export const generateCommand: CommandInvoker<GenerateInput, GenerateResult> = makeGenerateInvoker();
