// @vitest-environment node
/**
 * @fileoverview Secret-redaction regression tests for the declarative selfhost command.
 * @module scripts/container-runtime/selfhost.redaction.test
 */

import {describe, expect, it} from "vitest";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../common/logger.ts";
import {RunnerError, type ProcessOutcome} from "../common/runner.ts";
import {
  createProcessRunner,
  createRepositoryFixtureFileSystem,
  createTestProcessHost,
  createTestRuntimeFactory,
  repositoryFixtureRoot,
} from "../common/runtime.testing.ts";
import type {Clock, RuntimeEnvironment} from "../common/runtime.ts";
import type {CommandExecution, CommandInvoker} from "../common/commander.ts";
import type {ArtifactGenerationResult, GenerateArtifactsInput} from "../generate.artifacts.ts";
import type {LocalStorageBootstrap} from "./selfhost.bootstrap.ts";
import {createSelfhostCommand} from "./selfhost.ts";

const sqlPassword = "local-password-that-must-be-redacted";
const certFixturePath = "infra/Local/Management/certs/local-cert.pem";
const keyFixturePath = "infra/Local/Management/certs/local-key.pem";

/** One `succeeded` outcome per Podman preflight probe: tool, Docker Desktop rejection, backend x2, compose, existing containers. */
const podmanPreflightProbeCount = 6;

function succeeded(): ProcessOutcome {
  return {kind: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 0};
}

const immediateClock: Clock = {
  monotonicNow: (): number => 0,
  isoTimestamp: (): string => "2025-01-01T00:00:00.000Z",
  delay: (): Promise<void> => Promise.resolve(),
};

const bootstrapStub: LocalStorageBootstrap = {
  ensureCosmos: (): Promise<void> => Promise.resolve(),
  ensureAzurite: (): Promise<void> => Promise.resolve(),
};

const artifactsStub: CommandInvoker<GenerateArtifactsInput, ArtifactGenerationResult> = {
  invoke: (): Promise<CommandExecution<ArtifactGenerationResult>> =>
    Promise.resolve({status: "completed", value: {summary: "Generated 5 artifact file(s).", generatedFiles: []}, exitCode: 0}),
};

function environmentWith(variables: Readonly<Record<string, string | undefined>>): RuntimeEnvironment {
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

/**
 * Builds a selfhost command whose SQL bootstrap command fails with a password-bearing stderr.
 *
 * @returns The command under test plus its recording runner, logger sink, and process host.
 */
function createFailingSqlHarness(): Readonly<{
  command: ReturnType<typeof createSelfhostCommand>;
  runner: ReturnType<typeof createProcessRunner>;
  sink: InMemoryLoggerSink;
  processHost: ReturnType<typeof createTestProcessHost>;
}> {
  const runner = createProcessRunner([
    ...Array.from({length: podmanPreflightProbeCount + 2}, () => succeeded()),
    {kind: "exited", exitCode: 1, stdout: "", stderr: `sqlcmd failed with ${sqlPassword}`, durationMs: 0},
  ]);
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
  const processHost = createTestProcessHost(["start", "--engine", "podman"]);
  const runtimeFactory = {
    ...createTestRuntimeFactory({
      runner,
      logger,
      clock: immediateClock,
      files: createRepositoryFixtureFileSystem({[certFixturePath]: "local-cert", [keyFixturePath]: "local-key"}),
      environment: environmentWith({MSSQL_SA_PASSWORD: sqlPassword}),
    }),
    processHost,
  };

  return {
    command: createSelfhostCommand({runtimeFactory, bootstrap: bootstrapStub, artifacts: artifactsStub}),
    runner,
    sink,
    processHost,
  };
}

describe("selfhost SQL password redaction", () => {
  it("registers the password before the SQL command echo and failure text reach the shared logger", async () => {
    const {command, sink} = createFailingSqlHarness();

    const execution = await command.invoke({action: "start", engine: "podman"}, {presentation: "human"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1});
    const output = sink.records.map((record) => record.text).join("\n");
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain(sqlPassword);
  });

  it("keeps the password out of the typed failure message and its retained runner diagnostics", async () => {
    const {command} = createFailingSqlHarness();

    const execution = await command.invoke({action: "start", engine: "podman"});

    expect(execution.status).toBe("failed");
    const failure = execution.status === "failed" ? execution.failure : undefined;
    expect(failure?.message).not.toContain(sqlPassword);
    expect(failure?.message).toContain("[REDACTED]");
    expect(failure?.cause).toBeInstanceOf(RunnerError);
    const cause = failure?.cause instanceof RunnerError ? failure.cause : undefined;
    expect(cause?.request.args).toContain("[REDACTED]");
    expect(cause?.request.args).not.toContain(sqlPassword);
    expect(cause?.outcome.stderr).not.toContain(sqlPassword);
  });

  it("never places the password in any child-process environment", async () => {
    const {command, runner} = createFailingSqlHarness();

    await command.invoke({action: "start", engine: "podman"});

    expect(runner.calls.every((call) => !JSON.stringify(call.options.env ?? {}).includes(sqlPassword))).toBe(true);
  });

  it("reuses the invocation logger when the direct entrypoint reports a password-bearing failure", async () => {
    const {command, sink, processHost} = createFailingSqlHarness();

    await command.runIfMain("file:///repo/scripts/container-runtime/selfhost.ts");

    const output = sink.records.map((record) => record.text).join("\n");
    expect(processHost.assignedExitCodes).toEqual([1]);
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain(sqlPassword);
  });
});
