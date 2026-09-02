// @vitest-environment node
/**
 * @fileoverview Pure environment helper and prompt compatibility tests.
 * @module scripts.generate.env.test
 */

import {afterEach, describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {PromptProvider} from "./common/prompts.ts";
import {createMemoryFileSystem, createTestProcessHost, createTestRuntimeFactory} from "./common/runtime.testing.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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

  it("trims surrounding whitespace while preserving and quoting internal whitespace", async () => {
    const {appendMissingEnvironmentValues} = await import("./generate.env.ts");

    expect(appendMissingEnvironmentValues("", new Map([["DISPLAY_NAME", "  local development site  "]]))).toBe(
      ["# arolariu.ro setup-managed values", 'DISPLAY_NAME="local development site"', "# End arolariu.ro setup-managed values", ""].join(
        "\n",
      ),
    );
  });
});

describe("generateEnvironmentCommand", () => {
  it("preserves every supported Azure runtime identity value during local regeneration", async () => {
    const files = createMemoryFileSystem({
      ".env": [
        "SITE_ENV=DEVELOPMENT",
        "SITE_NAME=dev.arolariu.ro",
        "SITE_URL=https://localhost:3000",
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_existing",
        "CLERK_SECRET_KEY=sk_test_existing",
        "USE_CDN=false",
        "AZURE_CLIENT_ID=existing-client",
        "AZURE_TENANT_ID=existing-tenant",
        "AZURE_SUBSCRIPTION_ID=existing-subscription",
        "UNSUPPORTED_LOCAL_VALUE=must-not-be-reemitted",
      ].join("\n"),
    });
    const confirm = vi.fn<PromptProvider["confirm"]>().mockResolvedValue(false);
    const prompts: PromptProvider = {
      confirm,
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
      text: vi.fn<PromptProvider["text"]>().mockResolvedValue(""),
      secret: vi.fn<PromptProvider["secret"]>().mockResolvedValue(""),
    };

    const {createGenerateEnvironmentCommand} = await import("./generate.env.ts");
    const command = createGenerateEnvironmentCommand(createTestRuntimeFactory({files, prompts}));

    const execution = await command.invoke({verbose: false}, {presentation: "silent"});

    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    expect(confirm).not.toHaveBeenCalled();
    const generatedText = await files.readText(".env");
    expect(generatedText).toContain("AZURE_CLIENT_ID=existing-client");
    expect(generatedText).toContain("AZURE_TENANT_ID=existing-tenant");
    expect(generatedText).toContain("AZURE_SUBSCRIPTION_ID=existing-subscription");
    expect(generatedText).not.toContain("UNSUPPORTED_LOCAL_VALUE");
  });

  it("stops aggregate generation and propagates a real environment generator failure", async () => {
    vi.resetModules();
    vi.stubEnv("INFRA", "azure");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", {status: 503})),
    );
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("generate", {color: false, sink});
    const {main} = await import("./generate.ts");

    await expect(
      main(
        {
          verbose: false,
          generateEnv: true,
          generateGql: true,
          generateI18n: false,
          generateArtifacts: false,
        },
        logger,
      ),
    ).resolves.toBe(1);

    const retained = sink.records.map((record) => record.text).join("\n");
    expect(retained).not.toContain("Running GraphQL types generator");
    expect(retained).not.toContain("All requested generation tasks completed");
  });

  it("uses the injected prompt provider, redacts entered secrets, and never writes directly to console", async () => {
    const files = createMemoryFileSystem({".env": ""});
    const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
      vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
    );
    const publishable = "pk_test_generator-publishable";
    const secretValue = "sk_test_generator-secret";
    const text = vi.fn<PromptProvider["text"]>(async () => "local-value");
    const secretPrompt = vi.fn<PromptProvider["secret"]>(async (message) =>
      message.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") ? publishable : secretValue,
    );
    const confirm = vi.fn<PromptProvider["confirm"]>().mockResolvedValue(true);
    const prompts: PromptProvider = {
      confirm,
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

    const {createGenerateEnvironmentCommand} = await import("./generate.env.ts");
    const command = createGenerateEnvironmentCommand(createTestRuntimeFactory({files, prompts, logger}));

    const execution = await command.invoke({verbose: false}, {presentation: "silent"});

    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    expect(confirm).toHaveBeenCalledOnce();
    expect(text).toHaveBeenCalled();
    expect(secretPrompt.mock.calls.map(([message]) => message)).toEqual(["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]);
    expect(redactions).toContain(publishable);
    expect(redactions).toContain(secretValue);
    expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    const retained = JSON.stringify({records: sink.records});
    expect(retained).not.toContain(publishable);
    expect(retained).not.toContain(secretValue);
    const written = await files.readText(".env");
    expect(written).toContain(secretValue);
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
      createGenerateEnvironmentCommand: expect.any(Function),
    });
  });
});

