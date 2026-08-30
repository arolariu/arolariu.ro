/**
 * @fileoverview Tests for container runtime process execution.
 * @module scripts/container-runtime/process.test
 */

import {describe, expect, it} from "vitest";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../common/logger.ts";
import type {CommandRunOptions, CommandRunner as CommonCommandRunner, CommandResult} from "../common/process.ts";
import {adaptCommandRunner, defaultRunner, formatCommand, makeDryRunRunner, type CommandStdioMode} from "./process.ts";

const successfulResult: CommandResult = {
  code: 0,
  stdout: "stdout",
  stderr: "stderr",
  durationMs: 1,
  timedOut: false,
};

describe("formatCommand", () => {
  it("formats commands for diagnostics", () => {
    expect(formatCommand({command: "podman", args: ["compose", "up", "-d"]})).toBe("podman compose up -d");
  });

  it("quotes arguments containing spaces", () => {
    expect(formatCommand({command: "docker", args: ["exec", "my container"]})).toBe('docker exec "my container"');
  });
});

describe("makeDryRunRunner", () => {
  it("records commands without executing them", async () => {
    const runner = makeDryRunRunner();

    const result = await runner.run({command: "podman", args: ["--version"]});

    expect(result).toEqual({code: 0, output: ""});
    expect(runner.commands).toEqual(["podman --version"]);
  });
});

describe("defaultRunner", () => {
  it("merges provided environment with process environment", async () => {
    const result = await defaultRunner.run(
      {
        command: process.execPath,
        args: ["-e", "process.stdout.write(process.env.CONTAINER_RUNTIME_TEST_VALUE ?? '')"],
      },
      {
        env: {CONTAINER_RUNTIME_TEST_VALUE: "merged-env"},
      },
    );

    expect(result).toEqual({code: 0, output: "merged-env"});
  });

  it("preserves spawn errors in the legacy output field", async () => {
    const command = "definitely-not-a-real-tool-xyzzy-12345";

    const result = await defaultRunner.run({command, args: []});

    expect(result.code).toBe(1);
    expect(result.output).toContain(command);
  });
});

describe("adaptCommandRunner", () => {
  it.each([
    {stdio: null, expected: "capture"},
    {stdio: "pipe", expected: "capture"},
    {stdio: "tee", expected: "tee"},
    {stdio: "inherit", expected: "inherit"},
  ] as const)("maps legacy $stdio stdio to $expected output", async ({stdio, expected}) => {
    let receivedOptions: Readonly<CommandRunOptions> | undefined;
    const commonRunner: CommonCommandRunner = {
      run: async (_command, options) => {
        receivedOptions = options;
        return successfulResult;
      },
    };
    const runner = adaptCommandRunner(commonRunner);
    const options = stdio === null ? undefined : {stdio: stdio satisfies CommandStdioMode};

    await runner.run({command: "tool", args: []}, options);

    expect(receivedOptions?.output).toBe(expected);
  });

  it("passes cwd, environment, and an injected logger to the shared runner", async () => {
    let receivedOptions: Readonly<CommandRunOptions> | undefined;
    const commonRunner: CommonCommandRunner = {
      run: async (_command, options) => {
        receivedOptions = options;
        return successfulResult;
      },
    };
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("container", {
      color: false,
      sink,
    });

    await adaptCommandRunner(commonRunner).run(
      {command: "tool", args: []},
      {
        cwd: "workspace",
        env: {CONTAINER_RUNTIME_TEST: "value"},
        logger,
        stdio: "tee",
      },
    );

    expect(receivedOptions).toMatchObject({
      cwd: "workspace",
      env: {CONTAINER_RUNTIME_TEST: "value"},
      logger,
      output: "tee",
    });
  });

  it("supplies a compatibility logger for tee mode", async () => {
    let receivedOptions: Readonly<CommandRunOptions> | undefined;
    const commonRunner: CommonCommandRunner = {
      run: async (_command, options) => {
        receivedOptions = options;
        return successfulResult;
      },
    };

    await adaptCommandRunner(commonRunner).run({command: "tool", args: []}, {stdio: "tee"});

    expect(receivedOptions?.logger).toBeDefined();
  });

  it("preserves merged stdout, stderr, and spawn errors in output", async () => {
    const commonRunner: CommonCommandRunner = {
      run: async () => ({
        code: 1,
        stdout: "stdout",
        stderr: "stderr",
        durationMs: 1,
        timedOut: false,
        spawnError: "spawn-error",
      }),
    };

    const result = await adaptCommandRunner(commonRunner).run({
      command: "tool",
      args: [],
    });

    expect(result).toEqual({
      code: 1,
      output: "stdoutstderrspawn-error",
    });
  });
});
