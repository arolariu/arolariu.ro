// @vitest-environment node
/**
 * @fileoverview Tests for the declarative E2E command and its report-cleanup helpers.
 * @module scripts/test-e2e.test
 *
 * @remarks
 * Every scenario runs through deterministic in-memory fixtures: {@link createE2eCommand}
 * scenarios run through the declarative command runtime's test factory with a fake
 * {@link AbstractProcessRunner} that simulates Newman's reporter output instead of spawning a
 * real Newman process, and the exported sanitization/summary helpers are exercised directly
 * against a fake {@link FileSystem}. No test in this file touches real disk, spawns a real
 * process, or mutates `process.env`/`process.argv`.
 */

import {dirname, join} from "node:path";
import {describe, expect, it} from "vitest";

import type {CommandExecution, CommandPresentation, CommandRuntimeFactory} from "./common/commander.ts";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import {AbstractProcessRunner, RunnerError, type ProcessOutcome, type ProcessRequest, type ProcessRunOptions} from "./common/runner.ts";
import {createMemoryFileSystem, createTestRuntimeFactory, repositoryFixtureRoot} from "./common/runtime.testing.ts";
import {CommandCancellation, type CommandRuntime, type FileSystem, type RuntimeEnvironment} from "./common/runtime.ts";
import {
  createE2eCommand,
  redactSensitiveString,
  sanitizeJsonValue,
  sanitizeNewmanJsonReport,
  sanitizeNewmanTextReport,
  writeAssertionSummary,
  type E2ETarget,
} from "./test-e2e.ts";

/** Deliberately non-JWT-shaped fake secret used for exact-match and `--env-var` transport proofs. */
const FAKE_TOKEN = "e2e-test-secret-value";

/** Every runnable target's fixture directory, matching the production target configuration. */
const TARGET_DIRS = {backend: "sites/api.arolariu.ro", frontend: "sites/arolariu.ro", cv: "sites/cv.arolariu.ro"} as const;

/**
 * Generates a synthetic JWT-shaped token at runtime (harmless header/payload, fake signature).
 */
function generateSyntheticJwt(): string {
  const header = Buffer.from(JSON.stringify({alg: "HS256", typ: "JWT"})).toString("base64url");
  const payload = Buffer.from(JSON.stringify({sub: "test-user", iat: 1234567890, exp: 9999999999})).toString("base64url");
  const signature = Buffer.from("test-signature-not-a-real-secret").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

/** Builds an in-memory fixture filesystem seeded with every target's collection and environment file. */
function fixtureFiles(overrides: Readonly<Record<string, string>> = {}): FileSystem {
  const seeded: Record<string, string> = {};
  for (const directory of Object.values(TARGET_DIRS)) {
    seeded[join(repositoryFixtureRoot, directory, "postman-collection.json")] = JSON.stringify({info: {name: "test"}, item: []});
    seeded[join(repositoryFixtureRoot, directory, "postman-environment.production.json")] = JSON.stringify({name: "env", values: []});
  }
  return createMemoryFileSystem({...seeded, ...overrides});
}

/** Builds a deterministic {@link RuntimeEnvironment} anchored to the fixture repository root. */
function testEnvironment(variables: Readonly<Record<string, string>> = {}): RuntimeEnvironment {
  return {
    variables,
    cwd: repositoryFixtureRoot,
    executablePath: "/usr/bin/node",
    platform: "linux",
    architecture: "x64",
    stdinIsTTY: false,
    stdoutIsTTY: false,
    isCI: true,
  };
}

function succeeded(patch: Readonly<{stdout?: string; stderr?: string}> = {}): ProcessOutcome {
  return {kind: "succeeded", exitCode: 0, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function exited(exitCode: number, patch: Readonly<{stdout?: string; stderr?: string}> = {}): ProcessOutcome {
  return {kind: "exited", exitCode, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function timedOut(): ProcessOutcome {
  return {kind: "timed-out", stdout: "", stderr: "", durationMs: 1};
}

function spawnFailed(message: string, patch: Readonly<{stdout?: string; stderr?: string}> = {}): ProcessOutcome {
  return {kind: "spawn-failed", message, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function cancelledOutcome(): ProcessOutcome {
  return {kind: "cancelled", stdout: "", stderr: "", durationMs: 1};
}

/** One recorded invocation of {@link FakeNewmanRunner}. */
type RecordedCall = Readonly<{request: ProcessRequest; options: ProcessRunOptions}>;

/**
 * Fake {@link AbstractProcessRunner} that records every invocation and, instead of spawning
 * Newman, optionally writes token-bearing JSON/JUnit reporter artifacts to the exact paths Newman
 * would have been given — but only when the simulated process actually completed (`succeeded` or
 * `exited`), matching real Newman's behavior of writing reporters even when assertions fail.
 */
class FakeNewmanRunner extends AbstractProcessRunner {
  readonly #files: FileSystem;
  readonly #outcomeFor: (
    request: Readonly<ProcessRequest>,
    options: Readonly<ProcessRunOptions>,
  ) => ProcessOutcome | Promise<ProcessOutcome>;
  readonly #artifactToken: string | undefined;
  readonly #artifactOutcomeKinds: readonly ProcessOutcome["kind"][];
  readonly #calls: RecordedCall[] = [];

  public constructor(
    files: FileSystem,
    options: Readonly<{
      outcomeFor?: (request: Readonly<ProcessRequest>, runOptions: Readonly<ProcessRunOptions>) => ProcessOutcome | Promise<ProcessOutcome>;
      artifactToken?: string;
      artifactOutcomeKinds?: readonly ProcessOutcome["kind"][];
    }> = {},
  ) {
    super();
    this.#files = files;
    this.#outcomeFor = options.outcomeFor ?? (() => succeeded());
    this.#artifactToken = options.artifactToken;
    this.#artifactOutcomeKinds = options.artifactOutcomeKinds ?? ["succeeded", "exited"];
  }

  /** Every recorded invocation, in call order. */
  public get calls(): readonly RecordedCall[] {
    return this.#calls;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override async execute(request: Readonly<ProcessRequest>, options: Readonly<ProcessRunOptions>): Promise<ProcessOutcome> {
    this.#calls.push({request, options});
    const outcome = await this.#outcomeFor(request, options);
    if (this.#artifactToken !== undefined && this.#artifactOutcomeKinds.includes(outcome.kind)) {
      await this.writeArtifacts(request, this.#artifactToken);
    }
    return outcome;
  }

  private async writeArtifacts(request: Readonly<ProcessRequest>, token: string): Promise<void> {
    const jsonIndex = request.args.indexOf("--reporter-json-export");
    const junitIndex = request.args.indexOf("--reporter-junit-export");

    if (jsonIndex >= 0) {
      const jsonPath = request.args[jsonIndex + 1]!;
      await this.#files.createDirectory(dirname(jsonPath), {recursive: true});
      const jsonReport = {
        run: {
          failures: [
            {
              assertion: `Token ${token} must be accepted`,
              error: `Request rejected token ${token}`,
              source: {name: `Authenticated request ${token}`},
            },
          ],
          executions: [
            {
              request: {headers: [{key: "Authorization", value: `Bearer ${token}`}]},
              response: {body: `{"authToken":"${token}"}`},
            },
          ],
        },
        environment: {values: [{key: "authToken", value: token, type: "text"}]},
      };
      await this.#files.writeText(jsonPath, JSON.stringify(jsonReport, null, 2));
    }

    if (junitIndex >= 0) {
      const junitPath = request.args[junitIndex + 1]!;
      await this.#files.createDirectory(dirname(junitPath), {recursive: true});
      const junitXml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<testsuites name="newman" tests="2" failures="0">',
        '  <testsuite name="Test Suite" tests="2">',
        '    <testcase name="Auth test" classname="AuthTest">',
        `      <system-out>Authorization: Bearer ${token}</system-out>`,
        "    </testcase>",
        '    <testcase name="Token check" classname="TokenTest">',
        `      <system-out>authToken=${token}</system-out>`,
        "    </testcase>",
        "  </testsuite>",
        "</testsuites>",
      ].join("\n");
      await this.#files.writeText(junitPath, junitXml);
    }
  }
}

/** Wraps a {@link FileSystem} so `writeText`/`remove` calls against report artifact paths are recorded in call order. */
function withReportCallOrder(files: FileSystem, order: string[]): FileSystem {
  const isReportArtifact = (path: string): boolean => /newman-.*\.(json|xml)$|newman-.*-summary\.md$/.test(path);
  return {
    ...files,
    writeText: async (path, contents, options) => {
      if (isReportArtifact(path)) {
        order.push(`write:${path.split(/[/\\]/).pop()}`);
      }
      return files.writeText(path, contents, options);
    },
    remove: async (path, options) => {
      if (isReportArtifact(path)) {
        order.push(`remove:${path.split(/[/\\]/).pop()}`);
      }
      return files.remove(path, options);
    },
  };
}

function createSinkLogger(): {logger: MonorepositoryConsoleLogger; sink: InMemoryLoggerSink} {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
  return {logger, sink};
}

function createCliFixture(variables: Readonly<Record<string, string>> = {}): {
  command: ReturnType<typeof createE2eCommand>;
  runner: FakeNewmanRunner;
  sink: InMemoryLoggerSink;
} {
  const files = fixtureFiles();
  const runner = new FakeNewmanRunner(files);
  const environment = testEnvironment(variables);
  const {logger, sink} = createSinkLogger();
  const runtimeFactory = {
    ...createTestRuntimeFactory({files, runner, environment, logger}),
    createParseLogger: () => logger,
  };
  return {command: createE2eCommand(runtimeFactory), runner, sink};
}

// ============================================================================
// createE2eCommand — collection immutability and token transport
// ============================================================================

describe("createE2eCommand: collection immutability and token transport", () => {
  it("backend success does not modify the collection file and carries the token only inside --env-var", async () => {
    const files = fixtureFiles();
    const collectionPath = join(repositoryFixtureRoot, TARGET_DIRS.backend, "postman-collection.json");
    const originalBytes = await files.readText(collectionPath);
    const runner = new FakeNewmanRunner(files);
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});

    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {targets: ["backend"], completed: ["backend"]}});
    expect(await files.readText(collectionPath)).toBe(originalBytes);

    expect(runner.calls).toHaveLength(1);
    const rawArgs = runner.calls[0]!.request.args;
    const envVarIndices = rawArgs.reduce<number[]>((acc, arg, index) => (arg === "--env-var" ? [...acc, index] : acc), []);
    expect(envVarIndices).toHaveLength(1);
    expect(rawArgs[envVarIndices[0]! + 1]).toBe(`authToken=${FAKE_TOKEN}`);
  });

  it("frontend optional token run transports the token via --env-var", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files);
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "frontend"}, {presentation: "silent"});

    expect(execution.status).toBe("completed");
    expect(runner.calls[0]!.request.args).toContain("--env-var");
  });

  it("frontend without a token omits --env-var and still succeeds", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files);
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: ""});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "frontend"}, {presentation: "silent"});

    expect(execution.status).toBe("completed");
    expect(runner.calls[0]!.request.args).not.toContain("--env-var");
  });

  it("cv ignores a present token and never includes --env-var", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files);
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "cv"}, {presentation: "silent"});

    expect(execution.status).toBe("completed");
    expect(runner.calls[0]!.request.args).not.toContain("--env-var");
  });
});

