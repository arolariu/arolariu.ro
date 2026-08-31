// @vitest-environment node
/**
 * @fileoverview Secret-redaction regression tests for selfhost orchestration.
 * @module scripts/container-runtime/selfhost.redaction.test
 */

import {afterEach, describe, expect, it, vi} from "vitest";

const {access, mkdir, writeFile, delay} = vi.hoisted(() => ({
  access: vi.fn(async () => undefined),
  mkdir: vi.fn(async () => undefined),
  writeFile: vi.fn(async () => undefined),
  delay: vi.fn(async () => undefined),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    access,
    mkdir,
    writeFile,
  };
});

vi.mock("node:timers/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:timers/promises")>();
  return {
    ...actual,
    setTimeout: delay,
  };
});

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../common/logger.ts";
import type {CommandRunner} from "../common/process.ts";
import {runSelfhost, runSelfhostEntrypoint} from "./selfhost.ts";

const originalSqlPassword = process.env["MSSQL_SA_PASSWORD"];
const originalExitCode = process.exitCode;

afterEach(() => {
  if (originalSqlPassword === undefined) {
    delete process.env["MSSQL_SA_PASSWORD"];
  } else {
    process.env["MSSQL_SA_PASSWORD"] = originalSqlPassword;
  }
  process.exitCode = originalExitCode;
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("runSelfhost SQL password redaction", () => {
  it("registers the password before its command echo and failed command text reach the shared logger", async () => {
    const sqlPassword = "local-password-that-must-be-redacted";
    process.env["MSSQL_SA_PASSWORD"] = sqlPassword;
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {
      color: false,
      sink,
    });
    let sawSqlCommand = false;
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.args.includes("-P")) {
          sawSqlCommand = true;
          return {
            code: 1,
            stdout: "",
            stderr: `sqlcmd failed with ${sqlPassword}`,
            durationMs: 0,
            timedOut: false,
          };
        }

        return {
          code: 0,
          stdout: "podman version 5.8.2\npodman-compose version 1.5.0",
          stderr: "",
          durationMs: 0,
          timedOut: false,
        };
      },
    };

    let failure: unknown;
    try {
      await runSelfhost("start", {requestedEngine: "podman", runner, logger});
    } catch (error) {
      failure = error;
    }

    expect(sawSqlCommand).toBe(true);
    expect(failure).toBeInstanceOf(Error);
    logger.error(failure instanceof Error ? failure.message : String(failure));
    const output = sink.records.map((record) => record.text).join("\n");

    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain(sqlPassword);
  });

  it("reuses the direct-entrypoint logger when reporting a password-bearing runtime error", async () => {
    const sqlPassword = "direct-entrypoint-password";
    process.env["MSSQL_SA_PASSWORD"] = sqlPassword;
    const errorOutput = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.args.includes("-P")) {
          return {
            code: 1,
            stdout: "",
            stderr: `sqlcmd rejected ${sqlPassword}`,
            durationMs: 0,
            timedOut: false,
          };
        }

        return {
          code: 0,
          stdout: "podman version 5.8.2\npodman-compose version 1.5.0",
          stderr: "",
          durationMs: 0,
          timedOut: false,
        };
      },
    };

    await runSelfhostEntrypoint(["start", "--engine", "podman"], {runner});

    const output = errorOutput.mock.calls.flat().join("\n");
    expect(process.exitCode).toBe(1);
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain(sqlPassword);
  });
});
