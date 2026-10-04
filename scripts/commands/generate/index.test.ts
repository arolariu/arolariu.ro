// @vitest-environment node
/**
 * @fileoverview Orchestration contract tests for the Effect generation orchestrator.
 * @module scripts/commands/generate/index.test
 *
 * @remarks
 * Leaf behavior comes from the in-memory harness (seeded `.env` and locale files, scripted exp and
 * taxonomy HTTP responses, a scripted archive extractor, and the test clock), never from stubbing
 * the leaf modules. Only the terminal prompt boundary is replaced for the Ctrl+C case and only the
 * `HttpClient` boundary for the interruption case.
 */

import {join} from "node:path";

import {Effect, Exit, Fiber, FileSystem, Terminal, type Scope} from "effect";
import {HttpClient} from "effect/http";
import {TestClock} from "effect/testing";
import {describe, expect} from "vitest";

import {Prompts} from "../../platform/Prompts.ts";
import {
  effectTest,
  makeTestLayer,
  repositoryFixtureRoot,
  type ScriptedHttp,
  type TestHarness,
  type TestLayerOptions,
} from "../../platform/testing.ts";
import {renderGenerateCompletion} from "./cli.ts";
import type {GenerateRequirements} from "./env.ts";
import {generateCommand, makeGenerateInvoker, runGenerate, type GenerateInput} from "./index.ts";

/** Fixed clock time of every generated timestamp. */
const FIXED_NOW = Date.parse("2026-08-19T00:00:00.000Z");

/** Locale directory read by the i18n generator. */
const MESSAGES = join(repositoryFixtureRoot, "sites", "arolariu.ro", "messages");

/** GraphQL placeholder written by the gql generator. */
const GQL_PLACEHOLDER = join(repositoryFixtureRoot, "scripts", "__generated__", "gql", "README.placeholder.txt");

/** A complete local `.env`: the environment generator needs no prompt. */
const COMPLETE_ENV = [
  "SITE_ENV=DEVELOPMENT",
  "SITE_NAME=dev.arolariu.ro",
  "SITE_URL=https://localhost:3000",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_existing",
  "CLERK_SECRET_KEY=sk_test_existing",
  "USE_CDN=false",
].join("\n");

/** Locale files whose keys already match English. */
const SYNCHRONIZED_LOCALES: Readonly<Record<string, string>> = {
  [join(MESSAGES, "en.json")]: JSON.stringify({greeting: "Hello"}),
  [join(MESSAGES, "ro.json")]: JSON.stringify({greeting: "Salut"}),
  [join(MESSAGES, "fr.json")]: JSON.stringify({greeting: "Bonjour"}),
};

/** Locale files where Romanian lacks one English key. */
const UNSYNCHRONIZED_LOCALES: Readonly<Record<string, string>> = {
  [join(MESSAGES, "en.json")]: JSON.stringify({greeting: "Hello", farewell: "Goodbye"}),
  [join(MESSAGES, "ro.json")]: JSON.stringify({greeting: "Salut"}),
  [join(MESSAGES, "fr.json")]: JSON.stringify({greeting: "Bonjour", farewell: "Au revoir"}),
};

/** Workspace manifests the artifact generator reads. */
const WORKSPACE_FILES: Readonly<Record<string, string>> = {
  "package.json": JSON.stringify({name: "@arolariu/monorepo"}),
  "sites/arolariu.ro/package.json": JSON.stringify({}),
};

/**
 * Reads the SPARQL query text of a request URL.
 *
 * @param url - The request URL.
 * @returns The `query` parameter, or `""`.
 */
function sparqlQuery(url: string): string {
  return new URL(url).searchParams.get("query") ?? "";
}