// ============================================================================
// createE2eCommand — required token and missing fixture validation
// ============================================================================

describe("createE2eCommand: required token and missing fixture validation", () => {
  it("fails backend before invoking Newman when the required auth token is absent", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files);
    const environment = testEnvironment({});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
    expect(runner.calls).toHaveLength(0);
  });

  it("fails before invoking Newman when the collection file is missing", async () => {
    const files = createMemoryFileSystem({
      [join(repositoryFixtureRoot, TARGET_DIRS.backend, "postman-environment.production.json")]: "{}",
    });
    const runner = new FakeNewmanRunner(files);
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
    expect(execution.status === "failed" ? execution.failure.message : "").toMatch(/Collection file not found/);
    expect(runner.calls).toHaveLength(0);
  });
});

// ============================================================================
// createE2eCommand — invalid input
// ============================================================================

describe("createE2eCommand: invalid input", () => {
  it("rejects an invalid target as a CommandInputError with exit code 2", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files);
    const command = createE2eCommand(createTestRuntimeFactory({files, runner}));

    const execution = await command.invoke({target: "nope" as never}, {presentation: "silent"});

    expect(execution).toMatchObject({status: "failed", exitCode: 2, failure: {kind: "usage"}});
    expect(runner.calls).toHaveLength(0);
  });
});

// ============================================================================
// createE2eCommand — human invocation
// ============================================================================

describe("createE2eCommand: human invocation", () => {
  it("invokes only the requested Newman collection", async () => {
    const {command, runner} = createCliFixture({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});

    const execution = await command.invoke({target: "backend"}, {presentation: "human"});

    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {targets: ["backend"], completed: ["backend"]}});
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0]!.request.args).toContain(join(repositoryFixtureRoot, TARGET_DIRS.backend, "postman-collection.json"));
  });
});

// ============================================================================
// createE2eCommand — target expansion and sequential execution
// ============================================================================

describe("createE2eCommand: target expansion and sequential execution", () => {
  it("expands 'all' into frontend, backend, cv and completes them in that order", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files);
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "all"}, {presentation: "silent"});

    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 0,
      value: {targets: ["frontend", "backend", "cv"], completed: ["frontend", "backend", "cv"]},
    });
    expect(runner.calls).toHaveLength(3);
    expect(
      runner.calls.map((call) =>
        call.request.args.includes(join(repositoryFixtureRoot, TARGET_DIRS.frontend, "postman-collection.json")),
      )[0],
    ).toBe(true);

    const secondExecution = await command.invoke({target: "all"}, {presentation: "silent"});
    expect(secondExecution.status).toBe("completed");
    if (execution.status === "completed" && secondExecution.status === "completed") {
      expect(secondExecution.value.targets).toEqual(execution.value.targets);
      expect(secondExecution.value.targets).not.toBe(execution.value.targets);
    }
  });

  it("stops at the first failing target and never starts an unreached one", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files, {
      outcomeFor: (request) =>
        request.args.includes(join(repositoryFixtureRoot, TARGET_DIRS.backend, "postman-collection.json")) ? exited(1) : succeeded(),
    });
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "all"}, {presentation: "silent"});

    expect(execution.status).toBe("failed");
    // Only frontend and backend were attempted; cv was never reached.
    expect(runner.calls).toHaveLength(2);
  });
});

// ============================================================================
// createE2eCommand — report directory resolution
// ============================================================================

describe("createE2eCommand: report directory resolution", () => {
  it("resolves the default e2e-logs directory under the injected cwd", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files);
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});
    expect(execution.status).toBe("completed");

    const rawArgs = runner.calls[0]!.request.args;
    const jsonPath = rawArgs[rawArgs.indexOf("--reporter-json-export") + 1]!;
    expect(jsonPath.startsWith(repositoryFixtureRoot)).toBe(true);
    expect(jsonPath).toContain("e2e-logs");
  });

  it("uses an explicit NEWMAN_REPORT_DIR instead of the default", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files);
    const reportDir = join(repositoryFixtureRoot, "custom-e2e-logs");
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_REPORT_DIR: reportDir});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});
    expect(execution.status).toBe("completed");

    const rawArgs = runner.calls[0]!.request.args;
    const jsonPath = rawArgs[rawArgs.indexOf("--reporter-json-export") + 1]!;
    expect(jsonPath.startsWith(reportDir)).toBe(true);
  });
});

// ============================================================================
// createE2eCommand — env-derived Newman arguments
// ============================================================================

describe("createE2eCommand: env-derived Newman arguments", () => {
  it("reflects NEWMAN_TIMEOUT, NEWMAN_TIMEOUT_REQUEST, and NEWMAN_STRICT_MODE from the injected environment", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files);
    const environment = testEnvironment({
      E2E_TEST_AUTH_TOKEN: FAKE_TOKEN,
      NEWMAN_TIMEOUT: "42000",
      NEWMAN_TIMEOUT_REQUEST: "5000",
      NEWMAN_STRICT_MODE: "true",
    });
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});
    expect(execution.status).toBe("completed");

    const rawArgs = runner.calls[0]!.request.args;
    expect(rawArgs[rawArgs.indexOf("--timeout") + 1]).toBe("42000");
    expect(rawArgs[rawArgs.indexOf("--timeout-request") + 1]).toBe("5000");
    expect(rawArgs).toContain("--bail");
  });

  it("falls back to defaults and warns on an invalid NEWMAN_TIMEOUT", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files);
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_TIMEOUT: "not-a-number"});
    const {logger, sink} = createSinkLogger();
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment, logger}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});
    expect(execution.status).toBe("completed");

    const rawArgs = runner.calls[0]!.request.args;
    expect(rawArgs[rawArgs.indexOf("--timeout") + 1]).toBe("600000");
    expect(sink.records.some((record) => record.text.includes("Invalid NEWMAN_TIMEOUT"))).toBe(true);
  });
});

