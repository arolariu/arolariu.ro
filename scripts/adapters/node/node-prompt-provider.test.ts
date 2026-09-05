// @vitest-environment node
/**
 * @fileoverview Tests for the Node terminal-backed prompt provider.
 * @module scripts/adapters/node/node-prompt-provider.test
 */

import {PassThrough} from "node:stream";
import {describe, expect, it} from "vitest";

import {createNodePromptProvider, type NodePromptTerminal} from "./node-prompt-provider.ts";

interface TestTerminal {
  readonly input: PassThrough;
  readonly output: PassThrough;
  readonly terminal: NodePromptTerminal;
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
    terminal: {input, output, isTTY, setRawMode: (mode) => rawModes.push(mode)},
    outputText: () => Buffer.concat(outputChunks).toString("utf8"),
    rawModes,
  };
}

/** Replaces `output.write` so the nth call throws, and reports how many writes were attempted. */
function failWriteAt(terminal: TestTerminal, failingWriteNumber: number, message: string): Readonly<{writes: () => number}> {
  const originalWrite = terminal.output.write.bind(terminal.output);
  let writeCount = 0;
  Object.defineProperty(terminal.output, "write", {
    value: (chunk: string | Uint8Array): boolean => {
      writeCount++;
      if (writeCount === failingWriteNumber) {
        throw new Error(message);
      }
      return originalWrite(chunk);
    },
  });
  return {writes: () => writeCount};
}

function expectNoResidualListeners(terminal: TestTerminal): void {
  for (const event of ["data", "end", "error", "close"]) {
    expect(terminal.input.listenerCount(event)).toBe(0);
  }
}

