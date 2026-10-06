// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `test` command group.
 * @module scripts/commands/e2e/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness with Newman scripted as the
 * `npx` process; no module is mocked.
 */

import {dirname, join} from "node:path";

import {Effect, FileSystem, Option} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import type {SinkRecord} from "../../platform/Output.ts";
import type {ProcessRequest} from "../../platform/Process.ts";
import {normalizeFixturePath} from "../../platform/testing.fs.ts";
import {makeTestLayer, processOutcomeEffect, repositoryFixtureRoot, runScoped, type TestHarness} from "../../platform/testing.ts";
import type {ProbeOutcome} from "../../inspection/probes.ts";
import {makeE2eCommand} from "./cli.ts";

/** Deliberately non-JWT-shaped fake secret; it must never reach any rendered output. */
const FAKE_TOKEN = "e2e-cli-secret-value";

/** Every target's site directory. */
const SITES = ["sites/api.arolariu.ro", "sites/arolariu.ro", "sites/cv.arolariu.ro"] as const;

/**
 * Reads the value that follows a flag in a Newman argument vector.
 *
 * @param request - The Newman request.
 * @param flag - The flag.
 * @returns The value.
 */
function argumentAfter(request: ProcessRequest, flag: string): string {
  const value = request.args[request.args.indexOf(flag) + 1];
  if (value === undefined) {
    throw new Error(`missing ${flag}`);
  }
  return value;
}

/**
 * Builds a harness whose Newman writes token-bearing reports and output, then settles with `outcome`.
 *
 * @param outcome - The Newman outcome.
 * @param malformed - Whether the JSON report is malformed (unparseable) instead.
 * @returns The harness.
 */
function e2eHarness(outcome: ProbeOutcome, malformed = false): TestHarness {
  const files: Record<string, string> = {};
  for (const site of SITES) {
    files[join(repositoryFixtureRoot, site, "postman-collection.json")] = "{}";
    files[join(repositoryFixtureRoot, site, "postman-environment.production.json")] = "{}";
  }
  return makeTestLayer({
    environment: {variables: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN}},
    files,
    processes: [
      {
        match: (request) => request.command === "npx",
        respond: (request) =>
          Effect.gen(function* () {
            const token = request.args.find((arg) => arg.startsWith("authToken="))?.slice("authToken=".length) ?? "none";
            const fs = yield* Effect.serviceOption(FileSystem.FileSystem);
            if (Option.isNone(fs)) {
              return yield* Effect.die(new Error("scripted Newman has no filesystem"));
            }
            const jsonPath = argumentAfter(request, "--reporter-json-export");
            yield* Effect.orDie(fs.value.makeDirectory(dirname(jsonPath), {recursive: true}));
            yield* Effect.orDie(
              fs.value.writeFileString(
                jsonPath,
                malformed
                  ? `{"authToken": "${token}", oops`
                  : JSON.stringify({
                      run: {failures: [{assertion: `Token ${token}`, error: `rejected ${token}`}]},
                      environment: {authToken: token},
                    }),
              ),
            );
            yield* Effect.orDie(fs.value.writeFileString(argumentAfter(request, "--reporter-junit-export"), `<x>authToken=${token}</x>`));
            return yield* processOutcomeEffect(request, outcome);
          }),
      },
    ],
  });
}

/**
 * Runs the root command with the `test` group against `argv`.
 *
 * @param argv - Arguments after the program name.
 * @param outcome - The Newman outcome.
 * @param malformed - Whether Newman writes a malformed JSON report.
 * @returns The exit code, the harness, and the output records without their trailing newline.
 */
async function run(
  argv: readonly string[],
  outcome: ProbeOutcome = {kind: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 0},
  malformed = false,
): Promise<{code: CommandExitCode; harness: TestHarness; output: readonly SinkRecord[]}> {
  const harness = e2eHarness(outcome, malformed);
  const exit = await runScoped(Effect.exit(runCli(argv, makeRootCommand([makeE2eCommand()]))), harness.layer);
  const portable = (text: string): string => text.replaceAll(repositoryFixtureRoot, "<root>").replaceAll("\\", "/");
  return {
    code: exitCodeFor(exit, undefined),
    harness,
    output: harness.output().map((record) => ({stream: record.stream, text: portable(record.text.replace(/\n$/u, ""))})),
  };
}