describe("generateEnvironmentCommand parser lifecycle", () => {
  const completeEnvContent = [
    "SITE_ENV=DEVELOPMENT",
    "SITE_NAME=dev.arolariu.ro",
    "SITE_URL=https://localhost:3000",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_existing",
    "CLERK_SECRET_KEY=sk_test_existing",
    "USE_CDN=false",
  ].join("\n");

  it.each(["-v", "--verbose", "/v", "/verbose"])("decodes %s to a verbose invocation", async (flag) => {
    const files = createMemoryFileSystem({".env": completeEnvContent});
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("generate::env", {color: false, sink});
    const {createGenerateEnvironmentCommand} = await import("./generate.env.ts");
    const command = createGenerateEnvironmentCommand(createTestRuntimeFactory({files, logger}));

    const execution = await command.run([flag]);

    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    expect(sink.records.some((record) => record.text.includes("SITE_ENV was evaluated without logging its value."))).toBe(true);
  });

  it("parses a fresh Commander program on every repeated run() call instead of retaining prior decoded state", async () => {
    const files = createMemoryFileSystem({".env": completeEnvContent});
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("generate::env", {color: false, sink});
    const {createGenerateEnvironmentCommand} = await import("./generate.env.ts");
    const command = createGenerateEnvironmentCommand(createTestRuntimeFactory({files, logger}));

    const verboseExecution = await command.run(["--verbose"]);
    const quietExecution = await command.run([]);

    expect(verboseExecution).toMatchObject({status: "completed", exitCode: 0});
    expect(quietExecution).toMatchObject({status: "completed", exitCode: 0});

    const verboseOnlyDiagnostic = sink.records.filter((record) =>
      record.text.includes("SITE_ENV was evaluated without logging its value."),
    );
    // Exactly one occurrence proves the second, flag-less run() call did not inherit the first
    // call's decoded verbose flag: each run() rebuilds its own fresh Commander parser and input.
    expect(verboseOnlyDiagnostic).toHaveLength(1);
  });

  it("assigns an exit code through runIfMain() only when the module is the direct entrypoint", async () => {
    const files = createMemoryFileSystem({".env": completeEnvContent});
    const {createGenerateEnvironmentCommand} = await import("./generate.env.ts");

    const nonEntryProcessHost = createTestProcessHost([]);
    const nonEntryCommand = createGenerateEnvironmentCommand({
      ...createTestRuntimeFactory({files}),
      processHost: {...nonEntryProcessHost, isDirectEntry: (): boolean => false},
    });
    await nonEntryCommand.runIfMain("file:///repo/scripts/generate.env.ts");
    expect(nonEntryProcessHost.assignedExitCodes).toEqual([]);

    const entryProcessHost = createTestProcessHost([]);
    const entryCommand = createGenerateEnvironmentCommand({
      ...createTestRuntimeFactory({files}),
      processHost: entryProcessHost,
    });
    await entryCommand.runIfMain("file:///repo/scripts/generate.env.ts");
    expect(entryProcessHost.assignedExitCodes).toEqual([0]);
  });
});

describe("parseEnvironmentFile - semantic characterization", () => {
  it("preserves inline # as part of the value for unquoted assignments", async () => {
    const {parseEnvironmentFile} = await import("./generate.env.ts");
    const parsed = parseEnvironmentFile("KEY=value # inline comment\n");
    expect([...parsed]).toEqual([["KEY", "value # inline comment"]]);
  });

  it("treats export-prefixed lines as having a compound key, not as a bare variable name", async () => {
    const {parseEnvironmentFile} = await import("./generate.env.ts");
    const parsed = parseEnvironmentFile("export KEY=value\n");
    expect([...parsed]).toEqual([["export KEY", "value"]]);
  });
});

describe("azure mapping source-of-truth", () => {
  it("exports AZURE_RUNTIME_IDENTITY_KEYS with the three standard Azure identity keys", async () => {
    const azureModule = await import("./azure/index.ts");
    const runtimeKeys = (azureModule as Record<string, unknown>)["AZURE_RUNTIME_IDENTITY_KEYS"];
    expect(runtimeKeys).toEqual(["AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_SUBSCRIPTION_ID"]);
  });

  it("preserves APP_CONFIGURATION_MAPPING key/value pairs byte-for-byte", async () => {
    const {APP_CONFIGURATION_MAPPING} = await import("./azure/index.ts");
    expect(Object.entries(APP_CONFIGURATION_MAPPING)).toEqual([
      ["Site:Environment", "SITE_ENV"],
      ["Site:Name", "SITE_NAME"],
      ["Site:Url", "SITE_URL"],
      ["Auth:Clerk:PublishableKey", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
      ["Auth:Clerk:SecretKey", "CLERK_SECRET_KEY"],
      ["Site:UseCdn", "USE_CDN"],
    ]);
  });
});
