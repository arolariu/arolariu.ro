// @vitest-environment node
/**
 * @fileoverview Secret-redaction regression tests for selfhost orchestration.
 * @module scripts/container-runtime/selfhost.redaction.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

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
import {runSelfhost} from "./selfhost.ts";
import type {CommandRunner} from "./process.ts";

const originalArgv = process.argv;
const originalSqlPassword = process.env["MSSQL_SA_PASSWORD"];

beforeEach(() => {
  process.argv = ["node", "selfhost.ts", "start", "--engine", "podman"];
});

afterEach(() => {
  process.argv = originalArgv;
  if (originalSqlPassword === undefined) {
    delete process.env["MSSQL_SA_PASSWORD"];
  } else {
    process.env["MSSQL_SA_PASSWORD"] = originalSqlPassword;
  }
  vi.clearAllMocks();
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
            output: `sqlcmd failed with ${sqlPassword}`,
          };
        }

        return {
          code: 0,
          output: "podman version 5.8.2\npodman-compose version 1.5.0",
        };
      },
    };

    let failure: unknown;
    try {
      await runSelfhost("start", runner, logger);
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
});