/** Successful GPC, ECOICOP, and NACE responses. */
const TAXONOMY_SOURCES: readonly ScriptedHttp[] = [
  {match: (request) => request.url === "https://ref.gs1.org/standards/gpc/2026-05/", respond: {status: 200, body: "zip-archive"}},
  {
    match: (request) => sparqlQuery(request.url).includes("ecoicop2"),
    respond: {
      status: 200,
      body: JSON.stringify({results: {bindings: [{concept: {value: "e:01"}, notation: {value: "01"}, label: {value: "Food"}}]}}),
    },
  },
  {
    match: (request) => sparqlQuery(request.url).includes("nace2.1"),
    respond: {
      status: 200,
      body: JSON.stringify({results: {bindings: [{concept: {value: "n:A"}, notation: {value: "A"}, label: {value: "Farming"}}]}}),
    },
  },
];

/** Valid English GPC document the scripted extractor writes. */
const GPC_DOCUMENT = {
  LanguageCode: "EN",
  DateUtc: "2026-05-01",
  Schema: [{Level: 1, Code: 50000000, Title: "Food", Definition: null, DefinitionExcludes: null, Active: true, Childs: []}],
};

/** Harness filesystem the scripted extractor writes into, bound per test. */
interface Binding {
  fs?: FileSystem.FileSystem;
}

/**
 * Builds a harness whose leaves all succeed unless `overrides` change the fixtures.
 *
 * @param binding - Receives the harness filesystem for the scripted extractor.
 * @param overrides - Harness options replacing the defaults.
 * @returns The harness.
 */
function generateHarness(binding: Binding, overrides: TestLayerOptions = {}): TestHarness {
  return makeTestLayer({
    context: "test::generate",
    files: {".env": COMPLETE_ENV, ...SYNCHRONIZED_LOCALES, ...WORKSPACE_FILES},
    http: TAXONOMY_SOURCES,
    processes: [
      {
        match: (request) => request.command === "unzip",
        respond: (request) => {
          const outputDirectory = request.args.at(-1);
          const fs = binding.fs;
          if (outputDirectory === undefined || fs === undefined) {
            return Effect.die(new Error("The archive extraction fixture is not bound."));
          }
          return Effect.orDie(
            fs.writeFileString(join(outputDirectory, "GPC as of May 2026 (2026-05-20) EN.json"), JSON.stringify(GPC_DOCUMENT)),
          ).pipe(Effect.as({stdout: "", stderr: "", durationMs: 0}));
        },
      },
    ],
    ...overrides,
    environment: {platform: "linux", ...overrides.environment},
    clock: "test",
  });
}

/**
 * Registers one orchestrator test on a fresh harness.
 *
 * @param name - The test name.
 * @param overrides - Harness options replacing the defaults.
 * @param body - The test body; the clock and the extractor binding are set first.
 */
function generateTest(
  name: string,
  overrides: TestLayerOptions,
  body: (harness: TestHarness) => Effect.Effect<void, unknown, GenerateRequirements | TestClock.TestClock | Scope.Scope>,
): void {
  const binding: Binding = {};
  const harness = generateHarness(binding, overrides);
  effectTest(
    name,
    () =>
      Effect.gen(function* () {
        binding.fs = yield* FileSystem.FileSystem;
        yield* TestClock.setTime(FIXED_NOW);
        yield* body(harness);
      }),
    harness.layer,
  );
}

/**
 * Builds an orchestrator input selecting `tasks`.
 *
 * @param tasks - Selected task names.
 * @param verbose - Whether verbose mode is on.
 * @returns The input.
 */
function select(tasks: readonly ("env" | "i18n" | "gql" | "artifacts")[], verbose = false): GenerateInput {
  return {
    verbose,
    env: tasks.includes("env"),
    i18n: tasks.includes("i18n"),
    gql: tasks.includes("gql"),
    artifacts: tasks.includes("artifacts"),
  };
}

/**
 * Returns every output record as stream/text pairs without the trailing newline.
 *
 * @param harness - The harness that captured the run.
 * @returns The records in order.
 */
function records(harness: TestHarness): readonly Readonly<{stream: string; text: string}>[] {
  return harness.output().map(({stream, text}) => ({stream, text: text.replace(/\n$/u, "")}));
}

/**
 * Reads one harness file.
 *
 * @param path - Absolute path.
 * @returns The file text.
 */
