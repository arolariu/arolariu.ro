// @vitest-environment node
/**
 * @fileoverview Tests for the shared container command output helpers.
 * @module scripts/commands/containers/output.test
 */

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {ProcessExited} from "../../platform/Process.ts";
import {makeTestLayer} from "../../platform/testing.ts";
import {renderContainerCompletion, reportChildExit} from "./output.ts";

/**
 * Builds a child exit for `command`.
 *
 * @param command - The formatted command.
 * @returns The exit with captured output.
 */
function childExit(command: string): ProcessExited {
  return new ProcessExited({command, stdout: "out", stderr: "err", durationMs: 0, exitCode: 4, message: `${command} exited with code 4`});
}

describe("reportChildExit", () => {
  it.each([
    ["docker compose -f x.yml up", "docker"],
    ['"C:\\Program Files\\Docker\\docker.exe" build .', "C:\\Program Files\\Docker\\docker.exe"],
    ["dotnet", "dotnet"],
  ])("human: names the executable of %s in one diagnostic, without evidence", async (command, executable) => {
    // Arrange
    const harness = makeTestLayer({context: "image"});

    // Act
    const failure = await Effect.runPromise(Effect.flip(reportChildExit(childExit(command))).pipe(Effect.provide(harness.layer)));

    // Assert
    expect(failure).toMatchObject({_tag: "ReportedFailure", exitCode: 1, message: `${executable} exited with code 4`});
    expect(harness.output()).toEqual([{stream: "stderr", text: `[arolariu::image] ⛔ ${executable} exited with code 4\n`}]);
  });

  it("json: writes one failure document with the process evidence, then the plain diagnostic", async () => {
    // Arrange
    const harness = makeTestLayer({context: "compose", mode: "json"});

    // Act
    const failure = await Effect.runPromise(
      Effect.flip(reportChildExit(childExit("docker compose -f x.yml up"))).pipe(Effect.provide(harness.layer)),
    );

    // Assert
    expect(failure).toMatchObject({_tag: "ReportedFailure", exitCode: 1, message: "docker exited with code 4"});
    expect(harness.output()).toEqual([
      {
        stream: "stdout",
        text: `${JSON.stringify(
          {
            status: "failed",
            kind: "operational",
            message: "docker exited with code 4",
            evidence: ["docker compose -f x.yml up exited with code 4", "stdout: out", "stderr: err"],
          },
          null,
          2,
        )}\n`,
      },
      {stream: "stderr", text: "docker exited with code 4\n"},
    ]);
  });
});

describe("renderContainerCompletion", () => {
  it("human: writes the success line only", async () => {
    // Arrange
    const harness = makeTestLayer({context: "aspire"});

    // Act
    await Effect.runPromise(renderContainerCompletion({engine: "rancher"}, "Done.").pipe(Effect.provide(harness.layer)));

    // Assert
    expect(harness.output()).toEqual([{stream: "stdout", text: "[arolariu::aspire] ✅ Done.\n"}]);
  });

  it("json: writes the result as the single document", async () => {
    // Arrange
    const harness = makeTestLayer({context: "aspire", mode: "json"});

    // Act
    await Effect.runPromise(renderContainerCompletion({engine: "rancher"}, "Done.").pipe(Effect.provide(harness.layer)));

    // Assert
    expect(harness.output()).toEqual([{stream: "stdout", text: '{\n  "engine": "rancher"\n}\n'}]);
  });
});
