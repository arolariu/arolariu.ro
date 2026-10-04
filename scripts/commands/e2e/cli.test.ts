// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `test` command group.
 * @module scripts/commands/e2e/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness. The recording invoker is a
 * plain object implementing `CommandInvoker`, the legacy composition boundary; no module is mocked.
 */

import {join} from "node:path";

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import type {CommandInvoker, CommandRuntimeFactory} from "../../common/commander.ts";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../../common/logger.ts";
import type {ProcessOutcome} from "../../common/runner.ts";
import {
  createMemoryFileSystem,
  createProcessRunner,
  createTestRuntimeFactory,
  repositoryFixtureRoot,
} from "../../common/runtime.testing.ts";
import type {CommandRuntime} from "../../common/runtime.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import {makeTestLayer} from "../../platform/testing.ts";
import {createE2eCommand, type E2EInput} from "./index.ts";
import {makeE2eCommand} from "./cli.ts";

/**
 * Runs `test` against `argv` with an invoker that records every input it receives.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code and the recorded inputs.
 */
async function run(argv: readonly string[]): Promise<{code: CommandExitCode; inputs: readonly Readonly<E2EInput>[]}> {
  const inputs: Readonly<E2EInput>[] = [];
  const invoker: CommandInvoker<E2EInput, null> = {
    invoke: async (input) => {
      inputs.push(input);
      return {status: "completed", value: null, exitCode: 0};
    },
  };
  const harness = makeTestLayer();
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeE2eCommand(invoker)])).pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), inputs};
}

describe("test e2e command", () => {
  it("maps the target", async () => {
    // Arrange
    const argv = ["test", "e2e", "backend"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result).toEqual({code: 0, inputs: [{target: "backend"}]});
  });

  it("rejects an unknown target", async () => {
    // Arrange
    const argv = ["test", "e2e", "mobile"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result).toEqual({code: 2, inputs: []});
  });

  it("requires a target", async () => {
    // Arrange
    const argv = ["test", "e2e"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result).toEqual({code: 2, inputs: []});
  });
});

/** Deliberately non-JWT-shaped fake secret; it must never reach any rendered output. */
const FAKE_TOKEN = "e2e-cli-secret-value";

/**
 * Creates a legacy runtime factory whose logger honors the invocation presentation, like the Node
 * factory `runLegacy` reaches in production.
 *
 * @param sink - Sink receiving every legacy logger record.
 * @param overrides - Legacy runtime capabilities.
 * @returns The runtime factory.
 */
function presentationRuntimeFactory(sink: InMemoryLoggerSink, overrides: Readonly<Partial<CommandRuntime>>): CommandRuntimeFactory {
  return {
    createRoot: (options) =>
      createTestRuntimeFactory({
        ...overrides,
        logger: new MonorepositoryConsoleLogger("test:e2e", {mode: options.presentation, color: false, sink}),
      }).createRoot(options),
    createChild: (parent, options) => createTestRuntimeFactory(overrides).createChild(parent, options),
  };
}

/**
 * Runs `test e2e backend` end to end through `runLegacy` and the real legacy E2E command, with
 * Newman replaced by one scripted outcome.
 *
 * @param argv - Arguments after the program name.
 * @param outcome - Scripted Newman outcome.
 * @returns The exit code, the effect-side sink records, and the legacy logger records.
 */
async function runLegacyE2e(
  argv: readonly string[],
  outcome: ProcessOutcome,
): Promise<{code: CommandExitCode; cliOutput: readonly unknown[]; legacyOutput: readonly unknown[]}> {
  const directory = join(repositoryFixtureRoot, "sites", "api.arolariu.ro");
  const files = createMemoryFileSystem({
    [join(directory, "postman-collection.json")]: "{}",
    [join(directory, "postman-environment.production.json")]: "{}",
  });
  const sink = new InMemoryLoggerSink();
  const legacy = createE2eCommand(
    presentationRuntimeFactory(sink, {
      files,
      runner: createProcessRunner([outcome]),
      environment: {
        variables: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN},
        cwd: repositoryFixtureRoot,
        executablePath: "/usr/bin/node",
        platform: "linux",
        architecture: "x64",
        stdinIsTTY: false,
        stdoutIsTTY: false,
        isCI: true,
      },
    }),
  );
  const harness = makeTestLayer();
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeE2eCommand(legacy)])).pipe(Effect.provide(harness.layer)));
  const portable = (text: string): string => text.replaceAll(repositoryFixtureRoot, "<root>").replaceAll("\\", "/");
  return {
    code: exitCodeFor(exit, undefined),
    cliOutput: harness.output().map((record) => ({...record, text: portable(record.text)})),
    legacyOutput: sink.records.map((record) => ({...record, text: portable(record.text)})),
  };
}

