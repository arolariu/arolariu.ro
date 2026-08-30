// @vitest-environment node
/**
 * @fileoverview Contract tests for monorepository script logging.
 * @module scripts.common.logger.test
 */

import {stripVTControlCharacters} from "node:util";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./logger.ts";

describe("MonorepositoryConsoleLogger", () => {
  let stdoutIsTTYDescriptor: PropertyDescriptor | undefined;
  let noColorWasSet: boolean;
  let noColorValue: string | undefined;

  beforeEach(() => {
    stdoutIsTTYDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
    noColorWasSet = Object.hasOwn(process.env, "NO_COLOR");
    noColorValue = process.env["NO_COLOR"];
    delete process.env["NO_COLOR"];
  });

  afterEach(() => {
    if (stdoutIsTTYDescriptor === undefined) {
      Reflect.deleteProperty(process.stdout, "isTTY");
    } else {
      Object.defineProperty(process.stdout, "isTTY", stdoutIsTTYDescriptor);
    }

    if (noColorWasSet) {
      process.env["NO_COLOR"] = noColorValue;
    } else {
      delete process.env["NO_COLOR"];
    }

    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("routes semantic levels through the production console sink", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const logger = new MonorepositoryConsoleLogger("generate::artifacts", {
      color: false,
    });

    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warning message");
    logger.error("error message");
    logger.success("success message");

    expect(debug).toHaveBeenCalledOnce();
    expect(debug).toHaveBeenCalledWith("[arolariu::generate::artifacts] 🐛 debug message");
    expect(info).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenNthCalledWith(1, "[arolariu::generate::artifacts] ℹ️ info message");
    expect(info).toHaveBeenNthCalledWith(2, "[arolariu::generate::artifacts] ✅ success message");
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith("[arolariu::generate::artifacts] ⚠️ warning message");
    expect(error).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith("[arolariu::generate::artifacts] ⛔ error message");
  });

  it("routes production line and raw writes to their requested streams", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderrWrite = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const logger = new MonorepositoryConsoleLogger("setup", {
      color: false,
    });

    logger.line("stdout line");
    logger.line("stderr line", "stderr");
    logger.write("stdout chunk");
    logger.write("stderr chunk", "stderr");

    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith("stdout line");
    expect(error).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith("stderr line");
    expect(stdoutWrite).toHaveBeenCalledOnce();
    expect(stdoutWrite).toHaveBeenCalledWith("stdout chunk");
    expect(stderrWrite).toHaveBeenCalledOnce();
    expect(stderrWrite).toHaveBeenCalledWith("stderr chunk");
  });

  it("routes semantic levels with the stable context prefix", () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("generate::artifacts", {
      color: false,
      sink,
    });

    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warning message");
    logger.error("error message");
    logger.success("success message");

    expect(sink.records).toEqual([
      {
        stream: "stdout",
        text: "[arolariu::generate::artifacts] 🐛 debug message",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::generate::artifacts] ℹ️ info message",
        write: false,
      },
      {
        stream: "stderr",
        text: "[arolariu::generate::artifacts] ⚠️ warning message",
        write: false,
      },
      {
        stream: "stderr",
        text: "[arolariu::generate::artifacts] ⛔ error message",
        write: false,
      },
      {
        stream: "stdout",
        text: "[arolariu::generate::artifacts] ✅ success message",
        write: false,
      },
    ]);
  });

  it("suppresses debug messages when verbose output is disabled", () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("setup", {
      color: false,
      sink,
      verbose: false,
    });

    logger.debug("hidden");
    logger.info("visible");

    expect(sink.records).toEqual([
      {
        stream: "stdout",
        text: "[arolariu::setup] ℹ️ visible",
        write: false,
      },
    ]);
  });

  it("appends child contexts without changing the parent logger", () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("doctor", {
      color: false,
      sink,
    });

    logger.child("infrastructure").child("containers").info("child");
    logger.info("parent");

    expect(sink.records.map((record) => record.text)).toEqual([
      "[arolariu::doctor::infrastructure::containers] ℹ️ child",
      "[arolariu::doctor] ℹ️ parent",
    ]);
  });

  it("renders styled segments and preserves line versus write semantics", () => {
    Object.defineProperty(process.stdout, "isTTY", {configurable: true, value: true});
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("format", {
      color: true,
      sink,
    });

    logger.line([
      {text: "Status: ", styles: ["dim"]},
      {text: "ready", styles: ["bold", "green"]},
    ]);
    logger.write([{text: "detail", styles: ["cyan"]}], "stderr");

    expect(stripVTControlCharacters(sink.records[0]?.text ?? "")).toBe("Status: ready");
    expect(stripVTControlCharacters(sink.records[1]?.text ?? "")).toBe("detail");
    expect(sink.records[0]?.text).toMatch(/\u001B\[/u);
    expect(sink.records[1]?.text).toMatch(/\u001B\[/u);
    expect(sink.records.map(({stream, write}) => ({stream, write}))).toEqual([
      {stream: "stdout", write: false},
      {stream: "stderr", write: true},
    ]);
  });

  it("renders sections, banners, blank lines, and commands as human presentation output", () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test::e2e", {
      color: false,
      sink,
    });

    logger.section("Running all E2E tests", "🎯");
    logger.banner(["top", "bottom"], "magenta");
    logger.line();
    logger.command("npm run test:e2e");

    expect(sink.records.map((record) => record.text)).toEqual([
      "",
      "🎯 Running all E2E tests",
      "",
      "top",
      "bottom",
      "",
      "$ npm run test:e2e",
    ]);
  });

  it("aligns table columns using the widest header or row value", () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("doctor", {
      color: false,
      sink,
    });

    logger.table({
      headers: ["Name", "Count"],
      rows: [
        ["alpha", "2"],
        ["beta", "10"],
      ],
      align: ["left", "right"],
    });

    expect(sink.records.map((record) => record.text)).toEqual(["Name   Count", "-----  -----", "alpha      2", "beta      10"]);
  });

  it("suppresses ANSI styling when stdout is not a TTY", () => {
    Object.defineProperty(process.stdout, "isTTY", {configurable: true, value: false});
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("doctor", {
      color: true,
      sink,
    });

    logger.line([{text: "plain", styles: ["bold", "green"]}]);

    expect(sink.records[0]?.text).toBe("plain");
  });

  it("suppresses ANSI styling when NO_COLOR is present", () => {
    Object.defineProperty(process.stdout, "isTTY", {configurable: true, value: true});
    process.env["NO_COLOR"] = "";
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("doctor", {
      color: true,
      sink,
    });

    logger.line([{text: "plain", styles: ["bold", "green"]}]);

    expect(sink.records[0]?.text).toBe("plain");
  });

  it("emits JSON without human output or ANSI escapes", () => {
    Object.defineProperty(process.stdout, "isTTY", {configurable: true, value: true});
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("doctor", {
      mode: "json",
      color: true,
      sink,
    });

    logger.info("hidden human message");
    logger.line([{text: "hidden rich message", styles: ["red"]}]);
    logger.json({schemaVersion: 1, score: 100});
    logger.json({schemaVersion: 2});

    expect(sink.records).toEqual([
      {
        stream: "stdout",
        text: '{\n  "schemaVersion": 1,\n  "score": 100\n}',
        write: false,
      },
    ]);
  });

  it("redacts registered values from semantic and command output", () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("setup", {
      color: false,
      sink,
      redactions: ["secret", "secret-value", ""],
    });

    logger.error("Failed with secret-value");
    logger.command("tool --token secret-value");
    logger.redact("runtime-secret");
    logger.info("Received runtime-secret");

    expect(sink.records.map((record) => record.text)).toEqual([
      "[arolariu::setup] ⛔ Failed with [REDACTED]",
      "$ tool --token [REDACTED]",
      "[arolariu::setup] ℹ️ Received [REDACTED]",
    ]);
  });

  it("shares runtime redactions with child contexts", () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("setup", {
      color: false,
      sink,
    });
    const child = logger.child("dotnet");

    logger.redact("generated-password");
    child.error("generated-password");
    child.redact("child-secret");
    logger.info("child-secret");

    expect(sink.records.map((record) => record.text)).toEqual([
      "[arolariu::setup::dotnet] ⛔ [REDACTED]",
      "[arolariu::setup] ℹ️ [REDACTED]",
    ]);
  });

  it("redacts JSON-escaped secret values before production output", () => {
    const secret = 'quote"slash\\line\nend';
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("doctor", {
      mode: "json",
      color: false,
      sink,
      redactions: [secret],
    });

    logger.json({token: secret});

    expect(sink.records).toEqual([
      {
        stream: "stdout",
        text: '{\n  "token": "[REDACTED]"\n}',
        write: false,
      },
    ]);
  });

  it("cleans up TTY progress before terminal output and stops future frames", () => {
    vi.useFakeTimers();
    Object.defineProperty(process.stdout, "isTTY", {configurable: true, value: true});
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("setup", {
      color: false,
      sink,
    });

    const progress = logger.progress("Installing");
    vi.advanceTimersByTime(160);
    progress.update("Configuring");
    progress.succeed("Configured");
    const recordCountAfterSuccess = sink.records.length;
    vi.advanceTimersByTime(160);

    expect(sink.records.some((record) => record.write && record.text === "\r\u001B[K")).toBe(true);
    expect(sink.records.at(-1)).toEqual({
      stream: "stdout",
      text: "✔ Configured",
      write: false,
    });
    expect(sink.records).toHaveLength(recordCountAfterSuccess);
  });

  it.each([true, false])("keeps progress active after interleaved output when TTY is %s", (isTTY) => {
    vi.useFakeTimers();
    Object.defineProperty(process.stdout, "isTTY", {configurable: true, value: isTTY});
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("setup", {
      color: false,
      sink,
    });

    const progress = logger.progress("Installing");
    logger.warn("Using fallback");
    progress.update("Configuring");
    progress.succeed("Configured");
    progress.succeed("Duplicate success");
    progress.fail("Late failure");
    const recordCountAfterSuccess = sink.records.length;
    vi.advanceTimersByTime(160);

    expect(sink.records.filter((record) => record.text.includes("Using fallback"))).toEqual([
      {
        stream: "stderr",
        text: "[arolariu::setup] ⚠️ Using fallback",
        write: false,
      },
    ]);
    expect(sink.records.filter((record) => record.text === "✔ Configured")).toEqual([
      {
        stream: "stdout",
        text: "✔ Configured",
        write: false,
      },
    ]);
    expect(sink.records.every((record) => !record.text.includes("Duplicate success") && !record.text.includes("Late failure"))).toBe(true);
    expect(sink.records).toHaveLength(recordCountAfterSuccess);

    if (isTTY) {
      expect(sink.records.some((record) => record.write && record.text.includes("Configuring"))).toBe(true);
    } else {
      expect(sink.records.every((record) => !record.text.includes("\r"))).toBe(true);
    }
  });

  it.each([true, false])("emits one failure after interleaved progress output when TTY is %s", (isTTY) => {
    vi.useFakeTimers();
    Object.defineProperty(process.stdout, "isTTY", {configurable: true, value: isTTY});
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("setup", {
      color: false,
      sink,
    });

    const progress = logger.progress("Installing");
    logger.info("Downloaded package");
    progress.fail("Installation failed");
    progress.fail("Duplicate failure");
    progress.succeed("Late success");

    expect(sink.records.filter((record) => record.text === "✖ Installation failed")).toEqual([
      {
        stream: "stderr",
        text: "✖ Installation failed",
        write: false,
      },
    ]);
    expect(sink.records.every((record) => !record.text.includes("Duplicate failure") && !record.text.includes("Late success"))).toBe(true);
  });

  it.each([true, false])("stops progress without a final line after interleaved output when TTY is %s", (isTTY) => {
    vi.useFakeTimers();
    Object.defineProperty(process.stdout, "isTTY", {configurable: true, value: isTTY});
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("setup", {
      color: false,
      sink,
    });

    const progress = logger.progress("Installing");
    logger.info("Downloaded package");
    progress.stop();
    progress.update("Ignored update");
    progress.succeed("Late success");
    progress.fail("Late failure");
    const recordCountAfterStop = sink.records.length;
    vi.advanceTimersByTime(160);

    expect(sink.records.some((record) => record.text.includes("Ignored update"))).toBe(false);
    expect(sink.records.some((record) => record.text.includes("Late success"))).toBe(false);
    expect(sink.records.some((record) => record.text.includes("Late failure"))).toBe(false);
    expect(sink.records).toHaveLength(recordCountAfterStop);
  });

  it("keeps non-TTY progress line-oriented and free of carriage returns", () => {
    Object.defineProperty(process.stdout, "isTTY", {configurable: true, value: false});
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("setup", {
      color: false,
      sink,
    });

    const progress = logger.progress("Installing");
    progress.update("Configuring");
    progress.fail("Configuration failed");

    expect(sink.records).toEqual([
      {
        stream: "stderr",
        text: "✖ Configuration failed",
        write: false,
      },
    ]);
    expect(sink.records.every((record) => !record.text.includes("\r"))).toBe(true);
  });
});
