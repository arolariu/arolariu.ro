// @vitest-environment node
/**
 * @fileoverview Environment generator tests: pure helpers, prompts, exp fetch, and characterization.
 * @module scripts/commands/generate/env.test
 *
 * @remarks
 * The Effect generator runs against `makeTestLayer`: in-memory files, scripted exp HTTP responses,
 * scripted prompts, and the test clock. Only `@azure/identity` (the Azure SDK boundary) is mocked.
 */

import {join} from "node:path";

import {Effect, Fiber, FileSystem, type PlatformError} from "effect";
import {HttpClient, HttpClientResponse} from "effect/http";
import {TestClock} from "effect/testing";
import {afterEach, describe, expect, it, vi} from "vitest";

import {PromptUnavailable} from "../../platform/Prompts.ts";
import {effectTest, makeTestLayer, repositoryFixtureRoot, type TestHarness} from "../../platform/testing.ts";
import {generateEnvironment} from "./env.ts";
import {ExpConfigurationUnavailable, MissingEnvironmentValues} from "./errors.ts";
import {runGenerate} from "./index.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.doUnmock("@azure/identity");
});

/**
 * Reads a harness file as text.
 *
 * @param path - Absolute path, or a path relative to the harness working directory.
 * @returns The file text.
 */
function readText(path: string): Effect.Effect<string, PlatformError.PlatformError, FileSystem.FileSystem> {
  return Effect.flatMap(FileSystem.FileSystem, (fs) => fs.readFileString(path));
}

/**
 * Returns every semantic `[arolariu::…]` record without its trailing newline.
 *
 * @param harness - The harness that captured the run.
 * @returns The semantic records as stream/text pairs, in emission order.
 */
function semanticLines(harness: TestHarness): readonly Readonly<{stream: string; text: string}>[] {
  return harness
    .output()
    .filter((record) => record.text.startsWith("[arolariu::"))
    .map(({stream, text}) => ({stream, text: text.replace(/\n$/u, "")}));
}
describe("parseEnvironmentFile", () => {
  it("ignores non-assignments, splits on the first equals sign, unwraps matching quotes, and lets the last assignment win", async () => {
    const {parseEnvironmentFile} = await import("./env.ts");

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
    const {quoteIfNeeded} = await import("./env.ts");

    expect(quoteIfNeeded(value)).toBe(expected);
  });
});

describe("appendMissingEnvironmentValues", () => {
  it("preserves the original bytes as a prefix and appends only missing nonempty values in insertion order", async () => {
    const {appendMissingEnvironmentValues} = await import("./env.ts");
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
    const {appendMissingEnvironmentValues} = await import("./env.ts");
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
    const {appendMissingEnvironmentValues} = await import("./env.ts");
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
    const {appendMissingEnvironmentValues} = await import("./env.ts");

    expect(appendMissingEnvironmentValues("", new Map([["DISPLAY_NAME", "  local development site  "]]))).toBe(
      ["# arolariu.ro setup-managed values", 'DISPLAY_NAME="local development site"', "# End arolariu.ro setup-managed values", ""].join(
        "\n",
      ),
    );
  });
});