// ============================================================================
// createE2eCommand — process invocation shape
// ============================================================================

describe("createE2eCommand: process invocation shape", () => {
  it("invokes Newman with the injected cwd, inherited output, and an invocation signal", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files);
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});
    expect(execution.status).toBe("completed");

    const {options, request} = runner.calls[0]!;
    expect(request.command).toBe("npx");
    expect(options.cwd).toBe(repositoryFixtureRoot);
    expect(options.output).toBe("inherit");
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.logger).toBeDefined();
  });
});

// ============================================================================
// createE2eCommand — token redaction in logs
// ============================================================================

describe("createE2eCommand: token redaction in logs", () => {
  it("never writes the raw token to the logger on success", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files);
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const {logger, sink} = createSinkLogger();
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment, logger}));

    await command.invoke({target: "backend"}, {presentation: "human"});

    const allText = sink.records.map((record) => record.text).join("\n");
    expect(allText).not.toContain(FAKE_TOKEN);
  });

  it("never writes the raw token to the logger on a nonzero Newman exit", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files, {outcomeFor: () => exited(1)});
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const {logger, sink} = createSinkLogger();
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment, logger}));

    const execution = await command.invoke({target: "backend"}, {presentation: "human"});
    expect(execution.status).toBe("failed");

    const allText = sink.records.map((record) => record.text).join("\n");
    expect(allText).not.toContain(FAKE_TOKEN);
  });

  it("returns a RunnerError cause with no raw token in retained diagnostics", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files, {
      outcomeFor: () =>
        spawnFailed(`spawn failed for ${FAKE_TOKEN}`, {
          stdout: `stdout ${FAKE_TOKEN}`,
          stderr: `stderr ${FAKE_TOKEN}`,
        }),
    });
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});

    expect(execution.status).toBe("failed");
    if (execution.status !== "failed") return;
    expect(execution.failure.message).not.toContain(FAKE_TOKEN);
    expect(execution.failure.evidence.join("\n")).not.toContain(FAKE_TOKEN);
    expect(execution.failure.cause).toBeInstanceOf(RunnerError);
    if (!(execution.failure.cause instanceof RunnerError)) return;
    expect(execution.failure.cause.message).not.toContain(FAKE_TOKEN);
    expect(execution.failure.cause.request.command).not.toContain(FAKE_TOKEN);
    expect(execution.failure.cause.request.args.join("\n")).not.toContain(FAKE_TOKEN);
    expect(execution.failure.cause.outcome.stdout).not.toContain(FAKE_TOKEN);
    expect(execution.failure.cause.outcome.stderr).not.toContain(FAKE_TOKEN);
    expect(execution.failure.cause.outcome.kind).toBe("spawn-failed");
    if (execution.failure.cause.outcome.kind === "spawn-failed") {
      expect(execution.failure.cause.outcome.message).not.toContain(FAKE_TOKEN);
    }
  });
});

// ============================================================================
// createE2eCommand — typed runner failure outcomes and cleanup
// ============================================================================

describe("createE2eCommand: typed runner failure outcomes and cleanup", () => {
  it.each([
    ["nonzero exit", () => exited(1)],
    ["timeout", () => timedOut()],
    ["spawn failure", () => spawnFailed("ENOENT")],
  ] as const)("preserves collection immutability and fails the command on %s", async (_label, outcomeFor) => {
    const files = fixtureFiles();
    const collectionPath = join(repositoryFixtureRoot, TARGET_DIRS.backend, "postman-collection.json");
    const originalBytes = await files.readText(collectionPath);
    const runner = new FakeNewmanRunner(files, {outcomeFor});
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});

    expect(execution.status).toBe("failed");
    expect(execution.exitCode).not.toBe(0);
    expect(await files.readText(collectionPath)).toBe(originalBytes);
  });

  it("treats a standalone typed process cancellation without an aborted invocation signal as an operational failure", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files, {outcomeFor: () => cancelledOutcome()});
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
    if (execution.status === "failed") {
      expect(execution.failure.cause).toBeInstanceOf(RunnerError);
      expect(execution.failure.cause).toMatchObject({outcome: {kind: "cancelled"}});
    }
  });

  it("preserves invocation cancellation and returns only after token-bearing reports are sanitized", async () => {
    const files = fixtureFiles();
    const controller = new AbortController();
    let markNewmanStarted: (() => void) | undefined;
    const newmanStarted = new Promise<void>((resolveStarted) => {
      markNewmanStarted = resolveStarted;
    });
    const runner = new FakeNewmanRunner(files, {
      artifactToken: FAKE_TOKEN,
      artifactOutcomeKinds: ["cancelled"],
      outcomeFor: async (_request, options) => {
        markNewmanStarted?.();
        await new Promise<void>((resolveCancelled) => {
          if (options.signal?.aborted === true) {
            resolveCancelled();
            return;
          }
          options.signal?.addEventListener("abort", () => resolveCancelled(), {once: true});
        });
        return {
          kind: "cancelled",
          stdout: `cancelled stdout ${FAKE_TOKEN}`,
          stderr: `cancelled stderr ${FAKE_TOKEN}`,
          durationMs: 1,
        };
      },
    });
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const executionPromise = command.invoke({target: "backend"}, {presentation: "silent", signal: controller.signal});
    await newmanStarted;
    controller.abort(new CommandCancellation("Terminated by test signal.", 143));
    const execution = await executionPromise;

    expect(execution).toMatchObject({
      status: "cancelled",
      exitCode: 143,
      failure: {kind: "cancelled", message: "Terminated by test signal."},
    });
    const reportDir = join(repositoryFixtureRoot, "e2e-logs");
    const artifactContents = await Promise.all([
      files.readText(join(reportDir, "newman-backend.json")),
      files.readText(join(reportDir, "newman-backend.xml")),
      files.readText(join(reportDir, "newman-backend-summary.md")),
    ]);
    for (const content of artifactContents) {
      expect(content).not.toContain(FAKE_TOKEN);
      expect(content).toContain("[REDACTED]");
    }
  });
});

// ============================================================================
// createE2eCommand — report artifact JWT sanitization
// ============================================================================

describe("createE2eCommand: report artifact JWT sanitization", () => {
  it("sanitizes JSON, JUnit, and summary artifacts after a successful run", async () => {
    const syntheticJwt = generateSyntheticJwt();
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files, {artifactToken: syntheticJwt});
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: syntheticJwt});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});
    expect(execution.status).toBe("completed");

    const reportDir = join(repositoryFixtureRoot, "e2e-logs");
    const jsonContent = await files.readText(join(reportDir, "newman-backend.json"));
    const junitContent = await files.readText(join(reportDir, "newman-backend.xml"));
    const summaryContent = await files.readText(join(reportDir, "newman-backend-summary.md"));

    for (const content of [jsonContent, junitContent, summaryContent]) {
      expect(content).not.toContain(syntheticJwt);
      expect(content).not.toMatch(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    }
    expect(junitContent).toContain("testsuites");
    expect(junitContent).toContain("Auth test");
  });

  it("sanitizes artifacts on the failure path (nonzero exit) even though the command fails", async () => {
    const syntheticJwt = generateSyntheticJwt();
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files, {outcomeFor: () => exited(1), artifactToken: syntheticJwt});
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: syntheticJwt});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});
    expect(execution.status).toBe("failed");

    const reportDir = join(repositoryFixtureRoot, "e2e-logs");
    const jsonContent = await files.readText(join(reportDir, "newman-backend.json"));
    const junitContent = await files.readText(join(reportDir, "newman-backend.xml"));

    expect(jsonContent).not.toContain(syntheticJwt);
    expect(junitContent).not.toContain(syntheticJwt);
  });

  it("sanitizes a plain runtime token from every retained report artifact", async () => {
    const files = fixtureFiles();
    const runner = new FakeNewmanRunner(files, {artifactToken: FAKE_TOKEN});
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});
    expect(execution.status).toBe("completed");

    const reportDir = join(repositoryFixtureRoot, "e2e-logs");
    const artifactContents = await Promise.all([
      files.readText(join(reportDir, "newman-backend.json")),
      files.readText(join(reportDir, "newman-backend.xml")),
      files.readText(join(reportDir, "newman-backend-summary.md")),
    ]);
    for (const content of artifactContents) {
      expect(content).not.toContain(FAKE_TOKEN);
      expect(content).toContain("[REDACTED]");
    }
  });
});