function readText(path: string): Effect.Effect<string, unknown, FileSystem.FileSystem> {
  return Effect.flatMap(Effect.service(FileSystem.FileSystem), (fs) => fs.readFileString(path));
}

describe("runGenerate", () => {
  generateTest("characterizes the exact success lines when every selected task completes", {}, (harness) =>
    Effect.gen(function* () {
      // Act
      const result = yield* runGenerate(select(["env", "i18n", "gql", "artifacts"]));
      yield* renderGenerateCompletion(result);

      // Assert
      expect(result).toEqual({selected: ["env", "i18n", "gql", "artifacts"], completed: ["env", "i18n", "gql", "artifacts"]});
      expect(records(harness).slice(-11)).toEqual([
        {stream: "stdout", text: "[arolariu::test::generate] ℹ️ Running environment configuration generator..."},
        {stream: "stdout", text: "[arolariu::test::generate] ✅ Generated 6 environment variable(s)."},
        {stream: "stdout", text: "[arolariu::test::generate] ℹ️ Running internationalization (i18n) generator..."},
        {stream: "stdout", text: "[arolariu::test::generate] ✅ i18n synchronization completed with 0 missing key(s) added."},
        {stream: "stdout", text: "[arolariu::test::generate] ℹ️ Running GraphQL types generator..."},
        {stream: "stdout", text: "[arolariu::test::generate] ✅ GraphQL generation completed (placeholder)."},
        {stream: "stdout", text: "[arolariu::test::generate] ℹ️ Running taxonomy and license artifact generator..."},
        {stream: "stdout", text: "[arolariu::test::generate] ✅ Generated 7 artifact file(s)."},
        {stream: "stdout", text: ""},
        {stream: "stdout", text: "[arolariu::test::generate] ✅ All requested generation tasks completed."},
        {stream: "stdout", text: "   Executed 4 task(s)."},
      ]);
    }),
  );

  generateTest("runs selected tasks in fixed order", {}, (harness) =>
    Effect.gen(function* () {
      // Act
      const result = yield* runGenerate(select(["artifacts", "gql"]));

      // Assert
      expect(result).toEqual({selected: ["gql", "artifacts"], completed: ["gql", "artifacts"]});
      const texts = records(harness).map((record) => record.text);
      const gqlSummary = texts.indexOf("[arolariu::test::generate] ✅ GraphQL generation completed (placeholder).");
      const artifactsSummary = texts.indexOf("[arolariu::test::generate] ✅ Generated 7 artifact file(s).");
      expect(gqlSummary).toBeGreaterThan(-1);
      expect(artifactsSummary).toBeGreaterThan(gqlSummary);
      expect(harness.httpCalls()).toHaveLength(3);
    }),
  );

  generateTest("runs every leaf silently so the orchestrator is the only renderer", {}, (harness) =>
    Effect.gen(function* () {
      // Act
      yield* runGenerate(select(["gql", "artifacts"]));

      // Assert
      const texts = records(harness).map((record) => record.text);
      expect(texts.filter((text) => text === "🔧 Configuration:")).toHaveLength(1);
      expect(texts.filter((text) => text.includes("GraphQL generation completed"))).toHaveLength(1);
      expect(texts.some((text) => text.includes("[GPC]") || text.includes("Starting 5 artifact generator(s)."))).toBe(false);
    }),
  );

  generateTest("renders the banner and the selected-task configuration", {verbose: true}, (harness) =>
    Effect.gen(function* () {
      // Act
      yield* runGenerate(select(["gql"], true));

      // Assert
      expect(
        records(harness)
          .slice(0, 16)
          .map((record) => record.text),
      ).toEqual([
        "",
        "╔══════════════════════════════════════════════════════════════════╗",
        "║          ||arolariu.ro|| Generation Orchestrator                 ║",
        "╚══════════════════════════════════════════════════════════════════╝",
        "",
        "🔧 Configuration:",
        "",
        "   Verbose: ✅ Enabled",
        `   Working Directory: ${repositoryFixtureRoot}`,
        "   Selected Tasks:",
        "     • Env (✗)",
        "     • i18n (✗)",
        "     • GraphQL (✓)",
        "     • Artifacts (✗)",
        "",
        "[arolariu::test::generate] ℹ️ Running GraphQL types generator...",
      ]);
    }),
  );

  generateTest(
    "stops at the first failing task",
    {
      files: {".env": "", ...UNSYNCHRONIZED_LOCALES},
      environment: {variables: {INFRA: "azure"}, isCI: true},
      http: [{match: () => true, respond: {status: 503, body: "unavailable"}}],
    },
    (harness) =>
      Effect.gen(function* () {
        // Act
        const result = yield* runGenerate(select(["env", "i18n", "gql"]));

        // Assert
        expect(result).toEqual({selected: ["env", "i18n", "gql"], completed: [], failed: "env"});
        expect(yield* readText(join(MESSAGES, "ro.json"))).toBe(UNSYNCHRONIZED_LOCALES[join(MESSAGES, "ro.json")]);
        expect(records(harness).filter((record) => record.stream === "stderr")).toEqual([
          {
            stream: "stderr",
            text: "[arolariu::test::generate] ⛔ The environment configuration generator failed: exp returned 503 for /api/v1/build-time?for=website",
          },
        ]);
        expect(records(harness).some((record) => record.text.includes("Running internationalization"))).toBe(false);
      }),
  );

  generateTest("stops when the i18n generator changed locale files", {files: {...UNSYNCHRONIZED_LOCALES}}, (harness) =>
    Effect.gen(function* () {
      // Act
      const result = yield* runGenerate(select(["i18n", "gql"]));

      // Assert
      expect(result).toEqual({selected: ["i18n", "gql"], completed: [], failed: "i18n"});
      expect(JSON.parse(yield* readText(join(MESSAGES, "ro.json")))).toEqual({greeting: "Salut", farewell: ""});
      expect(records(harness).filter((record) => record.stream === "stderr")).toEqual([
        {stream: "stderr", text: "[arolariu::test::generate] ⚠️ i18n synchronization completed with 1 missing key(s) added."},
        {
          stream: "stderr",
          text: "[arolariu::test::generate] ⚠️ The internationalization (i18n) generator reported a nonzero result; later generators were skipped.",
        },
      ]);
      expect(harness.files().has(GQL_PLACEHOLDER.replaceAll("\\", "/"))).toBe(false);
    }),
  );

  generateTest("maps missing env values to the legacy abort line", {files: {".env": ""}}, (harness) =>
    Effect.gen(function* () {
      // Act
      const result = yield* runGenerate(select(["env", "gql"]));

      // Assert
      expect(result).toEqual({selected: ["env", "gql"], completed: [], failed: "env"});
      expect(records(harness).filter((record) => record.stream === "stderr")).toEqual([
        {
          stream: "stderr",
          text: "[arolariu::test::generate] ⛔ The environment configuration generator failed: Cannot request text input without an interactive terminal. Re-run setup in a TTY.",
        },
        {stream: "stderr", text: "[arolariu::test::generate] ⛔ Aborting: Missing environment variables were not provided."},
      ]);
    }),
  );

  generateTest(
    "maps a declined env confirmation to the legacy abort line",
    {files: {".env": ""}, environment: {stdinIsTTY: true}, prompts: [false]},
    (harness) =>
      Effect.gen(function* () {
        // Act
        const result = yield* runGenerate(select(["env"]));

        // Assert
        expect(result).toEqual({selected: ["env"], completed: [], failed: "env"});
        expect(records(harness).filter((record) => record.stream === "stderr")).toEqual([
          {stream: "stderr", text: "[arolariu::test::generate] ⛔ Aborting: Missing environment variables were not provided."},
        ]);
      }),
  );

  generateTest("propagates a terminal quit from a leaf unchanged", {files: {".env": ""}, environment: {stdinIsTTY: true}}, (harness) =>
    Effect.gen(function* () {
      // Arrange
      const quit = new Terminal.QuitError();
      const quitting = Prompts.of({
        confirm: () => Effect.fail(quit),
        select: () => Effect.fail(quit),
        text: () => Effect.fail(quit),
        secret: () => Effect.fail(quit),
      });

      // Act
      const error = yield* Effect.flip(runGenerate(select(["env", "gql"])).pipe(Effect.provideService(Prompts, quitting)));

      // Assert
      expect(error).toBe(quit);
      expect(records(harness).some((record) => record.stream === "stderr")).toBe(false);
      expect(harness.files().has(GQL_PLACEHOLDER.replaceAll("\\", "/"))).toBe(false);
    }),
  );

  generateTest("propagates interruption of a running leaf", {environment: {variables: {INFRA: "azure"}, isCI: true}}, (harness) =>
    Effect.gen(function* () {
      // Arrange
      const hanging = HttpClient.make(() => Effect.never);
      const fiber = yield* Effect.forkChild(
        runGenerate(select(["env", "gql"])).pipe(Effect.provideService(HttpClient.HttpClient, hanging)),
      );
      yield* Effect.promise(() => new Promise<void>((settle) => setTimeout(settle, 0)));

      // Act
      const exit = yield* Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber)));

      // Assert
      expect(Exit.hasInterrupts(exit)).toBe(true);
      expect(records(harness).some((record) => record.stream === "stderr")).toBe(false);
    }),
  );

  generateTest("characterizes the exact no-task human tail: one warning, one tip, and no completion line", {}, (harness) =>
    Effect.gen(function* () {
      // Act
      const result = yield* runGenerate(select([]));
      yield* renderGenerateCompletion(result);

      // Assert
      expect(result).toEqual({selected: [], completed: []});
      expect(records(harness).slice(-3)).toEqual([
        {stream: "stdout", text: ""},
        {stream: "stderr", text: "[arolariu::test::generate] ⚠️ No generation tasks selected. Nothing to do."},
        {stream: "stdout", text: "   Tip: Pass one or more tasks (e.g. npm run generate -- env i18n gql artifacts)."},
      ]);
      expect(harness.processCalls()).toEqual([]);
      expect(harness.httpCalls()).toEqual([]);
    }),
  );
});