describe("generateEnvironment", () => {
  const completeEnvContent = [
    "SITE_ENV=DEVELOPMENT",
    "SITE_NAME=dev.arolariu.ro",
    "SITE_URL=https://localhost:3000",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_existing",
    "CLERK_SECRET_KEY=sk_test_existing",
    "USE_CDN=false",
  ].join("\n");

  {
    // An empty prompt queue in a TTY dies on any prompt, so completing proves no prompt ran.
    const harness = makeTestLayer({
      environment: {stdinIsTTY: true},
      files: {
        ".env": [
          completeEnvContent,
          "AZURE_CLIENT_ID=existing-client",
          "AZURE_TENANT_ID=existing-tenant",
          "AZURE_SUBSCRIPTION_ID=existing-subscription",
          "UNSUPPORTED_LOCAL_VALUE=must-not-be-reemitted",
        ].join("\n"),
      },
    });
    effectTest(
      "preserves every supported Azure runtime identity value during local regeneration without prompting",
      () =>
        Effect.gen(function* () {
          // Act
          yield* generateEnvironment;

          // Assert
          const generatedText = yield* readText(".env");
          expect(generatedText).toContain("AZURE_CLIENT_ID=existing-client");
          expect(generatedText).toContain("AZURE_TENANT_ID=existing-tenant");
          expect(generatedText).toContain("AZURE_SUBSCRIPTION_ID=existing-subscription");
          expect(generatedText).not.toContain("UNSUPPORTED_LOCAL_VALUE");
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({
      files: {".env": ""},
      environment: {variables: {INFRA: "azure"}, isCI: true},
      http: [{match: () => true, respond: {status: 503, body: "unavailable"}}],
    });
    effectTest(
      "stops aggregate generation and propagates a real environment generator failure",
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* runGenerate({verbose: false, env: true, i18n: false, gql: true, artifacts: false});

          // Assert
          expect(result).toEqual({selected: ["env", "gql"], completed: [], failed: "env"});
          const retained = harness
            .output()
            .map((record) => record.text)
            .join("");
          expect(retained).toContain("exp returned 503");
          expect(retained).not.toContain("Running GraphQL types generator");
          expect(
            harness
              .files()
              .has(join(repositoryFixtureRoot, "scripts", "__generated__", "gql", "README.placeholder.txt").replaceAll("\\", "/")),
          ).toBe(false);
        }),
      harness.layer,
    );
  }

  {
    const publishable = "pk_test_generator-publishable";
    const secretValue = "sk_test_generator-secret";
    const harness = makeTestLayer({
      environment: {stdinIsTTY: true},
      files: {".env": ""},
      // confirm, SITE_ENV, SITE_NAME, SITE_URL (text), the two Clerk keys (secret), USE_CDN (text).
      prompts: [true, "DEVELOPMENT", "local-value", "https://localhost:3000", publishable, secretValue, "false"],
      verbose: true,
    });
    effectTest(
      "uses the Prompts service, never writes to the console, and keeps prompted secrets out of the output",
      () =>
        Effect.gen(function* () {
          // Arrange
          const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
            vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
          );

          // Act
          const result = yield* generateEnvironment;

          // Assert
          expect(result.summary).toBe("Generated 6 environment variable(s).");
          expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
          const output = JSON.stringify(harness.output());
          expect(output).toContain("🔐 [4/6] Requesting NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (hidden).");
          expect(output).toContain("🔐 [5/6] Requesting CLERK_SECRET_KEY (hidden).");
          expect(output).not.toContain(publishable);
          expect(output).not.toContain(secretValue);
          const written = yield* readText(".env");
          expect(written).toContain(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${publishable}`);
          expect(written).toContain(`CLERK_SECRET_KEY=${secretValue}`);
        }),
      harness.layer,
    );
  }

  it("does not load Azure identity merely by importing the module", async () => {
    vi.resetModules();
    vi.doMock("@azure/identity", () => {
      throw new Error("Azure identity loaded eagerly");
    });

    await expect(import("./env.ts")).resolves.toMatchObject({
      appendMissingEnvironmentValues: expect.any(Function),
      parseEnvironmentFile: expect.any(Function),
      quoteIfNeeded: expect.any(Function),
      generateEnvironment: expect.any(Object),
    });
  });

  {
    const secretValue = "test-secret-value-that-must-not-be-logged";
    const harness = makeTestLayer({
      files: {".env": completeEnvContent.replace("sk_test_existing", secretValue)},
      environment: {variables: {INFRA: "local", VERBOSE: "true", SITE_ENV: "VALUE_THAT_MUST_NOT_BE_LOGGED"}},
    });
    effectTest(
      "loads Azure identity lazily and logs key names, never environment or secret values, under VERBOSE=true",
      () =>
        Effect.gen(function* () {
          // Arrange
          vi.doMock("@azure/identity", () => {
            throw new Error("Azure identity loaded eagerly");
          });

          // Act
          yield* generateEnvironment;

          // Assert
          const output = harness.output().map((record) => record.text);
          expect(output.some((text) => text.includes("File content generated successfully"))).toBe(true);
          expect(output.join("")).toContain("SITE_ENV");
          expect(output.join("")).not.toContain("VALUE_THAT_MUST_NOT_BE_LOGGED");
          expect(output.join("")).not.toContain(secretValue);
        }),
      harness.layer,
    );
  }

  describe("effective verbosity (VERBOSE environment override)", () => {
    const debugLine = "[arolariu::generate:env] 🐛 SITE_ENV was evaluated without logging its value.\n";

    {
      const harness = makeTestLayer({files: {".env": completeEnvContent}, environment: {variables: {VERBOSE: "true"}, isCI: true}});
      effectTest(
        "emits a real debug record from VERBOSE=true even without the --verbose flag",
        () =>
          Effect.gen(function* () {
            // Act
            yield* generateEnvironment;

            // Assert
            expect(harness.output()).toContainEqual({stream: "stdout", text: debugLine});
            expect(harness.output()).toContainEqual({stream: "stdout", text: "   Verbose: ✅ Enabled\n"});
          }),
        harness.layer,
      );
    }

    {
      const harness = makeTestLayer({files: {".env": completeEnvContent}, environment: {variables: {}, isCI: true}});
      effectTest(
        "suppresses debug diagnostics when both the flag and VERBOSE are false",
        () =>
          Effect.gen(function* () {
            // Act
            yield* generateEnvironment;

            // Assert
            expect(harness.output()).not.toContainEqual({stream: "stdout", text: debugLine});
            expect(harness.output()).toContainEqual({stream: "stdout", text: "   Verbose: ❌ Disabled\n"});
          }),
        harness.layer,
      );
    }

    {
      const harness = makeTestLayer({files: {".env": completeEnvContent}, verbose: true});
      effectTest(
        "emits verbose diagnostics for a verbose invocation",
        () =>
          Effect.gen(function* () {
            // Act
            yield* generateEnvironment;

            // Assert
            expect(harness.output()).toContainEqual({stream: "stdout", text: debugLine});
          }),
        harness.layer,
      );
    }
  });
});

describe("generateEnvironment characterization", () => {
  const EXP_URL = "http://exp/api/v1/build-time?for=website&label=DEVELOPMENT";
  const AZURE_EXP_URL = "https://exp.arolariu.ro/api/v1/build-time?for=website&label=DEVELOPMENT";
  const SUBREPO_ENV = join(repositoryFixtureRoot, "sites", "arolariu.ro", ".env");
  const FIXED_NOW = Date.parse("2025-01-01T00:00:00.000Z");
  const expConfig: Readonly<Record<string, string>> = {
    "Site:Environment": "DEVELOPMENT",
    "Site:Name": "dev.arolariu.ro",
    "Site:Url": "https://localhost:3000",
    "Auth:Clerk:PublishableKey": "pk_test_exp",
    "Auth:Clerk:SecretKey": "sk_test_exp",
    "Site:UseCdn": "true",
  };

  /**
   * Builds the expected generated `.env` payload for one exp-backed run.
   *
   * @param useCdn - Rendered `USE_CDN` value.
   * @returns The exact file text the generator writes.
   */
  function expectedExpEnvironmentFile(useCdn: string): string {
    return [
      "# Generated environment configuration file",
      "# Site Environment: development",
      "# CI/CD: true",
      "# Commit SHA: N/A",
      "# Generated at: 2025-01-01T00:00:00.000Z",
      "# !!!! DO NOT EDIT MANUALLY !!!",
      "",
      "",
      "# Site Configuration Start",
      "SITE_ENV=DEVELOPMENT",
      "SITE_NAME=dev.arolariu.ro",
      "SITE_URL=https://localhost:3000",
      "# Site Configuration End",
      "",
      "# Accepted Authentication Configuration Start",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_exp",
      "CLERK_SECRET_KEY=sk_test_exp",
      "# Accepted Authentication Configuration End",
      "",
      "# Accepted Azure Runtime Identity Configuration Start",
      "# Accepted Azure Runtime Identity Configuration End",
      "",
      "# Metadata Configuration Start",
      "TIMESTAMP=2025-01-01T00:00:00.000Z",
      "COMMIT_SHA=N/A",
      `USE_CDN=${useCdn}`,
      "# Metadata Configuration End",
    ].join("\n");
  }

  /**
   * Builds an exp-backed harness for the non-interactive CI environment.
   *
   * @param response - The scripted exp response.
   * @param options - Extra variables and the verbose setting.
   * @returns The harness.
   */
  function expHarness(
    response: {readonly status: number; readonly body: string},
    options: {readonly variables?: Readonly<Record<string, string>>; readonly verbose?: boolean} = {},
  ): TestHarness {
    return makeTestLayer({
      files: {".env": ""},
      environment: {variables: {INFRA: "azure", ...options.variables}, isCI: true},
      http: [{match: (request) => request.url.includes("/api/v1/build-time?for=website"), respond: response}],
      verbose: options.verbose ?? false,
    });
  }

  {
    const harness = expHarness({status: 200, body: JSON.stringify({config: expConfig})});
    effectTest(
      "writes the exact .env from a successful exp response and copies it to the website",
      () =>
        Effect.gen(function* () {
          // Arrange
          yield* TestClock.setTime(FIXED_NOW);

          // Act
          const result = yield* generateEnvironment;

          // Assert
          expect(result).toEqual({summary: "Generated 6 environment variable(s).", changedFiles: [".env", SUBREPO_ENV]});
          expect(harness.httpCalls().map((request) => ({method: request.method, url: request.url, headers: request.headers}))).toEqual([
            {method: "GET", url: EXP_URL, headers: {"x-exp-target": "website"}},
          ]);
          expect(yield* readText(".env")).toBe(expectedExpEnvironmentFile("true"));
          expect(yield* readText(SUBREPO_ENV)).toBe(expectedExpEnvironmentFile("true"));
          expect(semanticLines(harness)).toContainEqual({
            stream: "stdout",
            text: "[arolariu::generate:env] ✅ Generated 6 environment variables.",
          });
        }),
      harness.layer,
    );
  }

  {
    const {"Site:UseCdn": _omitted, ...partialConfig} = expConfig;
    const harness = expHarness({status: 200, body: JSON.stringify({config: partialConfig})});
    effectTest(
      "warns about a key missing from the exp response and falls back to USE_CDN=false",
      () =>
        Effect.gen(function* () {
          // Arrange
          yield* TestClock.setTime(FIXED_NOW);

          // Act
          const result = yield* generateEnvironment;

          // Assert
          expect(result.summary).toBe("Generated 5 environment variable(s).");
          expect(semanticLines(harness)).toContainEqual({
            stream: "stderr",
            text: "[arolariu::generate:env] ⚠️ Key Site:UseCdn was not found in the exp build-time response.",
          });
          expect(yield* readText(".env")).toBe(expectedExpEnvironmentFile("false"));
        }),
      harness.layer,
    );
  }

  {
    const harness = expHarness({status: 500, body: "boom"});
    effectTest(
      "fails when exp returns 500 and writes nothing",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(generateEnvironment);

          // Assert
          expect(error).toEqual(
            new ExpConfigurationUnavailable({message: "exp returned 500 for /api/v1/build-time?for=website", status: 500}),
          );
          expect(semanticLines(harness).at(-1)).toEqual({
            stream: "stderr",
            text: `[arolariu::generate:env] ⛔ exp returned 500 for ${EXP_URL}.`,
          });
          expect(yield* readText(".env")).toBe("");
          expect(harness.files().has(SUBREPO_ENV.replaceAll("\\", "/"))).toBe(false);
        }),
      harness.layer,
    );
  }

  {
    const harness = expHarness({status: 200, body: JSON.stringify({unrelated: true})});
    effectTest(
      "fails when the exp response has no config object",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(generateEnvironment);

          // Assert
          expect(error).toEqual(new ExpConfigurationUnavailable({message: "exp build-time response missing 'config' object", status: 200}));
          expect(yield* readText(".env")).toBe("");
        }),
      harness.layer,
    );
  }

  {
    const harness = expHarness({status: 200, body: "x".repeat(10 * 1024 * 1024 + 1)});
    effectTest(
      "fails when the exp response body exceeds the 10 MiB response limit",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(generateEnvironment);

          // Assert
          expect(error).toEqual(
            new ExpConfigurationUnavailable({message: `exp request to ${EXP_URL} failed: Response exceeded the 10485760 byte limit.`}),
          );
          expect(yield* readText(".env")).toBe("");
        }),
      harness.layer,
    );
  }

  {
    const harness = expHarness({status: 200, body: "unused"});
    effectTest(
      "times out when the exp response body stalls after the headers arrive",
      () =>
        Effect.gen(function* () {
          // Arrange: headers arrive at once, the body never completes.
          let bodyCancelled = false;
          const stalledBody = new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"config":'));
            },
            cancel() {
              bodyCancelled = true;
            },
          });
          const client = HttpClient.make((request) =>
            Effect.succeed(HttpClientResponse.fromWeb(request, new Response(stalledBody, {status: 200}))),
          );

          // Act
          const fiber = yield* Effect.forkChild(Effect.flip(Effect.provideService(generateEnvironment, HttpClient.HttpClient, client)));
          yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
          yield* TestClock.adjust("30 seconds");
          const error = yield* Fiber.join(fiber);

          // Assert
          expect(error).toBeInstanceOf(ExpConfigurationUnavailable);
          expect(error.message.startsWith(`exp request to ${EXP_URL} failed: `)).toBe(true);
          expect(bodyCancelled).toBe(true);
          expect(yield* readText(".env")).toBe("");
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({files: {".env": "SITE_ENV=DEVELOPMENT\n"}});
    effectTest(
      "fails fast without a TTY when keys are missing: confirm takes its default, then text input is refused",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(generateEnvironment);

          // Assert
          expect(error).toEqual(
            new PromptUnavailable({
              kind: "text",
              message: "Cannot request text input without an interactive terminal. Re-run setup in a TTY.",
            }),
          );
          expect(semanticLines(harness).slice(-2)).toEqual([
            {stream: "stderr", text: "[arolariu::generate:env] ⚠️ Found 5 missing key(s) that need to be provided."},
            {stream: "stdout", text: "[arolariu::generate:env] ℹ️ 🔑 [1/5] Requesting SITE_NAME."},
          ]);
          expect(yield* readText(".env")).toBe("SITE_ENV=DEVELOPMENT\n");
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({files: {".env": "SITE_ENV=DEVELOPMENT\n"}, environment: {stdinIsTTY: true}, prompts: [false]});
    effectTest(
      "fails with MissingEnvironmentValues when the missing-key confirmation is declined",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(generateEnvironment);

          // Assert
          expect(error).toEqual(
            new MissingEnvironmentValues({
              message: "Aborting: Missing environment variables were not provided.",
              keys: ["SITE_NAME", "SITE_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "USE_CDN"],
            }),
          );
          expect(semanticLines(harness).at(-1)).toEqual({
            stream: "stderr",
            text: "[arolariu::generate:env] ⚠️ Missing 5 required environment variable(s):",
          });
          expect(yield* readText(".env")).toBe("SITE_ENV=DEVELOPMENT\n");
        }),
      harness.layer,
    );
  }

  {
    const harness = expHarness(
      {status: 200, body: JSON.stringify({config: expConfig})},
      {variables: {AZURE_CLIENT_ID: "client"}, verbose: true},
    );
    effectTest(
      "never logs the exp token and sends it only as the bearer header",
      () =>
        Effect.gen(function* () {
          // Arrange
          const getToken = vi.fn(async () => ({token: "tok-123", expiresOnTimestamp: 0}));
          vi.doMock("@azure/identity", () => ({
            AzureCliCredential: class {
              public getToken = getToken;
            },
            DefaultAzureCredential: class {
              public getToken = getToken;
            },
          }));

          // Act
          yield* generateEnvironment;

          // Assert
          expect(getToken).toHaveBeenCalledWith("api://950ac239-5c2c-4759-bd83-911e68f6a8c9/.default");
          expect(harness.httpCalls().map((request) => [request.url, request.headers["authorization"]])).toEqual([
            [AZURE_EXP_URL, "Bearer tok-123"],
          ]);
          expect(semanticLines(harness)).toContainEqual({
            stream: "stdout",
            text: "[arolariu::generate:env] ✅ Bearer token acquired successfully.",
          });
          expect(harness.output().some((record) => record.text.includes("tok-123"))).toBe(false);
        }),
      harness.layer,
    );
  }

  {
    const harness = expHarness({status: 200, body: JSON.stringify({config: expConfig})}, {variables: {AZURE_CLIENT_ID: "client"}});
    effectTest(
      "warns and sends no bearer header when token acquisition fails",
      () =>
        Effect.gen(function* () {
          // Arrange
          vi.doMock("@azure/identity", () => ({
            AzureCliCredential: class {
              public getToken = async (): Promise<never> => {
                throw new Error("no az login");
              };
            },
            DefaultAzureCredential: class {},
          }));

          // Act
          yield* generateEnvironment;

          // Assert
          expect(semanticLines(harness)).toContainEqual({
            stream: "stderr",
            text: "[arolariu::generate:env] ⚠️ Failed to acquire bearer token: no az login",
          });
          expect(harness.httpCalls().map((request) => request.headers["authorization"])).toEqual([undefined]);
        }),
      harness.layer,
    );
  }
});

describe("parseEnvironmentFile - semantic characterization", () => {
  it("preserves inline # as part of the value for unquoted assignments", async () => {
    const {parseEnvironmentFile} = await import("./env.ts");
    const parsed = parseEnvironmentFile("KEY=value # inline comment\n");
    expect([...parsed]).toEqual([["KEY", "value # inline comment"]]);
  });

  it("treats export-prefixed lines as having a compound key, not as a bare variable name", async () => {
    const {parseEnvironmentFile} = await import("./env.ts");
    const parsed = parseEnvironmentFile("export KEY=value\n");
    expect([...parsed]).toEqual([["export KEY", "value"]]);
  });
});

describe("azure mapping source-of-truth", () => {
  it("exports AZURE_RUNTIME_IDENTITY_KEYS with the three standard Azure identity keys", async () => {
    const azureModule = await import("../../azure/index.ts");
    const runtimeKeys = (azureModule as Record<string, unknown>)["AZURE_RUNTIME_IDENTITY_KEYS"];
    expect(runtimeKeys).toEqual(["AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_SUBSCRIPTION_ID"]);
  });

  it("preserves APP_CONFIGURATION_MAPPING key/value pairs byte-for-byte", async () => {
    const {APP_CONFIGURATION_MAPPING} = await import("../../azure/index.ts");
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