/**
 * Every report the harness filesystem holds, keyed by file name.
 *
 * @param harness - The harness.
 * @returns The report contents.
 */
function reports(harness: TestHarness): Readonly<Record<string, string>> {
  const directory = `${normalizeFixturePath(join(repositoryFixtureRoot, "e2e-logs"))}/`;
  const found: Record<string, string> = {};
  for (const [path, value] of harness.files()) {
    if (path.startsWith(directory)) {
      found[path.slice(directory.length)] = typeof value === "string" ? value : new TextDecoder().decode(value);
    }
  }
  return found;
}

describe("test e2e command", () => {
  it("maps the target", async () => {
    // Arrange
    const argv = ["test", "e2e", "cv"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.harness.processCalls().map((call) => call.request.args[2])).toEqual([
      join(repositoryFixtureRoot, "sites/cv.arolariu.ro", "postman-collection.json"),
    ]);
  });

  it("rejects an unknown target", async () => {
    // Arrange
    const argv = ["test", "e2e", "mobile"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.harness.processCalls()).toEqual([]);
  });

  it("requires a target", async () => {
    // Arrange
    const argv = ["test", "e2e"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.harness.processCalls()).toEqual([]);
  });
});

const HEADER: readonly SinkRecord[] = [
  {stream: "stdout", text: ""},
  {stream: "stdout", text: "🎯 arolariu.ro E2E Test Runner"},
  {stream: "stdout", text: ""},
  {stream: "stdout", text: ""},
  {stream: "stdout", text: "🧪 E2E Testing: backend"},
  {stream: "stdout", text: ""},
  {stream: "stdout", text: "Collection: <root>/sites/api.arolariu.ro/postman-collection.json"},
  {stream: "stdout", text: "Environment: <root>/sites/api.arolariu.ro/postman-environment.production.json (production)"},
  {stream: "stdout", text: "JSON report: <root>/e2e-logs/newman-backend.json"},
  {stream: "stdout", text: "JUnit report: <root>/e2e-logs/newman-backend.xml"},
  {stream: "stdout", text: "Timeout: 600000ms (request: 30000ms, script: 10000ms)"},
  {stream: "stdout", text: "Strict mode (--bail): false"},
];

const CLEANUP: readonly SinkRecord[] = [
  {stream: "stderr", text: "[arolariu::test:e2e::backend] ⚠️ 1 failed assertion(s) for backend."},
  {stream: "stdout", text: "[arolariu::test:e2e::backend] ℹ️ Summary written to: <root>/e2e-logs/newman-backend-summary.md"},
  {
    stream: "stdout",
    text: "[arolariu::test:e2e::backend] ℹ️ Sanitized Newman JSON report (3 redaction(s)): <root>/e2e-logs/newman-backend.json",
  },
  {
    stream: "stdout",
    text: "[arolariu::test:e2e::backend] ℹ️ Sanitized text report (1 redaction pass(es)): <root>/e2e-logs/newman-backend.xml",
  },
  {
    stream: "stdout",
    text: "[arolariu::test:e2e::backend] ℹ️ Sanitized text report (1 redaction pass(es)): <root>/e2e-logs/newman-backend-summary.md",
  },
];

/** A failing Newman run whose captured output carries the token. */
const FAILING_NEWMAN: ProbeOutcome = {
  kind: "exited",
  exitCode: 1,
  stdout: `→ GET /invoices?token=${FAKE_TOKEN}\n`,
  stderr: `AssertionError: rejected ${FAKE_TOKEN}\n`,
  durationMs: 0,
};

/** The single failure document of {@link FAILING_NEWMAN} under `--json`. */
const FAILURE_DOCUMENT = JSON.stringify(
  {
    status: "failed",
    kind: "operational",
    message: "Newman exited with code 1 for backend.",
    evidence: ["stdout: → GET /invoices?token=[REDACTED]\n", "stderr: AssertionError: rejected [REDACTED]\n"],
  },
  null,
  2,
);