describe("test e2e characterization through runLegacy (pre-Effect migration)", () => {
  it("prints the legacy human failure and exits 1 when Newman fails, without the token", async () => {
    const result = await runLegacyE2e(["test", "e2e", "backend"], {kind: "exited", exitCode: 1, stdout: "", stderr: "", durationMs: 0});

    expect(result).toEqual({
      code: 1,
      cliOutput: [],
      legacyOutput: [
        {
          stream: "stdout",
          text: "",
          write: false,
        },
        {
          stream: "stdout",
          text: "🎯 arolariu.ro E2E Test Runner",
          write: false,
        },
        {
          stream: "stdout",
          text: "",
          write: false,
        },
        {
          stream: "stdout",
          text: "",
          write: false,
        },
        {
          stream: "stdout",
          text: "🧪 E2E Testing: backend",
          write: false,
        },
        {
          stream: "stdout",
          text: "",
          write: false,
        },
        {
          stream: "stdout",
          text: "Collection: <root>/sites/api.arolariu.ro/postman-collection.json",
          write: false,
        },
        {
          stream: "stdout",
          text: "Environment: <root>/sites/api.arolariu.ro/postman-environment.production.json (production)",
          write: false,
        },
        {
          stream: "stdout",
          text: "JSON report: <root>/e2e-logs/newman-backend.json",
          write: false,
        },
        {
          stream: "stdout",
          text: "JUnit report: <root>/e2e-logs/newman-backend.xml",
          write: false,
        },
        {
          stream: "stdout",
          text: "Timeout: 600000ms (request: 30000ms, script: 10000ms)",
          write: false,
        },
        {
          stream: "stdout",
          text: "Strict mode (--bail): false",
          write: false,
        },
        {
          stream: "stderr",
          text: "[arolariu::test:e2e::backend] ⚠️ JSON report not found, cannot create summary: <root>/e2e-logs/newman-backend.json",
          write: false,
        },
        {
          stream: "stderr",
          text: "[arolariu::test:e2e] ⛔ Process exited with code 1: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\ncommand: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\noutcome: exited",
          write: false,
        },
      ],
    });
    expect(JSON.stringify(result).includes(FAKE_TOKEN)).toBe(false);
  });

  it("prints only the plain legacy diagnostic and exits 1 under --json when Newman fails, without the token", async () => {
    const result = await runLegacyE2e(["test", "e2e", "backend", "--json"], {
      kind: "exited",
      exitCode: 1,
      stdout: "",
      stderr: "",
      durationMs: 0,
    });

    expect(result).toEqual({
      code: 1,
      cliOutput: [],
      legacyOutput: [
        {
          stream: "stderr",
          text: "Process exited with code 1: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\ncommand: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\noutcome: exited",
          write: false,
        },
      ],
    });
    expect(JSON.stringify(result).includes(FAKE_TOKEN)).toBe(false);
  });

  it("exits 1 under --json even when Newman passes, because legacy has no JSON document", async () => {
    const result = await runLegacyE2e(["test", "e2e", "backend", "--json"], {
      kind: "succeeded",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 0,
    });

    expect(result).toEqual({
      code: 1,
      cliOutput: [],
      legacyOutput: [
        {
          stream: "stderr",
          text: 'Command "test:e2e" selected JSON presentation without a JSON document.',
          write: false,
        },
      ],
    });
  });
});