describe("createNodePromptProvider", () => {
  it.each([
    {input: "\n", defaultValue: true, expected: true},
    {input: "\n", defaultValue: false, expected: false},
    {input: "YES\n", defaultValue: false, expected: true},
    {input: "n\n", defaultValue: true, expected: false},
  ])("parses confirm input '$input' with default $defaultValue", async ({input, defaultValue, expected}) => {
    const testTerminal = createTestTerminal();
    const answer = createNodePromptProvider(testTerminal.terminal).confirm("Continue?", defaultValue);
    testTerminal.input.write(input);
    await expect(answer).resolves.toBe(expected);
    expect(testTerminal.outputText()).toContain("Continue?");
  });

  it("reprompts after an invalid selection and returns the selected value", async () => {
    const testTerminal = createTestTerminal();
    const answer = createNodePromptProvider(testTerminal.terminal).select(
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
    const answer = createNodePromptProvider(testTerminal.terminal).text("Display name");
    testTerminal.input.write("Alice Example\n");
    await expect(answer).resolves.toBe("Alice Example");
    expect(testTerminal.outputText()).toContain("Display name:");
  });

  it("reads secrets in raw mode without echoing typed characters", async () => {
    const testTerminal = createTestTerminal();
    const answer = createNodePromptProvider(testTerminal.terminal).secret("Token");
    testTerminal.input.write("secrex\u007ft\r");
    await expect(answer).resolves.toBe("secret");
    expect(testTerminal.rawModes).toEqual([true, false]);
    expect(testTerminal.outputText()).toContain("Token: ");
    expect(testTerminal.outputText()).not.toContain("secret");
  });

  it.each([
    ["Ctrl+C", (terminal: TestTerminal): void => void terminal.input.write("partial\u0003"), {name: "AbortError"}],
    ["end of stream", (terminal: TestTerminal): void => void terminal.input.end("partial"), {message: /ended before/iu}],
    ["a closed input stream", (terminal: TestTerminal): void => void terminal.input.emit("close"), {message: /closed before/iu}],
  ] as const)("rejects a secret prompt on %s and restores terminal mode", async (_label, drive, expectation) => {
    const testTerminal = createTestTerminal();
    const answer = createNodePromptProvider(testTerminal.terminal).secret("Token");
    drive(testTerminal);
    await expect(answer).rejects.toMatchObject(
      "name" in expectation ? {name: expectation.name} : {message: expect.stringMatching(expectation.message)},
    );
    expect(testTerminal.rawModes).toEqual([true, false]);
    expectNoResidualListeners(testTerminal);
  });

  it("rejects a closed secret-input stream before the next macrotask", async () => {
    const testTerminal = createTestTerminal();
    const answer = createNodePromptProvider(testTerminal.terminal).secret("Token");
    testTerminal.input.emit("close");
    const disposition = await Promise.race([
      answer.then(
        () => "resolved" as const,
        () => "rejected" as const,
      ),
      new Promise<"pending">((resolvePending) => setImmediate(() => resolvePending("pending"))),
    ]);
    expect(disposition).toBe("rejected");
    await expect(answer).rejects.toThrow(/closed before/iu);
  });

  it.each([
    ["a closed input stream", (terminal: TestTerminal): void => void terminal.input.emit("close"), "AggregateError", /closed before/iu],
    ["Ctrl+C", (terminal: TestTerminal): void => void terminal.input.write("partial\u0003"), "AbortError", /cancelled by user/iu],
  ] as const)("aggregates a terminal finalization failure after %s without losing its classification", async (_l, drive, name, first) => {
    const testTerminal = createTestTerminal();
    failWriteAt(testTerminal, 2, "Terminal output unavailable.");
    const answer = createNodePromptProvider(testTerminal.terminal).secret("Token");
    expect(() => drive(testTerminal)).not.toThrow();
    await expect(answer).rejects.toMatchObject({
      name,
      errors: [
        expect.objectContaining({message: expect.stringMatching(first)}),
        expect.objectContaining({message: "Terminal output unavailable."}),
      ],
    });
    expect(testTerminal.rawModes).toEqual([true, false]);
  });

  it("rejects an initial prompt-write failure after cleaning up terminal state", async () => {
    const testTerminal = createTestTerminal();
    const recorded = failWriteAt(testTerminal, 1, "Prompt output unavailable.");
    await expect(createNodePromptProvider(testTerminal.terminal).secret("Token")).rejects.toThrow("Prompt output unavailable.");
    expect(recorded.writes()).toBe(2);
    expect(testTerminal.rawModes).toEqual([true, false]);
    expectNoResidualListeners(testTerminal);
  });

  it("attempts every terminal cleanup operation when one removal fails", async () => {
    const testTerminal = createTestTerminal();
    const originalRemoveListener = testTerminal.input.removeListener.bind(testTerminal.input);
    const removedEvents: (string | symbol)[] = [];
    Object.defineProperty(testTerminal.input, "removeListener", {
      value: (event: string | symbol, listener: unknown): PassThrough => {
        removedEvents.push(event);
        Reflect.apply(originalRemoveListener, testTerminal.input, [event, listener]);
        if (event === "data") {
          throw new Error("Data listener cleanup failed.");
        }
        return testTerminal.input;
      },
    });
    const answer = createNodePromptProvider(testTerminal.terminal).secret("Token");
    expect(() => testTerminal.input.emit("close")).not.toThrow();
    await expect(answer).rejects.toMatchObject({
      name: "AggregateError",
      errors: [
        expect.objectContaining({message: expect.stringMatching(/closed before/iu)}),
        expect.objectContaining({message: "Data listener cleanup failed."}),
      ],
    });
    expect(removedEvents).toEqual(expect.arrayContaining(["data", "end", "error", "close"]));
    expect(testTerminal.rawModes).toEqual([true, false]);
    expectNoResidualListeners(testTerminal);
  });

  it("closes the readline interface after cancellation", async () => {
    const testTerminal = createTestTerminal();
    const answer = createNodePromptProvider(testTerminal.terminal).confirm("Continue?", false);
    testTerminal.input.write("\u0003");
    await expect(answer).rejects.toMatchObject({name: "AbortError"});
    expect(testTerminal.input.listenerCount("keypress")).toBe(0);
    expect(testTerminal.input.listenerCount("end")).toBe(0);
  });

  it("rejects non-interactive secret prompting with actionable guidance", async () => {
    const testTerminal = createTestTerminal(false);
    await expect(createNodePromptProvider(testTerminal.terminal).secret("Token")).rejects.toThrow(/interactive terminal/iu);
    expect(testTerminal.rawModes).toEqual([]);
    expect(testTerminal.outputText()).toBe("");
  });

  it("rejects secret prompting when the TTY cannot disable echo", async () => {
    const prompts = createNodePromptProvider({input: new PassThrough(), output: new PassThrough(), isTTY: true});
    await expect(prompts.secret("Token")).rejects.toThrow(/raw mode/iu);
  });
});
