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

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import {AbstractProcessRunner, type ProcessOutcome, type ProcessRequest, type ProcessRunOptions} from "./common/runner.ts";
import {createMemoryFileSystem, createTestRuntimeFactory, repositoryFixtureRoot} from "./common/runtime.testing.ts";
import type {FileSystem, RuntimeEnvironment} from "./common/runtime.ts";
import {
  createE2eCommand,
  redactSensitiveString,
  sanitizeJsonValue,
  sanitizeNewmanJsonReport,
  sanitizeNewmanTextReport,
  writeAssertionSummary,
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

function spawnFailed(message: string): ProcessOutcome {
  return {kind: "spawn-failed", message, stdout: "", stderr: "", durationMs: 1};
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
  readonly #outcomeFor: (request: Readonly<ProcessRequest>) => ProcessOutcome;
  readonly #artifactToken: string | undefined;
  readonly #calls: RecordedCall[] = [];

  public constructor(
    files: FileSystem,
    options: Readonly<{outcomeFor?: (request: Readonly<ProcessRequest>) => ProcessOutcome; artifactToken?: string}> = {},
  ) {
    super();
    this.#files = files;
    this.#outcomeFor = options.outcomeFor ?? (() => succeeded());
    this.#artifactToken = options.artifactToken;
  }

  /** Every recorded invocation, in call order. */
  public get calls(): readonly RecordedCall[] {
    return this.#calls;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override async execute(request: Readonly<ProcessRequest>, options: Readonly<ProcessRunOptions>): Promise<ProcessOutcome> {
    this.#calls.push({request, options});
    const outcome = this.#outcomeFor(request);
    if (this.#artifactToken !== undefined && (outcome.kind === "succeeded" || outcome.kind === "exited")) {
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
          failures: [],
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
});

// ============================================================================
// createE2eCommand — typed runner failure outcomes and cleanup
// ============================================================================

describe("createE2eCommand: typed runner failure outcomes and cleanup", () => {
  it.each([
    ["nonzero exit", () => exited(1)],
    ["timeout", () => timedOut()],
    ["spawn failure", () => spawnFailed("ENOENT")],
    ["cancellation", () => cancelledOutcome()],
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
    let summaryWriteAttempted = false;
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
          summaryWriteAttempted = true;
        }
        return rawFiles.writeText(path, contents, options);
      },
    };
    const runner = new FakeNewmanRunner(rawFiles, {artifactToken: FAKE_TOKEN});
    const environment = testEnvironment({E2E_TEST_AUTH_TOKEN: FAKE_TOKEN});
    const command = createE2eCommand(createTestRuntimeFactory({files: failingFiles, runner, environment}));

    await command.invoke({target: "backend"}, {presentation: "silent"});

    expect(junitWriteAttempted).toBe(true);
    expect(summaryWriteAttempted).toBe(true);
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