// ============================================================================
// createE2eCommand — cleanup ordering and failure precedence
// ============================================================================

describe("createE2eCommand: cleanup ordering and failure precedence", () => {
  it("performs report cleanup in assertion-summary, JSON, JUnit, summary order", async () => {
    const rawFiles = fixtureFiles();
    const order: string[] = [];
    const recordingFiles = withReportCallOrder(rawFiles, order);
    const runner = new FakeNewmanRunner(rawFiles, {artifactToken: FAKE_TOKEN});
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files: recordingFiles, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});
    expect(execution.status).toBe("completed");

    expect(order).toEqual([
      "write:newman-backend-summary.md",
      "write:newman-backend.json",
      "write:newman-backend.xml",
      "write:newman-backend-summary.md",
    ]);
  });

  it("fails the command when Newman succeeds but a report-cleanup step fails", async () => {
    const rawFiles = fixtureFiles();
    const failingFiles: FileSystem = {
      ...rawFiles,
      writeText: async (path, contents, options) => {
        if (path.endsWith("newman-backend.json")) {
          throw new Error("disk full");
        }
        return rawFiles.writeText(path, contents, options);
      },
    };
    const runner = new FakeNewmanRunner(rawFiles, {artifactToken: FAKE_TOKEN});
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files: failingFiles, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "cleanup"}});
  });

  it("preserves the Newman RunnerError as primary and appends a cleanup failure as evidence", async () => {
    const rawFiles = fixtureFiles();
    const failingFiles: FileSystem = {
      ...rawFiles,
      writeText: async (path, contents, options) => {
        if (path.endsWith("newman-backend.json")) {
          throw new Error("disk full");
        }
        return rawFiles.writeText(path, contents, options);
      },
    };
    const runner = new FakeNewmanRunner(rawFiles, {outcomeFor: () => exited(1), artifactToken: FAKE_TOKEN});
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files: failingFiles, runner, environment}));

    const execution = await command.invoke({target: "backend"}, {presentation: "silent"});

    expect(execution.status).toBe("failed");
    if (execution.status !== "failed") return;
    expect(execution.failure.kind).toBe("operational");
    expect(execution.failure.message).toMatch(/exited with code 1/);
    expect(execution.failure.evidence.some((line) => line.includes("disk full"))).toBe(true);
  });

  it("attempts every report-cleanup step even when an earlier step fails", async () => {
    const rawFiles = fixtureFiles();
    let junitWriteAttempted = false;
    const summaryWrites: string[] = [];
    const failingFiles: FileSystem = {
      ...rawFiles,
      writeText: async (path, contents, options) => {
        if (path.endsWith("newman-backend.json")) {
          throw new Error("disk full");
        }
        if (path.endsWith("newman-backend.xml")) {
          junitWriteAttempted = true;
        }
        if (path.endsWith("newman-backend-summary.md")) {
          summaryWrites.push(contents);
        }
        return rawFiles.writeText(path, contents, options);
      },
    };
    const runner = new FakeNewmanRunner(rawFiles, {artifactToken: FAKE_TOKEN});
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files: failingFiles, runner, environment}));

    await command.invoke({target: "backend"}, {presentation: "silent"});

    expect(junitWriteAttempted).toBe(true);
    expect(summaryWrites).toHaveLength(2);
    expect(summaryWrites[0]).toContain(FAKE_TOKEN);
    expect(summaryWrites[1]).not.toContain(FAKE_TOKEN);
    expect(summaryWrites[1]).toContain("[REDACTED]");
  });
});

// ============================================================================
// writeAssertionSummary
// ============================================================================

describe("writeAssertionSummary", () => {
  it("is a no-op when the JSON report does not exist", async () => {
    const files = createMemoryFileSystem();
    const {logger} = createSinkLogger();
    await expect(writeAssertionSummary(files, "backend", "/reports", logger)).resolves.toBeUndefined();
    expect(await files.exists("/reports/newman-backend-summary.md")).toBe(false);
  });

  it("writes a 'no failed assertions' summary when the report has none", async () => {
    const files = createMemoryFileSystem({"/reports/newman-backend.json": JSON.stringify({run: {failures: []}})});
    const {logger} = createSinkLogger();
    await writeAssertionSummary(files, "backend", "/reports", logger);
    const summary = await files.readText("/reports/newman-backend-summary.md");
    expect(summary).toContain("No failed assertions");
  });

  it("writes failure detail when the report contains failures", async () => {
    const files = createMemoryFileSystem({
      "/reports/newman-backend.json": JSON.stringify({
        run: {failures: [{assertion: "Status is 200", error: "expected 200 but got 500", source: {name: "Get invoice"}}]},
      }),
    });
    const {logger} = createSinkLogger();
    await writeAssertionSummary(files, "backend", "/reports", logger);
    const summary = await files.readText("/reports/newman-backend-summary.md");
    expect(summary).toContain("Status is 200");
    expect(summary).toContain("Get invoice");
  });

  it("throws when the JSON report cannot be parsed", async () => {
    const files = createMemoryFileSystem({"/reports/newman-backend.json": "{not valid json"});
    const {logger} = createSinkLogger();
    await expect(writeAssertionSummary(files, "backend", "/reports", logger)).rejects.toThrow(/Failed to read Newman JSON report/);
  });
});

// ============================================================================
// sanitizeNewmanJsonReport
// ============================================================================

describe("sanitizeNewmanJsonReport", () => {
  it("is a no-op when the report does not exist", async () => {
    const files = createMemoryFileSystem();
    const {logger} = createSinkLogger();
    await expect(sanitizeNewmanJsonReport(files, "/reports/missing.json", logger)).resolves.toBeUndefined();
  });

  it("redacts a JWT-shaped value and rewrites the report", async () => {
    const jwt = generateSyntheticJwt();
    const files = createMemoryFileSystem({"/reports/newman-backend.json": JSON.stringify({token: jwt, safe: "value"})});
    const {logger} = createSinkLogger();
    await sanitizeNewmanJsonReport(files, "/reports/newman-backend.json", logger);
    const content = await files.readText("/reports/newman-backend.json");
    expect(content).not.toContain(jwt);
    expect(content).toContain("value");
  });

  it("redacts a plain runtime token from environment values and opaque response bodies", async () => {
    const files = createMemoryFileSystem({
      "/reports/newman-backend.json": JSON.stringify({
        environment: {values: [{key: "authToken", value: FAKE_TOKEN}]},
        response: {body: `opaque-prefix:${FAKE_TOKEN}:opaque-suffix`},
      }),
    });
    const {logger} = createSinkLogger();

    await sanitizeNewmanJsonReport(files, "/reports/newman-backend.json", logger, FAKE_TOKEN);

    const content = await files.readText("/reports/newman-backend.json");
    expect(content).not.toContain(FAKE_TOKEN);
    expect(content.match(/\[REDACTED\]/g)).toHaveLength(2);
  });

  it("throws and removes the artifact when the JSON report cannot be parsed", async () => {
    const files = createMemoryFileSystem({"/reports/newman-backend.json": "{not valid json"});
    const {logger} = createSinkLogger();
    await expect(sanitizeNewmanJsonReport(files, "/reports/newman-backend.json", logger)).rejects.toThrow(
      /Failed to parse Newman JSON report/,
    );
    expect(await files.exists("/reports/newman-backend.json")).toBe(false);
  });
});

// ============================================================================
// sanitizeNewmanTextReport
// ============================================================================

describe("sanitizeNewmanTextReport", () => {
  it("is a no-op when the report does not exist", async () => {
    const files = createMemoryFileSystem();
    const {logger} = createSinkLogger();
    await expect(sanitizeNewmanTextReport(files, "/reports/missing.xml", logger)).resolves.toBeUndefined();
  });

  it("redacts the runtime auth token by exact match", async () => {
    const files = createMemoryFileSystem({"/reports/newman-backend.xml": "<testcase>authToken=super-secret-value</testcase>"});
    const {logger} = createSinkLogger();
    await sanitizeNewmanTextReport(files, "/reports/newman-backend.xml", logger, "super-secret-value");
    const content = await files.readText("/reports/newman-backend.xml");
    expect(content).not.toContain("super-secret-value");
    expect(content).toContain("[REDACTED]");
  });

  it("redacts a bearer JWT pattern from text content", async () => {
    const jwt = generateSyntheticJwt();
    const files = createMemoryFileSystem({"/reports/newman-backend.xml": `<system-out>Authorization: Bearer ${jwt}</system-out>`});
    const {logger} = createSinkLogger();
    await sanitizeNewmanTextReport(files, "/reports/newman-backend.xml", logger);
    const content = await files.readText("/reports/newman-backend.xml");
    expect(content).not.toContain(jwt);
  });
});

