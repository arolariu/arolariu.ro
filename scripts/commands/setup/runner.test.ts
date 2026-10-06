// @vitest-environment node
/**
 * @fileoverview Tests for the dependency-aware setup phase runner.
 * @module scripts/commands/setup/runner.test
 *
 * @remarks
 * Phases are plain Effect stubs; the runner runs them over the in-memory harness with an
 * inspection session that is never consulted.
 */

import {Effect, Layer} from "effect";
import {describe, expect, it} from "vitest";

import {createRepositoryPaths} from "../../common/repository-paths.ts";
import type {RepositoryInspectionSession} from "../../inspection/repository.ts";
import type {PlatformServices} from "../../platform/layers.ts";
import {effectTest, makeTestLayer, repositoryFixtureRoot, type TestHarness} from "../../platform/testing.ts";
import {setupActionsLayer, type SetupActions} from "./actions.ts";
import {resolveSetupOutcome, runSetupPhases} from "./runner.ts";
import type {SetupContext, SetupInput, SetupPhaseDefinition, SetupPhaseResult, SetupStatus} from "./types.ts";

const input: SetupInput = {verbose: false, dryRun: false, yes: false};

const session: RepositoryInspectionSession = {
  inspect: (key) => Effect.die(new Error(`unexpected inspection: ${key}`)),
  invalidate: () => Effect.void,
  updateInfrastructureEngine: () => Effect.void,
};

/** Builds the shared context of one run. */
function setupContext(options: SetupInput = input): SetupContext {
  return {
    options,
    paths: createRepositoryPaths(repositoryFixtureRoot),
    requirements: {
      node: {major: 24, minor: 0, patch: 0},
      npm: {major: 11, minor: 0, patch: 0},
      dotnet: {major: 10, minor: 0, patch: 0},
      python: {major: 3, minor: 12, patch: 0},
      packages: new Map(),
    },
    inspection: session,
  };
}

/** Builds one phase result. */
function phaseResult(id: string, status: SetupStatus): SetupPhaseResult {
  return {id, status, summary: `${id}:${status}`, evidence: [], nextActions: [], durationMs: 1};
}

/** Builds one stub phase that records its id and reports `status`. */
function stubPhase(
  id: string,
  ran: string[],
  config: Readonly<{status?: SetupStatus; dependsOn?: readonly string[]; required?: boolean}> = {},
): SetupPhaseDefinition {
  return {
    id,
    title: `Title ${id}`,
    required: config.required ?? true,
    dependsOn: config.dependsOn ?? [],
    run: () =>
      Effect.sync(() => {
        ran.push(id);
        return phaseResult(id, config.status ?? "succeeded");
      }),
  };
}

/** Builds the harness and the layer every run needs. */
function runnerHarness(verbose = false): Readonly<{harness: TestHarness; layer: Layer.Layer<SetupActions | PlatformServices>}> {
  const harness = makeTestLayer({context: "setup", verbose});
  return {harness, layer: setupActionsLayer(input).pipe(Layer.provideMerge(harness.layer))};
}

