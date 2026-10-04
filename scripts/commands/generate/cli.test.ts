// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `generate` subcommand.
 * @module scripts/commands/generate/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness: seeded locale files and
 * `.env`, scripted exp responses, and the test clock drive the real leaf generators. No module is
 * mocked.
 */

import {join} from "node:path";

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import type {SinkRecord} from "../../platform/Output.ts";
import {makeTestLayer, repositoryFixtureRoot, type TestLayerOptions} from "../../platform/testing.ts";
import {makeGenerateCommand} from "./cli.ts";

/** Locale directory read by the i18n generator. */
const MESSAGES = join(repositoryFixtureRoot, "sites", "arolariu.ro", "messages");

/** Locale files whose keys already match English. */
const LOCALES: Readonly<Record<string, string>> = {
  [join(MESSAGES, "en.json")]: JSON.stringify({greeting: "Hello"}),
  [join(MESSAGES, "ro.json")]: JSON.stringify({greeting: "Salut"}),
  [join(MESSAGES, "fr.json")]: JSON.stringify({greeting: "Bonjour"}),
};

/** Outcome of one `generate` invocation. */
interface GenerateRun {
  readonly code: CommandExitCode;
  readonly output: readonly SinkRecord[];
  readonly texts: readonly string[];
}

/**
 * Runs `generate` against `argv` on a fresh harness.
 *
 * @param argv - Arguments after the program name.
 * @param options - Harness options; defaults seed the locale files.
 * @returns The exit code and every sink record.
 */
async function run(argv: readonly string[], options: TestLayerOptions = {}): Promise<GenerateRun> {
  const harness = makeTestLayer({files: LOCALES, ...options});
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeGenerateCommand()])).pipe(Effect.provide(harness.layer)));
  const output = harness.output();
  return {code: exitCodeFor(exit, undefined), output, texts: output.map((record) => record.text.replace(/\n$/u, ""))};
}

describe("generate command", () => {
  it("maps generate task names regardless of order and completes with exit 0", async () => {
    // Act
    const result = await run(["generate", "gql", "i18n"]);

    // Assert
    expect(result.code).toBe(0);
    expect(result.texts).toEqual(
      expect.arrayContaining([
        "   Verbose: ❌ Disabled",
        "     • Env (✗)",
        "     • i18n (✓)",
        "     • GraphQL (✓)",
        "     • Artifacts (✗)",
      ]),
    );
    expect(result.texts.indexOf("[arolariu::generate] ℹ️ Running internationalization (i18n) generator...")).toBeLessThan(
      result.texts.indexOf("[arolariu::generate] ℹ️ Running GraphQL types generator..."),
    );
    expect(result.texts.slice(-3)).toEqual([
      "",
      "[arolariu::generate] ✅ All requested generation tasks completed.",
      "   Executed 2 task(s).",
    ]);
  });

  it("fails with exit 1 and the stop line when the env task fails, honoring the global verbose flag", async () => {
    // Act
    const result = await run(["generate", "env", "--verbose"], {
      files: {".env": ""},
      environment: {variables: {INFRA: "azure"}, isCI: true},
      http: [{match: () => true, respond: {status: 503, body: "unavailable"}}],
    });

    // Assert
    expect(result.code).toBe(1);
    expect(result.texts).toContain("   Verbose: ✅ Enabled");
    expect(result.output.filter((record) => record.stream === "stderr").map((record) => record.text)).toEqual([
      "[arolariu::generate] ⛔ The environment configuration generator failed: exp returned 503 for /api/v1/build-time?for=website\n",
      "[arolariu::generate] ⛔ Generation stopped at the Env task.\n",
    ]);
    expect(result.texts.some((text) => text.includes("All requested generation tasks completed"))).toBe(false);
  });

  it("keeps the no-selection behavior: a warning, a tip, and exit 0", async () => {
    // Act
    const result = await run(["generate"]);

    // Assert
    expect(result.code).toBe(0);
    expect(result.texts).toEqual(
      expect.arrayContaining(["     • Env (✗)", "     • i18n (✗)", "     • GraphQL (✗)", "     • Artifacts (✗)"]),
    );
    expect(result.texts.slice(-2)).toEqual([
      "[arolariu::generate] ⚠️ No generation tasks selected. Nothing to do.",
      "   Tip: Pass one or more tasks (e.g. npm run generate -- env i18n gql artifacts).",
    ]);
  });

  it("writes the result as the single JSON document in --json mode", async () => {
    // Act
    const result = await run(["generate", "i18n", "--json"]);

    // Assert
    expect(result.code).toBe(0);
    expect(result.output).toEqual([{stream: "stdout", text: `${JSON.stringify({selected: ["i18n"], completed: ["i18n"]}, null, 2)}\n`}]);
  });

  it("rejects unknown tasks", async () => {
    // Act
    const result = await run(["generate", "nope"]);

    // Assert
    expect(result.code).toBe(2);
    expect(result.texts.some((text) => text.includes("Generation Orchestrator"))).toBe(false);
  });
});
