// @vitest-environment node
/**
 * @fileoverview Contract tests for the shared Commander CLI adapter.
 * @module scripts.common.cli.test
 */

import {CommanderError} from "commander";
import {describe, expect, it} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./logger.ts";
import {commanderExitCode, createToolProgram, normalizeSlashArguments} from "./cli.ts";

describe("normalizeSlashArguments", () => {
  it("normalizes only exact slash aliases", () => {
    expect(
      normalizeSlashArguments(
        ["/h", "/v", "C:\\work\\file.txt", "/unknown"],
        {"/h": "--help", "/v": "--verbose"},
      ),
    ).toEqual(["--help", "--verbose", "C:\\work\\file.txt", "/unknown"]);
  });
});

describe("createToolProgram", () => {
  it("routes commander help through the injected logger", () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
    const program = createToolProgram({
      name: "sample",
      description: "Sample command.",
      examples: ["npm run sample -- --verbose"],
      logger,
    });

    expect(() => program.parse(["node", "sample", "--help"])).toThrow();
    expect(sink.records.map((record) => record.text).join("")).toContain("Usage:");
  });

  it("routes commander help through the injected logger from parseAsync", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
    const program = createToolProgram({
      name: "sample",
      description: "Sample command.",
      examples: ["npm run sample -- --verbose"],
      logger,
    });

    await expect(program.parseAsync(["node", "sample", "--help"])).rejects.toBeInstanceOf(CommanderError);
    expect(sink.records.map((record) => record.text).join("")).toContain("Usage:");
  });
});

describe("commanderExitCode", () => {
  it("maps commander help and parse errors to their exit codes", () => {
    expect(commanderExitCode(new CommanderError(0, "commander.helpDisplayed", ""))).toBe(0);
    expect(commanderExitCode(new CommanderError(1, "commander.unknownOption", "bad"))).toBe(1);
    expect(commanderExitCode(new Error("other"))).toBeNull();
  });
});