describe("generate shims", () => {
  {
    const binding: Binding = {};
    const harness = generateHarness(binding, {mode: "silent"});
    effectTest(
      "generate shims stay invocable by legacy callers",
      () =>
        Effect.gen(function* () {
          // Arrange
          const invoker = makeGenerateInvoker(() => harness.layer);

          // Act
          const execution = yield* Effect.promise(() =>
            invoker.invoke({verbose: false, env: false, i18n: false, gql: true, artifacts: false}, {presentation: "silent"}),
          );

          // Assert
          expect(execution).toEqual({status: "completed", value: {selected: ["gql"], completed: ["gql"]}, exitCode: 0});
          expect(harness.output()).toEqual([]);
        }),
      makeTestLayer().layer,
    );
  }

  {
    const harness = generateHarness({}, {mode: "silent", files: {...UNSYNCHRONIZED_LOCALES}});
    effectTest(
      "maps a stopped run to the legacy exit code 1",
      () =>
        Effect.gen(function* () {
          // Act
          const execution = yield* Effect.promise(() =>
            makeGenerateInvoker(() => harness.layer).invoke(select(["i18n"]), {presentation: "silent"}),
          );

          // Assert
          expect(execution).toEqual({status: "completed", value: {selected: ["i18n"], completed: [], failed: "i18n"}, exitCode: 1});
        }),
      makeTestLayer().layer,
    );
  }

  effectTest(
    "exposes the production generate shim",
    () =>
      Effect.gen(function* () {
        // Act
        const execution = yield* Effect.promise(() => generateCommand.invoke(select([]), {presentation: "silent"}));

        // Assert
        expect(execution).toEqual({status: "completed", value: {selected: [], completed: []}, exitCode: 0});
      }),
    makeTestLayer().layer,
  );
});