describe("test e2e through runCli (Effect; intentional changes from the runLegacy pins)", () => {
  it("prints the redacted Newman output and one failure line without the command line, and exits 1", async () => {
    const result = await run(["test", "e2e", "backend"], FAILING_NEWMAN);

    expect(result).toMatchObject({code: 1});
    expect(result.output).toEqual([
      ...HEADER,
      {stream: "stdout", text: "→ GET /invoices?token=[REDACTED]"},
      {stream: "stderr", text: "AssertionError: rejected [REDACTED]"},
      ...CLEANUP,
      {stream: "stderr", text: "[arolariu::test:e2e] ⛔ Newman exited with code 1 for backend."},
    ]);
  });

  it("prints exactly one failure document (plus the plain stderr diagnostic) and exits 1 under --json when Newman fails", async () => {
    const result = await run(["test", "e2e", "backend", "--json"], FAILING_NEWMAN);

    expect(result.code).toBe(1);
    expect(result.harness.output()).toEqual([
      {stream: "stdout", text: `${FAILURE_DOCUMENT}\n`},
      {stream: "stderr", text: "Newman exited with code 1 for backend.\n"},
    ]);
  });

  it("prints exactly one result document and exits 0 under --json when Newman passes", async () => {
    const result = await run(["test", "e2e", "backend", "--json"]);

    expect(result.code).toBe(0);
    expect(result.output).toEqual([{stream: "stdout", text: JSON.stringify({targets: ["backend"], completed: ["backend"]}, null, 2)}]);
  });

  it.each([
    ["human", [] as readonly string[]],
    ["--verbose", ["--verbose"]],
    ["--json", ["--json"]],
    ["--json --verbose", ["--json", "--verbose"]],
  ] as const)("never writes the auth token when Newman fails (%s)", async (_label, flags) => {
    const result = await run(["test", "e2e", "backend", ...flags], FAILING_NEWMAN);

    expect(result.code).toBe(1);
    expect(result.harness.processCalls()[0]?.request.args).toContain(`authToken=${FAKE_TOKEN}`);
    expect(result.harness.output().filter((record) => record.text.includes(FAKE_TOKEN))).toEqual([]);
    const written = reports(result.harness);
    expect(Object.keys(written).sort()).toEqual(["newman-backend-summary.md", "newman-backend.json", "newman-backend.xml"]);
    for (const content of Object.values(written)) {
      expect(content).not.toContain(FAKE_TOKEN);
    }
    const stdout = result.harness.output().filter((record) => record.stream === "stdout");
    if ((flags as readonly string[]).includes("--json")) {
      expect(stdout.map((record) => record.text)).toEqual([`${FAILURE_DOCUMENT}\n`]);
    } else {
      expect(result.output.at(-1)).toEqual({stream: "stderr", text: "[arolariu::test:e2e] ⛔ Newman exited with code 1 for backend."});
    }
  });

  it.each([
    ["human", [] as readonly string[]],
    ["--json", ["--json"]],
  ] as const)("appends a redacted report-cleanup failure to the Newman failure (%s)", async (label, flags) => {
    const result = await run(["test", "e2e", "backend", ...flags], FAILING_NEWMAN, true);

    expect(result.code).toBe(1);
    expect(result.harness.output().filter((record) => record.text.includes(FAKE_TOKEN))).toEqual([]);
    const cleanupLine = (text: string): boolean => text.startsWith("Report cleanup failed for backend:\nassertion summary: ");
    if (label === "human") {
      const fatal = result.output.findIndex((record) => record.text === "[arolariu::test:e2e] ⛔ Newman exited with code 1 for backend.");
      expect(fatal).toBeGreaterThan(0);
      expect(result.output.slice(fatal + 1).map((record) => record.stream)).toEqual(["stderr"]);
      expect(cleanupLine(result.output[fatal + 1]?.text ?? "")).toBe(true);
      expect(result.output[fatal + 1]?.text).toContain("JSON report sanitization: Failed to parse Newman JSON report, removed it: ");
    } else {
      const stdout = result.harness.output().filter((record) => record.stream === "stdout");
      expect(stdout).toHaveLength(1);
      const document = JSON.parse(stdout[0]?.text ?? "") as {readonly message: string; readonly evidence: readonly string[]};
      expect(document.message).toBe("Newman exited with code 1 for backend.");
      expect(document.evidence.slice(0, 2)).toEqual([
        "stdout: → GET /invoices?token=[REDACTED]\n",
        "stderr: AssertionError: rejected [REDACTED]\n",
      ]);
      expect(document.evidence).toHaveLength(3);
      expect(cleanupLine(document.evidence[2] ?? "")).toBe(true);
    }
  });
});
