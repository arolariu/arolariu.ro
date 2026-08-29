// @vitest-environment node
/**
 * @fileoverview Contract tests for terminal-backed setup prompts.
 * @module scripts.common.prompts.test
 */

import {PassThrough} from "node:stream";
import {describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./logger.ts";
import {createTerminalPromptProvider, type PromptTerminal} from "./prompts.ts";

interface TestTerminal {
  readonly input: PassThrough;
  readonly output: PassThrough;
  readonly terminal: PromptTerminal;
  readonly outputText: () => string;
  readonly rawModes: readonly boolean[];
}

function createTestTerminal(isTTY: boolean = true): TestTerminal {
  const input = new PassThrough();
  const output = new PassThrough();
  const outputChunks: Buffer[] = [];
  const rawModes: boolean[] = [];
  output.on("data", (chunk: Buffer) => outputChunks.push(Buffer.from(chunk)));

  return {
    input,
    output,
    terminal: {
      input,
      output,
      isTTY,
      setRawMode: (mode) => rawModes.push(mode),
    },
    outputText: () => Buffer.concat(outputChunks).toString("utf8"),
    rawModes,
  };
}

function createLogger(): Readonly<{
  logger: MonorepositoryConsoleLogger;
  sink: InMemoryLoggerSink;
}> {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("setup", {
    color: false,
    sink,
  });
  return {logger, sink};
}

describe("createTerminalPromptProvider", () => {
  it.each([
    {input: "\n", defaultValue: true, expected: true},
    {input: "\n", defaultValue: false, expected: false},
    {input: "YES\n", defaultValue: false, expected: true},
    {input: "n\n", defaultValue: true, expected: false},
  ])("parses confirm input '$input' with default $defaultValue", async ({input, defaultValue, expected}) => {
    const testTerminal = createTestTerminal();
    const {logger} = createLogger();
    const prompts = createTerminalPromptProvider(logger, testTerminal.terminal);

    const answer = prompts.confirm("Continue?", defaultValue);
    testTerminal.input.write(input);

    await expect(answer).resolves.toBe(expected);
  });

  it("reprompts after an invalid selection and returns the selected value", async () => {
    const testTerminal = createTestTerminal();
    const {logger} = createLogger();
    const prompts = createTerminalPromptProvider(logger, testTerminal.terminal);

    const answer = prompts.select(
      "Choose an engine",
      [
        {value: "rancher", label: "Rancher Desktop"},
        {value: "podman", label: "Podman Desktop"},
      ],
      "rancher",
    );
    testTerminal.input.write("docker\n2\n");

    await expect(answer).resolves.toBe("podman");
    expect(testTerminal.outputText()).toContain("Invalid selection");
  });

  it("returns text entered through the injected terminal", async () => {
    const testTerminal = createTestTerminal();
    const {logger} = createLogger();
    const prompts = createTerminalPromptProvider(logger, testTerminal.terminal);

    const answer = prompts.text("Display name");
    testTerminal.input.write("Alice Example\n");

    await expect(answer).resolves.toBe("Alice Example");
  });

  it("reads secrets in raw mode without echoing typed characters or passing them to the logger", async () => {
    const testTerminal = createTestTerminal();
    const {logger, sink} = createLogger();
    const redact = vi.spyOn(logger, "redact");
    const prompts = createTerminalPromptProvider(logger, testTerminal.terminal);

    const answer = prompts.secret("Token");
    testTerminal.input.write("secrex\u007ft\r");

    await expect(answer).resolves.toBe("secret");
    expect(testTerminal.rawModes).toEqual([true, false]);
    expect(testTerminal.outputText()).not.toContain("secret");
    expect(sink.records.every((record) => !record.text.includes("secret"))).toBe(true);
    expect(redact).not.toHaveBeenCalled();
  });

  it("handles Ctrl+C during a secret prompt and restores terminal mode", async () => {
    const testTerminal = createTestTerminal();
    const {logger} = createLogger();
    const prompts = createTerminalPromptProvider(logger, testTerminal.terminal);

    const answer = prompts.secret("Token");
    testTerminal.input.write("partial\u0003");

    await expect(answer).rejects.toMatchObject({name: "AbortError"});
    expect(testTerminal.rawModes).toEqual([true, false]);
    expect(testTerminal.input.listenerCount("data")).toBe(0);
    expect(testTerminal.input.listenerCount("end")).toBe(0);
  });

  it("rejects end-of-stream during a secret prompt and restores terminal mode", async () => {
    const testTerminal = createTestTerminal();
    const {logger} = createLogger();
    const prompts = createTerminalPromptProvider(logger, testTerminal.terminal);

    const answer = prompts.secret("Token");
    testTerminal.input.end("partial");

    await expect(answer).rejects.toThrow(/ended before/i);
    expect(testTerminal.rawModes).toEqual([true, false]);
  });

  it("rejects a closed secret-input stream and restores terminal mode", async () => {
    const testTerminal = createTestTerminal();
    const {logger} = createLogger();
    const prompts = createTerminalPromptProvider(logger, testTerminal.terminal);

    const answer = prompts.secret("Token");
    testTerminal.input.emit("close");
    const disposition = await Promise.race([
      answer.then(
        () => "resolved" as const,
        () => "rejected" as const,
      ),
      new Promise<"pending">((resolve) => setImmediate(() => resolve("pending"))),
    ]);

    expect(disposition).toBe("rejected");
    await expect(answer).rejects.toThrow(/closed before/i);
    expect(testTerminal.rawModes).toEqual([true, false]);
    expect(testTerminal.input.listenerCount("data")).toBe(0);
    expect(testTerminal.input.listenerCount("end")).toBe(0);
    expect(testTerminal.input.listenerCount("error")).toBe(0);
    expect(testTerminal.input.listenerCount("close")).toBe(0);
  });

  it("closes the readline interface after cancellation", async () => {
    const testTerminal = createTestTerminal();
    const {logger} = createLogger();
    const prompts = createTerminalPromptProvider(logger, testTerminal.terminal);

    const answer = prompts.confirm("Continue?", false);
    testTerminal.input.write("\u0003");

    await expect(answer).rejects.toMatchObject({name: "AbortError"});
    expect(testTerminal.input.listenerCount("keypress")).toBe(0);
    expect(testTerminal.input.listenerCount("end")).toBe(0);
  });

  it("rejects non-interactive secret prompting with actionable guidance", async () => {
    const testTerminal = createTestTerminal(false);
    const {logger} = createLogger();
    const prompts = createTerminalPromptProvider(logger, testTerminal.terminal);

    await expect(prompts.secret("Token")).rejects.toThrow(/interactive terminal/i);
    expect(testTerminal.rawModes).toEqual([]);
  });

  it("rejects secret prompting when the TTY cannot disable echo", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const {logger} = createLogger();
    const prompts = createTerminalPromptProvider(logger, {
      input,
      output,
      isTTY: true,
    });

    await expect(prompts.secret("Token")).rejects.toThrow(/raw mode/i);
  });
});