// ============================================================================
// sanitizeJsonValue / redactSensitiveString
// ============================================================================

describe("sanitizeJsonValue and redactSensitiveString", () => {
  it("redacts values under sensitive keys regardless of shape", () => {
    const accumulator = {redactionCount: 0};
    const sanitized = sanitizeJsonValue({authToken: "abc123", nested: {accessToken: "def456"}, safe: "ok"}, accumulator);
    expect(sanitized).toEqual({authToken: "[REDACTED]", nested: {accessToken: "[REDACTED]"}, safe: "ok"});
    expect(accumulator.redactionCount).toBe(2);
  });

  it("redacts JWT-shaped strings even under non-sensitive keys", () => {
    const jwt = generateSyntheticJwt();
    const accumulator = {redactionCount: 0};
    const sanitized = redactSensitiveString(`payload: ${jwt}`, "message", accumulator);
    expect(sanitized).not.toContain(jwt);
    expect(accumulator.redactionCount).toBeGreaterThan(0);
  });

  it("recurses through arrays", () => {
    const accumulator = {redactionCount: 0};
    const sanitized = sanitizeJsonValue([{token: "secret"}, {safe: "ok"}], accumulator);
    expect(sanitized).toEqual([{token: "[REDACTED]"}, {safe: "ok"}]);
  });
});

// ============================================================================
// E2E characterization (pre-Effect migration)
// ============================================================================

/** One Newman behavior the characterization runner replays for every invocation. */
interface NewmanScript {
  /** Outcome the simulated Newman process reports. */
  readonly outcome: ProcessOutcome;
  /** Failed assertions written to the JSON report; `undefined` writes no report at all. */
  readonly failures?: readonly unknown[];
}

/** Every report file name a target can leave behind. */
const REPORT_FILES = (target: string): readonly string[] => [
  `newman-${target}.json`,
  `newman-${target}.xml`,
  `newman-${target}-summary.md`,
];

/**
 * Builds a token-bearing Newman JSON report with a bearer JWT header, a JWT in a non-sensitive
 * field, the raw token in an opaque body, and the token under a sensitive environment key.
 *
 * @param token - Runtime auth token Newman would have seen.
 * @param failures - Failed assertions recorded by the run.
 * @returns The exact report text Newman would export.
 */
function characterizationJsonReport(token: string, failures: readonly unknown[]): string {
  const jwt = generateSyntheticJwt();
  return JSON.stringify(
    {
      run: {
        stats: {requests: {total: 1, failed: 0}, assertions: {total: 2, failed: failures.length}},
        executions: [
          {
            item: {name: "GET /rest/v1/invoices"},
            request: {url: "https://api.arolariu.ro/rest/v1/invoices", headers: [{key: "Authorization", value: `Bearer ${jwt}`}]},
            response: {code: 200, body: `{"echo":"${token}"}`},
            console: [`decoded ${jwt}`],
          },
        ],
        failures,
      },
      environment: {
        values: [
          {key: "authToken", value: token, type: "secret"},
          {key: "baseUrl", value: "https://api.arolariu.ro", type: "default"},
        ],
      },
    },
    null,
    2,
  );
}

/**
 * Builds a token-bearing Newman JUnit report.
 *
 * @param token - Runtime auth token Newman would have seen.
 * @param failureCount - Number of failed test cases.
 * @returns The exact JUnit XML Newman would export.
 */