describe("runSetupPhases", () => {
  {
    const ran: string[] = [];
    const {layer} = runnerHarness();
    effectTest(
      "runs phases in declaration order",
      () =>
        Effect.gen(function* () {
          // Arrange
          const phases = [stubPhase("a", ran), stubPhase("b", ran), stubPhase("c", ran)];

          // Act
          const results = yield* runSetupPhases(phases, setupContext());

          // Assert
          expect(ran).toEqual(["a", "b", "c"]);
          expect(results.map(({id}) => id)).toEqual(["a", "b", "c"]);
        }),
      layer,
    );
  }

  {
    const ran: string[] = [];
    const {harness, layer} = runnerHarness(true);
    effectTest(
      "skips dependents of a failed phase and continues independents",
      () =>
        Effect.gen(function* () {
          // Arrange
          const phases = [stubPhase("a", ran, {status: "failed"}), stubPhase("b", ran, {dependsOn: ["a"]}), stubPhase("c", ran)];

          // Act
          const results = yield* runSetupPhases(phases, setupContext());

          // Assert
          expect(ran).toEqual(["a", "c"]);
          expect(results).toEqual([
            phaseResult("a", "failed"),
            {
              id: "b",
              status: "skipped",
              summary: "Skipped 'Title b' because dependency 'a' did not succeed.",
              evidence: ["Dependency 'a' has status 'failed', not 'succeeded' or 'degraded'."],
              nextActions: ["Resolve 'a', then rerun setup."],
              durationMs: 0,
            },
            phaseResult("c", "succeeded"),
          ]);
          expect(harness.output().map(({stream, text}) => `${stream}: ${text.replace(/\n$/u, "")}`)).toEqual([
            "stdout: ",
            "stdout: Title a",
            "stdout: ",
            "stderr: [arolariu::setup::a] ⛔ a:failed (1ms)",
            "stdout: ",
            "stdout: Title b",
            "stdout: ",
            "stdout: [arolariu::setup::b] 🐛 Dependency check for 'Title b': Dependency 'a' has status 'failed', not 'succeeded' or 'degraded'.",
            "stderr: [arolariu::setup::b] ⚠️ Skipped 'Title b' because dependency 'a' did not succeed. (0ms)",
            "stdout:   - Dependency 'a' has status 'failed', not 'succeeded' or 'degraded'.",
            "stdout: ",
            "stdout: Title c",
            "stdout: ",
            "stdout: [arolariu::setup::c] ✅ c:succeeded (1ms)",
          ]);
        }),
      layer,
    );
  }

  {
    const ran: string[] = [];
    const {layer} = runnerHarness();
    effectTest(
      "skips a phase whose dependency was never defined",
      () =>
        Effect.gen(function* () {
          // Act
          const results = yield* runSetupPhases([stubPhase("b", ran, {dependsOn: ["missing"]})], setupContext());

          // Assert
          expect(ran).toEqual([]);
          expect(results[0]?.evidence).toEqual(["Dependency 'missing' was not defined or had not run before this phase."]);
        }),
      layer,
    );
  }

  {
    const ran: string[] = [];
    const {layer} = runnerHarness();
    effectTest(
      "traverses a dry-run planned dependency but not a blocker skip",
      () =>
        Effect.gen(function* () {
          // Arrange
          const phases = [
            stubPhase("planned", ran, {status: "skipped"}),
            stubPhase("downstream", ran, {dependsOn: ["planned"]}),
            stubPhase("blocked", ran, {dependsOn: ["missing"]}),
            stubPhase("behind-blocked", ran, {dependsOn: ["blocked"]}),
          ];

          // Act
          const results = yield* runSetupPhases(phases, setupContext({...input, dryRun: true}));

          // Assert
          expect(ran).toEqual(["planned", "downstream"]);
          expect(results.map(({status}) => status)).toEqual(["skipped", "succeeded", "skipped", "skipped"]);
          expect(resolveSetupOutcome(phases, results, true)).toBe("failed");
        }),
      layer,
    );
  }

  {
    const ran: string[] = [];
    const {harness, layer} = runnerHarness();
    effectTest(
      "maps a phase defect to failed",
      () =>
        Effect.gen(function* () {
          // Arrange
          const dying: SetupPhaseDefinition = {
            id: "dotnet",
            title: ".NET toolchain",
            required: true,
            dependsOn: [],
            run: () => Effect.die(new Error("unexpected dotnet failure")),
          };

          // Act
          const results = yield* runSetupPhases([dying, stubPhase("python", ran)], setupContext());

          // Assert
          expect(results).toEqual([
            {
              id: "dotnet",
              status: "failed",
              summary: "'.NET toolchain' failed with an unexpected exception.",
              evidence: ["unexpected dotnet failure"],
              nextActions: ["Resolve the reported '.NET toolchain' failure, then rerun setup."],
              durationMs: 0,
            },
            phaseResult("python", "succeeded"),
          ]);
          expect(ran).toEqual(["python"]);
          expect(harness.output()).toContainEqual({
            stream: "stderr",
            text: "[arolariu::setup::dotnet] ⛔ '.NET toolchain' failed with an unexpected exception. (0ms)\n",
          });
        }),
      layer,
    );
  }

  {
    const ran: string[] = [];
    const {layer} = runnerHarness();
    effectTest(
      "propagates a phase interruption instead of recording a result",
      () =>
        Effect.gen(function* () {
          // Arrange
          const interrupting: SetupPhaseDefinition = {id: "a", title: "a", required: true, dependsOn: [], run: () => Effect.interrupt};

          // Act
          const exit = yield* Effect.exit(runSetupPhases([interrupting, stubPhase("b", ran)], setupContext()));

          // Assert
          expect(exit._tag).toBe("Failure");
          expect(ran).toEqual([]);
        }),
      layer,
    );
  }
});

describe("resolveSetupOutcome", () => {
  const ran: string[] = [];

  it.each<[string, readonly SetupStatus[], boolean, string]>([
    ["ready", ["succeeded", "succeeded"], false, "ready"],
    ["degraded", ["succeeded", "degraded"], false, "degraded"],
    ["failed", ["failed", "succeeded"], false, "failed"],
    ["a non-dry-run skip", ["skipped", "succeeded"], false, "failed"],
    ["a dry-run planned skip", ["skipped", "succeeded"], true, "ready"],
  ])("resolves %s", (_name, statuses, dryRun, expected) => {
    // Arrange
    const phases = statuses.map((_status, index) => stubPhase(`p${String(index)}`, ran));
    const results = statuses.map((status, index) => phaseResult(`p${String(index)}`, status));

    // Act
    const outcome = resolveSetupOutcome(phases, results, dryRun);

    // Assert
    expect(outcome).toBe(expected);
  });

  it("ignores a failed optional phase", () => {
    // Arrange
    const phases = [stubPhase("optional", ran, {required: false})];

    // Act
    const outcome = resolveSetupOutcome(phases, [phaseResult("optional", "failed")], false);

    // Assert
    expect(outcome).toBe("ready");
  });
});
