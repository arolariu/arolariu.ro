// @vitest-environment node
/**
 * @fileoverview Pure environment helper and prompt compatibility tests.
 * @module scripts.generate.env.test
 */

import fs from "node:fs";
import {afterEach, describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {PromptProvider} from "./common/prompts.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.doUnmock("@azure/identity");
});

describe("parseEnvironmentFile", () => {
  it("ignores non-assignments, splits on the first equals sign, unwraps matching quotes, and lets the last assignment win", async () => {
    const {parseEnvironmentFile} = await import("./generate.env.ts");

    const parsed = parseEnvironmentFile(
      [
        "",
        " # comment",
        "malformed",
        "=missing-key",
        " SITE_URL = https://example.test/path?a=b ",
        "QUOTED_SINGLE='single value'",
        'QUOTED_DOUBLE = "double value"',
        "MISMATCHED='value\"",
        "SITE_URL=https://last.example.test",
      ].join("\n"),
    );

    expect([...parsed]).toEqual([
      ["SITE_URL", "https://last.example.test"],
      ["QUOTED_SINGLE", "single value"],
      ["QUOTED_DOUBLE", "double value"],
      ["MISMATCHED", "'value\""],
    ]);
  });
});

describe("quoteIfNeeded", () => {
  it.each([
    ["plain", "plain"],
    ["", '""'],
    ["contains space", '"contains space"'],
    ["dollar$value", '"dollar$value"'],
    ['quote"value', '"quote\\"value"'],
    ["line\nvalue", '"line\\nvalue"'],
    ["tab\tvalue", '"tab\\tvalue"'],
    ["back\\slash", '"back\\\\slash"'],
  ])("quotes %j as %j", async (value, expected) => {
    const {quoteIfNeeded} = await import("./generate.env.ts");

    expect(quoteIfNeeded(value)).toBe(expected);
  });
});

describe("appendMissingEnvironmentValues", () => {
  it("preserves the original bytes as a prefix and appends only missing nonempty values in insertion order", async () => {
    const {appendMissingEnvironmentValues} = await import("./generate.env.ts");
    const original = "# user comment\nSITE_NAME=user-site\nEMPTY_EXISTING=\n";

    const appended = appendMissingEnvironmentValues(
      original,
      new Map([
        ["SITE_ENV", "DEVELOPMENT"],
        ["SITE_NAME", "must-not-overwrite"],
        ["SITE_URL", "https://localhost:3000"],
        ["EMPTY_EXISTING", "must-not-overwrite"],
        ["SKIPPED", "   "],
        ["NEEDS_QUOTING", "value with spaces"],
      ]),
    );

    expect(appended.startsWith(original)).toBe(true);
    expect(appended.slice(original.length)).toBe(
      [
        "# arolariu.ro setup-managed values",
        "SITE_ENV=DEVELOPMENT",
        "SITE_URL=https://localhost:3000",
        'NEEDS_QUOTING="value with spaces"',
        "# End arolariu.ro setup-managed values",
        "",
      ].join("\n"),
    );
  });

  it("reuses CRLF and adds exactly the separator needed after a non-newline-terminated prefix", async () => {
    const {appendMissingEnvironmentValues} = await import("./generate.env.ts");
    const original = "# comment\r\nSITE_ENV=DEVELOPMENT";

    expect(appendMissingEnvironmentValues(original, new Map([["USE_CDN", "false"]]))).toBe(
      [
        "# comment",
        "SITE_ENV=DEVELOPMENT",
        "# arolariu.ro setup-managed values",
        "USE_CDN=false",
        "# End arolariu.ro setup-managed values",
        "",
      ].join("\r\n"),
    );
  });

  it("returns the original string unchanged when every candidate is existing or empty", async () => {
    const {appendMissingEnvironmentValues} = await import("./generate.env.ts");
    const original = "SITE_ENV=DEVELOPMENT\n";

    expect(
      appendMissingEnvironmentValues(
        original,
        new Map([
          ["SITE_ENV", "PRODUCTION"],
          ["EMPTY", ""],
        ]),
      ),
    ).toBe(original);
  });
});

describe("generator PromptProvider compatibility", () => {
  it("uses the injected provider, redacts entered secrets, and never writes directly to console", async () => {
    vi.stubEnv("INFRA", "local");
    vi.stubEnv("VERBOSE", "false");
    vi.resetModules();
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue("");
    const writeFile = vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    vi.spyOn(fs, "copyFileSync").mockImplementation(() => undefined);
    const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
      vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
    );
    const publishable = "pk_test_generator-publishable";
    const secret = "sk_test_generator-secret";
    const text = vi.fn<PromptProvider["text"]>(async () => "local-value");
    const secretPrompt = vi.fn<PromptProvider["secret"]>(async (message) =>
      message.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") ? publishable : secret,
    );
    const prompts: PromptProvider = {
      confirm: vi.fn<PromptProvider["confirm"]>().mockResolvedValue(true),
      select: async <TValue extends string>(
        _message: string,
        choices: readonly Readonly<{value: TValue; label: string}>[],
      ): Promise<TValue> => {
        const selected = choices[0]?.value;
        if (selected === undefined) {
          throw new Error("A test choice is required.");
        }
        return selected;
      },
      text,
      secret: secretPrompt,
    };
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("generate::env", {color: false, sink});
    const redactions: string[] = [];
    const originalRedact = logger.redact.bind(logger);
    logger.redact = (value: string): void => {
      redactions.push(value);
      originalRedact(value);
    };

    const {main} = await import("./generate.env.ts");
    await expect(main(false, logger, prompts)).resolves.toBe(0);

    expect(prompts.confirm).toHaveBeenCalledOnce();
    expect(text).toHaveBeenCalled();
    expect(secretPrompt.mock.calls.map(([message]) => message)).toEqual(["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]);
    expect(redactions).toContain(publishable);
    expect(redactions).toContain(secret);
    expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    const retained = JSON.stringify({records: sink.records});
    expect(retained).not.toContain(publishable);
    expect(retained).not.toContain(secret);
    expect(JSON.stringify(writeFile.mock.calls)).toContain(secret);
  });

  it("does not load Azure identity merely by importing the module", async () => {
    vi.resetModules();
    vi.doMock("@azure/identity", () => {
      throw new Error("Azure identity loaded eagerly");
    });

    await expect(import("./generate.env.ts")).resolves.toMatchObject({
      appendMissingEnvironmentValues: expect.any(Function),
      parseEnvironmentFile: expect.any(Function),
      quoteIfNeeded: expect.any(Function),
    });
  });
});