function characterizationJunitReport(token: string, failureCount: number): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites name="newman" tests="2" failures="${String(failureCount)}">`,
    '  <testsuite name="Invoices" tests="2">',
    '    <testcase name="GET /rest/v1/invoices" classname="Invoices">',
    `      <system-out>Authorization: Bearer ${generateSyntheticJwt()}</system-out>`,
    `      <system-out>authToken=${token}</system-out>`,
    "    </testcase>",
    "  </testsuite>",
    "</testsuites>",
  ].join("\n");
}

/**
 * Records every Newman invocation and writes the scripted reporter artifacts Newman would export.
 * The reports carry the token only when Newman received one through `--env-var authToken=…`.
 */
class ScriptedNewmanRunner extends AbstractProcessRunner {
  readonly #files: FileSystem;
  readonly #script: NewmanScript;
  readonly #calls: RecordedCall[] = [];

  public constructor(files: FileSystem, script: NewmanScript) {
    super();
    this.#files = files;
    this.#script = script;
  }

  /** Every recorded invocation, in call order. */
  public get calls(): readonly RecordedCall[] {
    return this.#calls;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override async execute(request: Readonly<ProcessRequest>, options: Readonly<ProcessRunOptions>): Promise<ProcessOutcome> {
    this.#calls.push({request, options});
    const failures = this.#script.failures;
    if (failures !== undefined) {
      const token = request.args.find((arg) => arg.startsWith("authToken="))?.slice("authToken=".length) ?? "no-token-received";
      const jsonPath = request.args[request.args.indexOf("--reporter-json-export") + 1]!;
      const junitPath = request.args[request.args.indexOf("--reporter-junit-export") + 1]!;
      await this.#files.writeText(jsonPath, characterizationJsonReport(token, failures));
      await this.#files.writeText(junitPath, characterizationJunitReport(token, failures.length));
    }
    return this.#script.outcome;
  }
}

/** Replaces the machine-dependent fixture root and normalizes path separators. */
function withPortablePaths(text: string): string {
  return text.replaceAll(repositoryFixtureRoot, "<root>").replaceAll("\\", "/");
}

/** Projects one execution into a plain value, naming the failure cause by its class. */
function projectE2eExecution(execution: Readonly<CommandExecution<unknown>>): unknown {
  if (execution.status === "completed" || execution.status === "help") {
    return {...execution};
  }
  const {cause, ...failure} = execution.failure;
  return {
    ...execution,
    failure: {
      ...failure,
      message: withPortablePaths(failure.message),
      evidence: failure.evidence.map(withPortablePaths),
      cause: cause instanceof Error ? cause.constructor.name : String(cause),
    },
  };
}

/** Creates a runtime factory whose logger honors the invocation presentation, like the Node factory. */
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

/** Everything one characterized E2E invocation produced. */
interface E2eCharacterization {
  readonly execution: unknown;
  readonly calls: readonly unknown[];
  readonly tokenArgs: readonly (readonly string[])[];
  readonly output: readonly unknown[];
  readonly reports: Readonly<Record<string, string | null>>;
}

/**
 * Runs the legacy E2E command once against the scripted Newman runner.
 *
 * @param target - Requested target.
 * @param presentation - Legacy presentation.
 * @param script - Newman behavior.
 * @returns The projected execution, Newman calls, token-bearing args, rendered output, and report bytes.
 */
async function characterizeE2e(target: E2ETarget, presentation: CommandPresentation, script: NewmanScript): Promise<E2eCharacterization> {
  const files = fixtureFiles();
  const sink = new InMemoryLoggerSink();
  const runner = new ScriptedNewmanRunner(files, script);
  const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
  const command = createE2eCommand(presentationRuntimeFactory(sink, {files, runner, environment}));

  const execution = await command.invoke({target}, {presentation});

  const reportDir = join(repositoryFixtureRoot, "e2e-logs");
  const reports: Record<string, string | null> = {};
  for (const name of (target === "all" ? ["frontend", "backend", "cv"] : [target]).flatMap(REPORT_FILES)) {
    const path = join(reportDir, name);
    // eslint-disable-next-line no-await-in-loop -- deterministic in-memory reads in a fixed order
    reports[name] = (await files.exists(path)) ? await files.readText(path) : null;
  }

  return {
    execution: projectE2eExecution(execution),
    calls: runner.calls.map(({request, options}) => ({
      command: request.command,
      args: request.args.map((arg) => withPortablePaths(arg).replaceAll(FAKE_TOKEN, "<token>")),
      options: {
        ...options,
        cwd: options.cwd === undefined ? undefined : withPortablePaths(options.cwd),
        signal: options.signal instanceof AbortSignal ? "<signal>" : options.signal,
        logger: options.logger === undefined ? undefined : "<logger>",
      },
    })),
    tokenArgs: runner.calls.map(({request}) => request.args.filter((arg) => arg.includes(FAKE_TOKEN))),
    output: sink.records.map((record) => ({...record, text: withPortablePaths(record.text)})),
    reports,
  };
}

/** Asserts the raw token never reaches rendered output or the returned execution. */
function expectTokenNeverRendered(result: Readonly<E2eCharacterization>): void {
  expect(JSON.stringify(result.output).includes(FAKE_TOKEN)).toBe(false);
  expect(JSON.stringify(result.execution).includes(FAKE_TOKEN)).toBe(false);
}

const ASSERTION_FAILURES: readonly unknown[] = [
  {
    assertion: "Status code is 200",
    error: {message: `expected 401 to equal 200 for ${FAKE_TOKEN}`},
    source: {name: "GET /rest/v1/invoices"},
  },
  {assertion: "Body has id", error: "expected body to have property 'id'", parent: {name: "Invoices"}},
];

describe("e2e characterization (pre-Effect migration)", () => {
  it("backend pass (human): Newman args, sanitized reports, summary, output, exit 0", async () => {
    const result = await characterizeE2e("backend", "human", {outcome: succeeded(), failures: []});

    expect(result.execution).toEqual({
      status: "completed",
      value: {
        targets: ["backend"],
        completed: ["backend"],
      },
      exitCode: 0,
    });
    expect(result.calls).toEqual([
      {
        command: "npx",
        args: [
          "newman",
          "run",
          "<root>/sites/api.arolariu.ro/postman-collection.json",
          "--environment",
          "<root>/sites/api.arolariu.ro/postman-environment.production.json",
          "--env-var",
          "authToken=<token>",
          "--reporters",
          "cli,json,junit",
          "--reporter-json-export",
          "<root>/e2e-logs/newman-backend.json",
          "--reporter-junit-export",
          "<root>/e2e-logs/newman-backend.xml",
          "--timeout",
          "600000",
          "--timeout-request",
          "30000",
          "--timeout-script",
          "10000",
        ],
        options: {
          cwd: "<root>",
          output: "inherit",
          signal: "<signal>",
          logger: "<logger>",
        },
      },
    ]);
    expect(result.tokenArgs).toEqual([["authToken=e2e-test-secret-value"]]);
    expect(result.output).toEqual([
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
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ✅ Completed Newman tests for: backend",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ✅ No failed assertions for backend.",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Summary written to: <root>/e2e-logs/newman-backend-summary.md",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized Newman JSON report (4 redaction(s)): <root>/e2e-logs/newman-backend.json",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized text report (2 redaction pass(es)): <root>/e2e-logs/newman-backend.xml",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e] ✅ Completed 1 of 1 E2E target(s): backend.",
        write: false,
      },
    ]);
    expect(result.reports).toEqual({
      "newman-backend.json":
        '{\n  "run": {\n    "stats": {\n      "requests": {\n        "total": 1,\n        "failed": 0\n      },\n      "assertions": {\n        "total": 2,\n        "failed": 0\n      }\n    },\n    "executions": [\n      {\n        "item": {\n          "name": "GET /rest/v1/invoices"\n        },\n        "request": {\n          "url": "https://api.arolariu.ro/rest/v1/invoices",\n          "headers": [\n            {\n              "key": "Authorization",\n              "value": "******"\n            }\n          ]\n        },\n        "response": {\n          "code": 200,\n          "body": "{\\"echo\\":\\"[REDACTED]\\"}"\n        },\n        "console": [\n          "decoded [REDACTED_JWT]"\n        ]\n      }\n    ],\n    "failures": []\n  },\n  "environment": {\n    "values": [\n      {\n        "key": "authToken",\n        "value": "[REDACTED]",\n        "type": "secret"\n      },\n      {\n        "key": "baseUrl",\n        "value": "https://api.arolariu.ro",\n        "type": "default"\n      }\n    ]\n  }\n}',
      "newman-backend.xml":
        '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="newman" tests="2" failures="0">\n  <testsuite name="Invoices" tests="2">\n    <testcase name="GET /rest/v1/invoices" classname="Invoices">\n      <system-out>Authorization: ******</system-out>\n      <system-out>authToken=[REDACTED]</system-out>\n    </testcase>\n  </testsuite>\n</testsuites>',
      "newman-backend-summary.md": "### Failed Assertions (backend)\nNo failed assertions.\n",
    });
    expectTokenNeverRendered(result);
  });

  it("backend pass (json): legacy has no JSON document, so it fails with exit 1 after a clean run", async () => {
    const result = await characterizeE2e("backend", "json", {outcome: succeeded(), failures: []});

    expect(result.execution).toEqual({
      status: "failed",
      exitCode: 1,
      failure: {
        kind: "internal",
        message: 'Command "test:e2e" selected JSON presentation without a JSON document.',
        evidence: [],
        cause: "undefined",
      },
    });
    expect(result.output).toEqual([
      {
        stream: "stderr",
        text: 'Command "test:e2e" selected JSON presentation without a JSON document.',
        write: false,
      },
    ]);
    expect(result.reports).toEqual({
      "newman-backend.json":
        '{\n  "run": {\n    "stats": {\n      "requests": {\n        "total": 1,\n        "failed": 0\n      },\n      "assertions": {\n        "total": 2,\n        "failed": 0\n      }\n    },\n    "executions": [\n      {\n        "item": {\n          "name": "GET /rest/v1/invoices"\n        },\n        "request": {\n          "url": "https://api.arolariu.ro/rest/v1/invoices",\n          "headers": [\n            {\n              "key": "Authorization",\n              "value": "******"\n            }\n          ]\n        },\n        "response": {\n          "code": 200,\n          "body": "{\\"echo\\":\\"[REDACTED]\\"}"\n        },\n        "console": [\n          "decoded [REDACTED_JWT]"\n        ]\n      }\n    ],\n    "failures": []\n  },\n  "environment": {\n    "values": [\n      {\n        "key": "authToken",\n        "value": "[REDACTED]",\n        "type": "secret"\n      },\n      {\n        "key": "baseUrl",\n        "value": "https://api.arolariu.ro",\n        "type": "default"\n      }\n    ]\n  }\n}',
      "newman-backend.xml":
        '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="newman" tests="2" failures="0">\n  <testsuite name="Invoices" tests="2">\n    <testcase name="GET /rest/v1/invoices" classname="Invoices">\n      <system-out>Authorization: ******</system-out>\n      <system-out>authToken=[REDACTED]</system-out>\n    </testcase>\n  </testsuite>\n</testsuites>',
      "newman-backend-summary.md": "### Failed Assertions (backend)\nNo failed assertions.\n",
    });
    expectTokenNeverRendered(result);
  });

  it("backend assertion failure (human): exit 1, failure output, sanitized reports, summary", async () => {
    const result = await characterizeE2e("backend", "human", {outcome: exited(1), failures: ASSERTION_FAILURES});

    expect(result.execution).toEqual({
      status: "failed",
      exitCode: 1,
      failure: {
        kind: "operational",
        message:
          "Process exited with code 1: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000",
        evidence: [
          "command: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000",
          "outcome: exited",
        ],
        cause: "RunnerError",
      },
    });
    expect(result.calls).toEqual([
      {
        command: "npx",
        args: [
          "newman",
          "run",
          "<root>/sites/api.arolariu.ro/postman-collection.json",
          "--environment",
          "<root>/sites/api.arolariu.ro/postman-environment.production.json",
          "--env-var",
          "authToken=<token>",
          "--reporters",
          "cli,json,junit",
          "--reporter-json-export",
          "<root>/e2e-logs/newman-backend.json",
          "--reporter-junit-export",
          "<root>/e2e-logs/newman-backend.xml",
          "--timeout",
          "600000",
          "--timeout-request",
          "30000",
          "--timeout-script",
          "10000",
        ],
        options: {
          cwd: "<root>",
          output: "inherit",
          signal: "<signal>",
          logger: "<logger>",
        },
      },
    ]);
    expect(result.output).toEqual([
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
        text: "[arolariu::test:e2e::backend] ⚠️ 2 failed assertion(s) for backend.",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Summary written to: <root>/e2e-logs/newman-backend-summary.md",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized Newman JSON report (5 redaction(s)): <root>/e2e-logs/newman-backend.json",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized text report (2 redaction pass(es)): <root>/e2e-logs/newman-backend.xml",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized text report (1 redaction pass(es)): <root>/e2e-logs/newman-backend-summary.md",
        write: false,
      },
      {
        stream: "stderr",
        text: "[arolariu::test:e2e] ⛔ Process exited with code 1: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\ncommand: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\noutcome: exited",
        write: false,
      },
    ]);
    expect(result.reports).toEqual({
      "newman-backend.json":
        '{\n  "run": {\n    "stats": {\n      "requests": {\n        "total": 1,\n        "failed": 0\n      },\n      "assertions": {\n        "total": 2,\n        "failed": 2\n      }\n    },\n    "executions": [\n      {\n        "item": {\n          "name": "GET /rest/v1/invoices"\n        },\n        "request": {\n          "url": "https://api.arolariu.ro/rest/v1/invoices",\n          "headers": [\n            {\n              "key": "Authorization",\n              "value": "******"\n            }\n          ]\n        },\n        "response": {\n          "code": 200,\n          "body": "{\\"echo\\":\\"[REDACTED]\\"}"\n        },\n        "console": [\n          "decoded [REDACTED_JWT]"\n        ]\n      }\n    ],\n    "failures": [\n      {\n        "assertion": "Status code is 200",\n        "error": {\n          "message": "expected 401 to equal 200 for [REDACTED]"\n        },\n        "source": {\n          "name": "GET /rest/v1/invoices"\n        }\n      },\n      {\n        "assertion": "Body has id",\n        "error": "expected body to have property \'id\'",\n        "parent": {\n          "name": "Invoices"\n        }\n      }\n    ]\n  },\n  "environment": {\n    "values": [\n      {\n        "key": "authToken",\n        "value": "[REDACTED]",\n        "type": "secret"\n      },\n      {\n        "key": "baseUrl",\n        "value": "https://api.arolariu.ro",\n        "type": "default"\n      }\n    ]\n  }\n}',
      "newman-backend.xml":
        '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="newman" tests="2" failures="2">\n  <testsuite name="Invoices" tests="2">\n    <testcase name="GET /rest/v1/invoices" classname="Invoices">\n      <system-out>Authorization: ******</system-out>\n      <system-out>authToken=[REDACTED]</system-out>\n    </testcase>\n  </testsuite>\n</testsuites>',
      "newman-backend-summary.md":
        '### Failed Assertions (backend)\n1. AssertionError  Status code is 200\n   expected 401 to equal 200 for [REDACTED]\n   in "GET /rest/v1/invoices"\n\n2. AssertionError  Body has id\n   expected body to have property \'id\'\n   in "Invoices"\n',
    });
    expectTokenNeverRendered(result);
  });

  it("backend assertion failure (json): exit 1 and only the plain fatal diagnostic", async () => {
    const result = await characterizeE2e("backend", "json", {outcome: exited(1), failures: ASSERTION_FAILURES});

    expect(result.execution).toEqual({
      status: "failed",
      exitCode: 1,
      failure: {
        kind: "operational",
        message:
          "Process exited with code 1: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000",
        evidence: [
          "command: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000",
          "outcome: exited",
        ],
        cause: "RunnerError",
      },
    });
    expect(result.output).toEqual([
      {
        stream: "stderr",
        text: "Process exited with code 1: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\ncommand: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\noutcome: exited",
        write: false,
      },
    ]);
    expectTokenNeverRendered(result);
  });

  it("backend spawn failure (human): exit 1, no reports, failure output", async () => {
    const result = await characterizeE2e("backend", "human", {outcome: spawnFailed("spawn npx ENOENT")});

    expect(result.execution).toEqual({
      status: "failed",
      exitCode: 1,
      failure: {
        kind: "operational",
        message:
          "Process failed to start: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\nspawn npx ENOENT",
        evidence: [
          "command: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000",
          "outcome: spawn-failed",
        ],
        cause: "RunnerError",
      },
    });
    expect(result.calls).toEqual([
      {
        command: "npx",
        args: [
          "newman",
          "run",
          "<root>/sites/api.arolariu.ro/postman-collection.json",
          "--environment",
          "<root>/sites/api.arolariu.ro/postman-environment.production.json",
          "--env-var",
          "authToken=<token>",
          "--reporters",
          "cli,json,junit",
          "--reporter-json-export",
          "<root>/e2e-logs/newman-backend.json",
          "--reporter-junit-export",
          "<root>/e2e-logs/newman-backend.xml",
          "--timeout",
          "600000",
          "--timeout-request",
          "30000",
          "--timeout-script",
          "10000",
        ],
        options: {
          cwd: "<root>",
          output: "inherit",
          signal: "<signal>",
          logger: "<logger>",
        },
      },
    ]);
    expect(result.output).toEqual([
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
        text: "[arolariu::test:e2e] ⛔ Process failed to start: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\nspawn npx ENOENT\ncommand: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\noutcome: spawn-failed",
        write: false,
      },
    ]);
    expect(result.reports).toEqual({
      "newman-backend.json": null,
      "newman-backend.xml": null,
      "newman-backend-summary.md": null,
    });
    expectTokenNeverRendered(result);
  });

  it("backend spawn failure (json): exit 1 and only the plain fatal diagnostic", async () => {
    const result = await characterizeE2e("backend", "json", {outcome: spawnFailed("spawn npx ENOENT")});

    expect(result.execution).toEqual({
      status: "failed",
      exitCode: 1,
      failure: {
        kind: "operational",
        message:
          "Process failed to start: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\nspawn npx ENOENT",
        evidence: [
          "command: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000",
          "outcome: spawn-failed",
        ],
        cause: "RunnerError",
      },
    });
    expect(result.output).toEqual([
      {
        stream: "stderr",
        text: "Process failed to start: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\nspawn npx ENOENT\ncommand: npx newman run <root>/sites/api.arolariu.ro/postman-collection.json --environment <root>/sites/api.arolariu.ro/postman-environment.production.json --env-var authToken=[REDACTED] --reporters cli,json,junit --reporter-json-export <root>/e2e-logs/newman-backend.json --reporter-junit-export <root>/e2e-logs/newman-backend.xml --timeout 600000 --timeout-request 30000 --timeout-script 10000\noutcome: spawn-failed",
        write: false,
      },
    ]);
    expectTokenNeverRendered(result);
  });

  it("all (human): runs frontend, backend, cv sequentially with per-target token policy", async () => {
    const result = await characterizeE2e("all", "human", {outcome: succeeded(), failures: []});

    expect(result.execution).toEqual({
      status: "completed",
      value: {
        targets: ["frontend", "backend", "cv"],
        completed: ["frontend", "backend", "cv"],
      },
      exitCode: 0,
    });
    expect(result.calls).toEqual([
      {
        command: "npx",
        args: [
          "newman",
          "run",
          "<root>/sites/arolariu.ro/postman-collection.json",
          "--environment",
          "<root>/sites/arolariu.ro/postman-environment.production.json",
          "--env-var",
          "authToken=<token>",
          "--reporters",
          "cli,json,junit",
          "--reporter-json-export",
          "<root>/e2e-logs/newman-frontend.json",
          "--reporter-junit-export",
          "<root>/e2e-logs/newman-frontend.xml",
          "--timeout",
          "600000",
          "--timeout-request",
          "30000",
          "--timeout-script",
          "10000",
        ],
        options: {
          cwd: "<root>",
          output: "inherit",
          signal: "<signal>",
          logger: "<logger>",
        },
      },
      {
        command: "npx",
        args: [
          "newman",
          "run",
          "<root>/sites/api.arolariu.ro/postman-collection.json",
          "--environment",
          "<root>/sites/api.arolariu.ro/postman-environment.production.json",
          "--env-var",
          "authToken=<token>",
          "--reporters",
          "cli,json,junit",
          "--reporter-json-export",
          "<root>/e2e-logs/newman-backend.json",
          "--reporter-junit-export",
          "<root>/e2e-logs/newman-backend.xml",
          "--timeout",
          "600000",
          "--timeout-request",
          "30000",
          "--timeout-script",
          "10000",
        ],
        options: {
          cwd: "<root>",
          output: "inherit",
          signal: "<signal>",
          logger: "<logger>",
        },
      },
      {
        command: "npx",
        args: [
          "newman",
          "run",
          "<root>/sites/cv.arolariu.ro/postman-collection.json",
          "--environment",
          "<root>/sites/cv.arolariu.ro/postman-environment.production.json",
          "--reporters",
          "cli,json,junit",
          "--reporter-json-export",
          "<root>/e2e-logs/newman-cv.json",
          "--reporter-junit-export",
          "<root>/e2e-logs/newman-cv.xml",
          "--timeout",
          "600000",
          "--timeout-request",
          "30000",
          "--timeout-script",
          "10000",
        ],
        options: {
          cwd: "<root>",
          output: "inherit",
          signal: "<signal>",
          logger: "<logger>",
        },
      },
    ]);
    expect(result.tokenArgs).toEqual([["authToken=e2e-test-secret-value"], ["authToken=e2e-test-secret-value"], []]);
    expect(result.output).toEqual([
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
        text: "🧪 E2E Testing: frontend",
        write: false,
      },
      {
        stream: "stdout",
        text: "",
        write: false,
      },
      {
        stream: "stdout",
        text: "Collection: <root>/sites/arolariu.ro/postman-collection.json",
        write: false,
      },
      {
        stream: "stdout",
        text: "Environment: <root>/sites/arolariu.ro/postman-environment.production.json (production)",
        write: false,
      },
      {
        stream: "stdout",
        text: "JSON report: <root>/e2e-logs/newman-frontend.json",
        write: false,
      },
      {
        stream: "stdout",
        text: "JUnit report: <root>/e2e-logs/newman-frontend.xml",
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
        stream: "stdout",
        text: "[arolariu::test:e2e::frontend] ✅ Completed Newman tests for: frontend",
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
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ✅ Completed Newman tests for: backend",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::cv] ℹ️ cv does not require auth token; skipping auth injection.",
        write: false,
      },
      {
        stream: "stdout",
        text: "",
        write: false,
      },
      {
        stream: "stdout",
        text: "🧪 E2E Testing: cv",
        write: false,
      },
      {
        stream: "stdout",
        text: "",
        write: false,
      },
      {
        stream: "stdout",
        text: "Collection: <root>/sites/cv.arolariu.ro/postman-collection.json",
        write: false,
      },
      {
        stream: "stdout",
        text: "Environment: <root>/sites/cv.arolariu.ro/postman-environment.production.json (production)",
        write: false,
      },
      {
        stream: "stdout",
        text: "JSON report: <root>/e2e-logs/newman-cv.json",
        write: false,
      },
      {
        stream: "stdout",
        text: "JUnit report: <root>/e2e-logs/newman-cv.xml",
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
        stream: "stdout",
        text: "[arolariu::test:e2e::cv] ✅ Completed Newman tests for: cv",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::cv] ✅ No failed assertions for cv.",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::cv] ℹ️ Summary written to: <root>/e2e-logs/newman-cv-summary.md",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::cv] ℹ️ Sanitized Newman JSON report (2 redaction(s)): <root>/e2e-logs/newman-cv.json",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::cv] ℹ️ Sanitized text report (1 redaction pass(es)): <root>/e2e-logs/newman-cv.xml",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ✅ No failed assertions for backend.",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Summary written to: <root>/e2e-logs/newman-backend-summary.md",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized Newman JSON report (4 redaction(s)): <root>/e2e-logs/newman-backend.json",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized text report (2 redaction pass(es)): <root>/e2e-logs/newman-backend.xml",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::frontend] ✅ No failed assertions for frontend.",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::frontend] ℹ️ Summary written to: <root>/e2e-logs/newman-frontend-summary.md",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::frontend] ℹ️ Sanitized Newman JSON report (4 redaction(s)): <root>/e2e-logs/newman-frontend.json",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::frontend] ℹ️ Sanitized text report (2 redaction pass(es)): <root>/e2e-logs/newman-frontend.xml",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e] ✅ Completed 3 of 3 E2E target(s): frontend, backend, cv.",
        write: false,
      },
    ]);
    expect(result.reports).toEqual({
      "newman-frontend.json":
        '{\n  "run": {\n    "stats": {\n      "requests": {\n        "total": 1,\n        "failed": 0\n      },\n      "assertions": {\n        "total": 2,\n        "failed": 0\n      }\n    },\n    "executions": [\n      {\n        "item": {\n          "name": "GET /rest/v1/invoices"\n        },\n        "request": {\n          "url": "https://api.arolariu.ro/rest/v1/invoices",\n          "headers": [\n            {\n              "key": "Authorization",\n              "value": "******"\n            }\n          ]\n        },\n        "response": {\n          "code": 200,\n          "body": "{\\"echo\\":\\"[REDACTED]\\"}"\n        },\n        "console": [\n          "decoded [REDACTED_JWT]"\n        ]\n      }\n    ],\n    "failures": []\n  },\n  "environment": {\n    "values": [\n      {\n        "key": "authToken",\n        "value": "[REDACTED]",\n        "type": "secret"\n      },\n      {\n        "key": "baseUrl",\n        "value": "https://api.arolariu.ro",\n        "type": "default"\n      }\n    ]\n  }\n}',
      "newman-frontend.xml":
        '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="newman" tests="2" failures="0">\n  <testsuite name="Invoices" tests="2">\n    <testcase name="GET /rest/v1/invoices" classname="Invoices">\n      <system-out>Authorization: ******</system-out>\n      <system-out>authToken=[REDACTED]</system-out>\n    </testcase>\n  </testsuite>\n</testsuites>',
      "newman-frontend-summary.md": "### Failed Assertions (frontend)\nNo failed assertions.\n",
      "newman-backend.json":
        '{\n  "run": {\n    "stats": {\n      "requests": {\n        "total": 1,\n        "failed": 0\n      },\n      "assertions": {\n        "total": 2,\n        "failed": 0\n      }\n    },\n    "executions": [\n      {\n        "item": {\n          "name": "GET /rest/v1/invoices"\n        },\n        "request": {\n          "url": "https://api.arolariu.ro/rest/v1/invoices",\n          "headers": [\n            {\n              "key": "Authorization",\n              "value": "******"\n            }\n          ]\n        },\n        "response": {\n          "code": 200,\n          "body": "{\\"echo\\":\\"[REDACTED]\\"}"\n        },\n        "console": [\n          "decoded [REDACTED_JWT]"\n        ]\n      }\n    ],\n    "failures": []\n  },\n  "environment": {\n    "values": [\n      {\n        "key": "authToken",\n        "value": "[REDACTED]",\n        "type": "secret"\n      },\n      {\n        "key": "baseUrl",\n        "value": "https://api.arolariu.ro",\n        "type": "default"\n      }\n    ]\n  }\n}',
      "newman-backend.xml":
        '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="newman" tests="2" failures="0">\n  <testsuite name="Invoices" tests="2">\n    <testcase name="GET /rest/v1/invoices" classname="Invoices">\n      <system-out>Authorization: ******</system-out>\n      <system-out>authToken=[REDACTED]</system-out>\n    </testcase>\n  </testsuite>\n</testsuites>',
      "newman-backend-summary.md": "### Failed Assertions (backend)\nNo failed assertions.\n",
      "newman-cv.json":
        '{\n  "run": {\n    "stats": {\n      "requests": {\n        "total": 1,\n        "failed": 0\n      },\n      "assertions": {\n        "total": 2,\n        "failed": 0\n      }\n    },\n    "executions": [\n      {\n        "item": {\n          "name": "GET /rest/v1/invoices"\n        },\n        "request": {\n          "url": "https://api.arolariu.ro/rest/v1/invoices",\n          "headers": [\n            {\n              "key": "Authorization",\n              "value": "******"\n            }\n          ]\n        },\n        "response": {\n          "code": 200,\n          "body": "{\\"echo\\":\\"no-token-received\\"}"\n        },\n        "console": [\n          "decoded [REDACTED_JWT]"\n        ]\n      }\n    ],\n    "failures": []\n  },\n  "environment": {\n    "values": [\n      {\n        "key": "authToken",\n        "value": "no-token-received",\n        "type": "secret"\n      },\n      {\n        "key": "baseUrl",\n        "value": "https://api.arolariu.ro",\n        "type": "default"\n      }\n    ]\n  }\n}',
      "newman-cv.xml":
        '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="newman" tests="2" failures="0">\n  <testsuite name="Invoices" tests="2">\n    <testcase name="GET /rest/v1/invoices" classname="Invoices">\n      <system-out>Authorization: ******</system-out>\n      <system-out>authToken=no-token-received</system-out>\n    </testcase>\n  </testsuite>\n</testsuites>',
      "newman-cv-summary.md": "### Failed Assertions (cv)\nNo failed assertions.\n",
    });
    expectTokenNeverRendered(result);
  });
});
