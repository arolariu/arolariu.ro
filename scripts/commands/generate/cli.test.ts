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
import {pinnedTaxonomyFixtureFiles} from "../../common/taxonomy-fixtures.testing.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import type {SinkRecord} from "../../platform/Output.ts";
import {makeTestLayer, repositoryFixtureRoot, type TestHarness, type TestLayerOptions} from "../../platform/testing.ts";
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
  readonly files: TestHarness["files"];
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
  return {code: exitCodeFor(exit, undefined), output, texts: output.map((record) => record.text.replace(/\n$/u, "")), files: harness.files};
}

describe("generate command", () => {
  it.each([
    ["--check-taxonomies", "--refresh-taxonomies", "--output-dir", "candidate"],
    ["--check-taxonomies", "artifacts"],
    ["--refresh-taxonomies", "--output-dir", "candidate", "--website-licenses-only"],
    ["--refresh-taxonomies"],
    ["--output-dir", "candidate"],
  ])("rejects incompatible or incomplete taxonomy options (%j)", async (...options) => {
    const result = await run(["generate", ...options]);

    expect(result.code).toBe(2);
    expect(result.texts.join("\n")).toMatch(/cannot be combined|requires|only valid with/u);
  });

  it.each([
    ["1969-07-02T00:00:00.000Z", "Fresh", "", "🟢"],
    ["1969-07-01T00:00:00.000Z", "Review due", "\u001b[33m", "🟡"],
    ["1969-01-01T00:00:00.000Z", "Refresh overdue", "\u001b[31m", "🔴"],
    ["1970-01-02T00:00:00.000Z", "Unknown age", "", "⚪"],
  ] as const)("checks age %s without failing CI", async (generatedAt, label, color, marker) => {
    const files = pinnedTaxonomyFixtureFiles(repositoryFixtureRoot, generatedAt);
    const summary = join(repositoryFixtureRoot, "summary.md");

    const result = await run(["generate", "--check-taxonomies"], {
      files,
      environment: {isCI: true, variables: {GITHUB_ACTIONS: "true", GITHUB_STEP_SUMMARY: summary}},
    });

    expect(result.code).toBe(0);
    expect(result.texts.filter((line) => line.startsWith("::warning::"))).toHaveLength(label === "Fresh" ? 0 : 3);
    expect(result.texts.join("\n")).toContain(`${color}${label}`);
    const summaryFile = [...result.files()].find(([path]) => path.endsWith("summary.md"));
    expect(summaryFile?.[1]).toContain(`| NACE_2_1 2.1 | ${generatedAt} | ${marker} ${label} |`);
    if (label === "Refresh overdue") expect(result.texts.join("\n")).not.toContain("Review due");
  });

  it("fails integrity separately from age", async () => {
    const result = await run(["generate", "--check-taxonomies"]);

    expect(result.code).toBe(1);
    expect(result.texts.join("\n")).toContain("Missing or unreadable taxonomy snapshot");
  });

  it("rejects mixing website-only attribution with unrelated generators", async () => {
    const result = await run(["generate", "env", "--website-licenses-only"]);

    expect(result.code).toBe(2);
    expect(result.texts.some((text) => text.includes("--website-licenses-only cannot be combined with generator tasks."))).toBe(true);
  });

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
