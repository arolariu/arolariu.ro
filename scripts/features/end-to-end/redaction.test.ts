// @vitest-environment node
/**
 * @fileoverview JWT and key-based redaction, and the end-to-end guarantee that a token present in
 * the environment is registered for redaction before any command construction and never reaches
 * presenter output or a retained report artifact. The JWT used here is synthesized at runtime from
 * a harmless header, payload, and fake signature, so no real credential exists in this file, and
 * every process interaction is served by {@link buildProgrammableProcessRunner}.
 * @module scripts/features/end-to-end/redaction.test
 */

import {dirname, join} from "node:path";
import {describe, expect, it} from "vitest";

import type {ProcessExecutionResult} from "../../core/process/process-execution-result.ts";
import {ProcessRunnerError} from "../../core/process/process-runner.ts";
import type {FileSystem} from "../../core/runtime/runtime-capability.ts";
import {buildCommandHost} from "../../testing/builders/command-host.builder.ts";
import {buildRuntimeEnvironment} from "../../testing/builders/environment.builder.ts";
import {
  buildExitedProcessExecutionResult,
  buildProgrammableProcessRunner,
  buildSpawnFailedProcessExecutionResult,
  buildSucceededProcessExecutionResult,
} from "../../testing/builders/process-result.builder.ts";
import {createMemoryFileSystem} from "../../testing/fixtures/memory-filesystem.fixture.ts";
import {repositoryFixtureRoot} from "../../testing/fixtures/repository.fixture.ts";
import {buildRecordingPresenter} from "../../testing/fixtures/terminal.fixture.ts";
import {createEndToEndCommand} from "./command.ts";
import {redactReportText, redactSensitiveString, sanitizeJsonValue} from "./redaction.ts";

/** Deliberately non-JWT-shaped fake secret used for exact-match redaction proofs. */
const FAKE_TOKEN = "e2e-test-secret-value";
const backendDirectory = "sites/api.arolariu.ro";
const reportDirectory = join(repositoryFixtureRoot, "e2e-logs");

/** Generates a synthetic JWT-shaped token at runtime (harmless header/payload, fake signature). */
function generateSyntheticJwt(): string {
  const header = Buffer.from(JSON.stringify({alg: "HS256", typ: "JWT"})).toString("base64url");
  const payload = Buffer.from(JSON.stringify({sub: "test-user", iat: 1234567890, exp: 9999999999})).toString("base64url");
  return `${header}.${payload}.${Buffer.from("test-signature-not-a-real-secret").toString("base64url")}`;
}

/** Seeds the backend target's collection and environment file. */
const backendFiles = (): FileSystem =>
  createMemoryFileSystem({
    [join(repositoryFixtureRoot, backendDirectory, "postman-collection.json")]: JSON.stringify({info: {name: "test"}, item: []}),
    [join(repositoryFixtureRoot, backendDirectory, "postman-environment.production.json")]: JSON.stringify({name: "env", values: []}),
  });

/** Runs the real backend command with a runner that writes token-bearing JSON and JUnit reporter
 * artifacts to the exact paths Newman would have been given, matching Newman's own behavior of
 * writing reporters even when assertions fail.
 * @returns The command execution, every retained artifact, and the recorded presenter transcript. */
async function runBackendWithArtifacts(token: string, outcome: ProcessExecutionResult = buildSucceededProcessExecutionResult()) {
  const files = backendFiles();
  const {presenter, sink} = buildRecordingPresenter();
  const runner = buildProgrammableProcessRunner(async (request) => {
    const write = async (flag: string, contents: string): Promise<void> => {
      const path = request.args[request.args.indexOf(flag) + 1] ?? "";
      await files.createDirectory(dirname(path), {recursive: true});
      await files.writeText(path, contents);
    };
    await write(
      "--reporter-json-export",
      JSON.stringify({
        run: {failures: [{assertion: `Token ${token} must pass`, error: `Rejected ${token}`, source: {name: `Request ${token}`}}]},
        environment: {values: [{key: "authToken", value: token, type: "text"}]},
        response: {body: `{"authToken":"${token}"}`},
      }),
    );
    await write("--reporter-junit-export", `<testsuites name="newman"><testcase name="Auth test">${token}</testcase></testsuites>`);
    return outcome;
  });
  const environment = buildRuntimeEnvironment({variables: {E2E_TEST_AUTH_TOKEN: token}});
  const host = buildCommandHost({runtime: {files, runner, presenter, environment}});
  const execution = await createEndToEndCommand({host}).invoke({target: "backend"}, {presentation: "human"});
  const artifacts = await Promise.all(
    ["newman-backend.json", "newman-backend.xml", "newman-backend-summary.md"].map((name) => files.readText(join(reportDirectory, name))),
  );

  return {execution, artifacts, transcript: sink.records.map(({text}) => text).join("\n")};
}

describe("end-to-end token redaction", () => {
  it("registers a plain runtime token before any command construction, so no raw token reaches output or an artifact", async () => {
    const {execution, artifacts, transcript} = await runBackendWithArtifacts(FAKE_TOKEN);
    expect(execution.status).toBe("completed");
    // The `--env-var` argument is constructed after `presenter.redact`, so even the echoed command is safe.
    expect(transcript).not.toContain(FAKE_TOKEN);
    for (const content of artifacts) {
      expect(content).not.toContain(FAKE_TOKEN);
      expect(content).toContain("[REDACTED]");
    }
  });

  it.each([
    ["success", buildSucceededProcessExecutionResult(), "completed"],
    ["nonzero exit", buildExitedProcessExecutionResult(1), "failed"],
  ] as const)("sanitizes a JWT-shaped token out of every artifact and the transcript on the %s path", async (_label, outcome, status) => {
    const jwt = generateSyntheticJwt();
    const {execution, artifacts, transcript} = await runBackendWithArtifacts(jwt, outcome);
    expect(execution.status).toBe(status);
    expect(transcript).not.toContain(jwt);
    for (const content of artifacts) {
      expect(content).not.toContain(jwt);
      expect(content).not.toMatch(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/u);
    }
    expect(artifacts[1]).toContain("testsuites");
  });

  it("keeps the raw token out of the retained ProcessRunnerError request, result, and evidence", async () => {
    const runner = buildProgrammableProcessRunner(() =>
      buildSpawnFailedProcessExecutionResult(`spawn failed for ${FAKE_TOKEN}`, {
        stdout: `stdout ${FAKE_TOKEN}`,
        stderr: `stderr ${FAKE_TOKEN}`,
      }),
    );
    const environment = buildRuntimeEnvironment({variables: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN}});
    const host = buildCommandHost({runtime: {files: backendFiles(), runner, environment}});
    const execution = await createEndToEndCommand({host}).invoke({target: "backend"});
    expect(execution.status).toBe("failed");
    if (execution.status !== "failed") return;
    const {cause, message, evidence} = execution.failure;
    expect(message).not.toContain(FAKE_TOKEN);
    expect(evidence.join("\n")).not.toContain(FAKE_TOKEN);
    expect(cause).toBeInstanceOf(ProcessRunnerError);
    if (!(cause instanceof ProcessRunnerError)) return;
    expect([cause.message, cause.request.args.join("\n"), cause.result.stdout, cause.result.stderr].join("\n")).not.toContain(FAKE_TOKEN);
    expect(cause.result.kind).toBe("spawn-failed");
    if (cause.result.kind === "spawn-failed") expect(cause.result.message).not.toContain(FAKE_TOKEN);
  });
});

describe("redactSensitiveString and sanitizeJsonValue", () => {
  it("redacts values under sensitive keys regardless of shape and recurses through arrays", () => {
    const accumulator = {redactionCount: 0};
    expect(sanitizeJsonValue({authToken: "abc123", nested: {accessToken: "def456"}, safe: "ok"}, accumulator)).toEqual({
      authToken: "[REDACTED]",
      nested: {accessToken: "[REDACTED]"},
      safe: "ok",
    });
    expect(sanitizeJsonValue([{token: "secret"}, {safe: "ok"}, 7, null, true], accumulator)).toEqual([
      {token: "[REDACTED]"},
      {safe: "ok"},
      7,
      null,
      true,
    ]);
    expect(accumulator.redactionCount).toBe(3);
  });

  it("redacts a bare JWT under a non-sensitive key, masks a bearer JWT, and skips an empty sensitive value", () => {
    const jwt = generateSyntheticJwt();
    const accumulator = {redactionCount: 0};
    expect(redactSensitiveString(`payload: ${jwt}`, "message", accumulator)).toBe("payload: [REDACTED_JWT]");
    expect(redactSensitiveString(`Authorization: Bearer ${jwt}`, null, accumulator)).toBe("Authorization: ******");
    expect(redactSensitiveString(`opaque:${FAKE_TOKEN}:suffix`, "body", accumulator, FAKE_TOKEN)).toBe("opaque:[REDACTED]:suffix");
    expect(redactSensitiveString("   ", "authToken", accumulator)).toBe("   ");
    expect(accumulator.redactionCount).toBe(3);
  });

  it("counts one redaction pass per applied rule and reports zero when nothing matches", () => {
    const jwt = generateSyntheticJwt();
    expect(redactReportText(`token=${FAKE_TOKEN} auth=Bearer ${jwt} bare=${jwt}`, FAKE_TOKEN)).toEqual({
      content: "token=[REDACTED] auth=****** bare=[REDACTED_JWT]",
      redactionCount: 3,
    });
    expect(redactReportText("nothing to redact", undefined)).toEqual({content: "nothing to redact", redactionCount: 0});
    expect(redactReportText("nothing to redact", "")).toEqual({content: "nothing to redact", redactionCount: 0});
  });
});
