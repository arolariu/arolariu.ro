// @vitest-environment node
/**
 * @fileoverview Tests for the Effect E2E runner and its report-cleanup helpers.
 * @module scripts/commands/e2e/index.test
 *
 * @remarks
 * Every scenario runs on the in-memory harness (`makeTestLayer`): Newman is a scripted `npx`
 * process that, like real Newman, writes its JSON and JUnit reporter output to the paths it was
 * given before it settles, and failure injection wraps the harness `FileSystem`. No test touches
 * real disk, spawns a real process, or mutates `process.env`/`process.argv`. The characterization
 * block runs the real `test e2e` command through `runCli`.
 */

import {dirname, join} from "node:path";

import {Effect, Exit, Fiber, FileSystem, Layer, Option, PlatformError} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import type {ProbeOutcome} from "../../inspection/probes.ts";
import {exitCodeFor} from "../../platform/exit.ts";
import type {SinkRecord} from "../../platform/Output.ts";
import {MAX_EVIDENCE_CHARACTERS, type ProcessRequest} from "../../platform/Process.ts";
import {normalizeFixturePath} from "../../platform/testing.fs.ts";
import {
  effectTest,
  makeTestLayer,
  processOutcomeEffect,
  repositoryFixtureRoot,
  runScoped,
  type ScriptedProcess,
  type TestHarness,
  type TestLayerOptions,
} from "../../platform/testing.ts";
import {makeE2eCommand} from "./cli.ts";
import {NewmanFailed, NewmanReportFailed} from "./errors.ts";
import {
  redactSensitiveString,
  runE2e,
  sanitizeJsonValue,
  sanitizeNewmanJsonReport,
  sanitizeNewmanTextReport,
  writeAssertionSummary,
  type E2ETarget,
} from "./index.ts";

/** Deliberately non-JWT-shaped fake secret used for exact-match and `--env-var` transport proofs. */
const FAKE_TOKEN = "e2e-test-secret-value";

/** Every runnable target's fixture directory, matching the production target configuration. */
const TARGET_DIRS = {backend: "sites/api.arolariu.ro", frontend: "sites/arolariu.ro", cv: "sites/cv.arolariu.ro"} as const;

/** The default report directory under the fixture root. */
const REPORT_DIR = join(repositoryFixtureRoot, "e2e-logs");

/** A scratch directory for the report helper tests. */
const REPORTS = join(repositoryFixtureRoot, "reports");

/**
 * Generates a synthetic JWT-shaped token at runtime (harmless header/payload, fake signature).
 *
 * @returns The synthetic token.
 */
function generateSyntheticJwt(): string {
  const header = Buffer.from(JSON.stringify({alg: "HS256", typ: "JWT"})).toString("base64url");
  const payload = Buffer.from(JSON.stringify({sub: "test-user", iat: 1234567890, exp: 9999999999})).toString("base64url");
  const signature = Buffer.from("test-signature-not-a-real-secret").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

/**
 * Builds the fixture files: every target's collection and production environment file.
 *
 * @param overrides - Extra or replacement files.
 * @returns The seeded files.
 */
function fixtureFiles(overrides: Readonly<Record<string, string>> = {}): Record<string, string> {
  const seeded: Record<string, string> = {};
  for (const directory of Object.values(TARGET_DIRS)) {
    seeded[join(repositoryFixtureRoot, directory, "postman-collection.json")] = JSON.stringify({info: {name: "test"}, item: []});
    seeded[join(repositoryFixtureRoot, directory, "postman-environment.production.json")] = JSON.stringify({name: "env", values: []});
  }
  return {...seeded, ...overrides};
}

type StreamPatch = Readonly<{stdout?: string; stderr?: string}>;

function succeeded(patch: StreamPatch = {}): ProbeOutcome {
  return {kind: "succeeded", exitCode: 0, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function exited(exitCode: number, patch: StreamPatch = {}): ProbeOutcome {
  return {kind: "exited", exitCode, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function spawnFailed(message: string, patch: StreamPatch = {}): ProbeOutcome {
  return {kind: "spawn-failed", message, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

/** The reporter output a scripted Newman run writes. */
interface NewmanReports {
  readonly json: string;
  readonly junit: string;
}

/** One scripted Newman behavior. */
interface NewmanScript {
  /** The outcome Newman settles with (default: success); `"never"` keeps it running. */
  readonly outcome?: ProbeOutcome | "never";
  /** Builds the reports Newman writes before settling from the token it received; omitted writes none. */
  readonly reports?: (token: string) => NewmanReports;
  /** Called once the reports are written, just before Newman settles. */
  readonly onStarted?: () => void;
}

/**
 * Builds the JSON and JUnit reports of the legacy fake runner: the token appears in a failure, a
 * bearer header, a response body, and the `authToken` environment value.
 *
 * @param token - The token Newman received.
 * @returns The reports.
 */
function tokenReports(token: string): NewmanReports {
  const json = {
    run: {
      failures: [
        {
          assertion: `Token ${token} must be accepted`,
          error: `Request rejected token ${token}`,
          source: {name: `Authenticated request ${token}`},
        },
      ],
      executions: [
        {
          request: {headers: [{key: "Authorization", value: `Bearer ${token}`}]},
          response: {body: `{"authToken":"${token}"}`},
        },
      ],
    },
    environment: {values: [{key: "authToken", value: token, type: "text"}]},
  };
  const junit = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<testsuites name="newman" tests="2" failures="0">',
    '  <testsuite name="Test Suite" tests="2">',
    '    <testcase name="Auth test" classname="AuthTest">',
    `      <system-out>Authorization: Bearer ${token}</system-out>`,
    "    </testcase>",
    '    <testcase name="Token check" classname="TokenTest">',
    `      <system-out>authToken=${token}</system-out>`,
    "    </testcase>",
    "  </testsuite>",
    "</testsuites>",
  ].join("\n");
  return {json: JSON.stringify(json, null, 2), junit};
}

/**
 * Reads the value that follows a flag in a Newman argument vector.
 *
 * @param request - The Newman request.
 * @param flag - The flag.
 * @returns The value.
 */
function argumentAfter(request: ProcessRequest, flag: string): string {
  const value = request.args[request.args.indexOf(flag) + 1];
  if (value === undefined) {
    throw new Error(`missing ${flag}`);
  }
  return value;
}

/**
 * Builds the scripted Newman (`npx`) process.
 *
 * @remarks
 * The reports are written through the `FileSystem` of the calling fiber, so a test's wrapping
 * filesystem also sees them.
 *
 * @param script - The behavior, or a function choosing it per request.
 * @returns The scripted process.
 */
function newmanProcess(script: NewmanScript | ((request: ProcessRequest) => NewmanScript)): ScriptedProcess {
  return {
    match: (request) => request.command === "npx",
    respond: (request) =>
      Effect.gen(function* () {
        const behavior = typeof script === "function" ? script(request) : script;
        const token = request.args.find((arg) => arg.startsWith("authToken="))?.slice("authToken=".length) ?? "no-token-received";
        const reports = behavior.reports?.(token);
        if (reports !== undefined) {
          const fs = yield* Effect.serviceOption(FileSystem.FileSystem);
          if (Option.isNone(fs)) {
            return yield* Effect.die(new Error("scripted Newman has no filesystem"));
          }
          const jsonPath = argumentAfter(request, "--reporter-json-export");
          const junitPath = argumentAfter(request, "--reporter-junit-export");
          yield* Effect.orDie(fs.value.makeDirectory(dirname(jsonPath), {recursive: true}));
          yield* Effect.orDie(fs.value.writeFileString(jsonPath, reports.json));
          yield* Effect.orDie(fs.value.writeFileString(junitPath, reports.junit));
        }
        behavior.onStarted?.();
        const outcome = behavior.outcome ?? succeeded();
        return outcome === "never" ? yield* Effect.never : yield* processOutcomeEffect(request, outcome);
      }),
  };
}

/** Options of {@link e2eHarness}. */
interface E2eHarnessOptions {
  readonly variables?: Readonly<Record<string, string>>;
  readonly files?: Readonly<Record<string, string>>;
  readonly newman?: NewmanScript | ((request: ProcessRequest) => NewmanScript);
  readonly verbose?: boolean;
  readonly mode?: TestLayerOptions["mode"];
}

/**
 * Builds a harness with the fixture files, an auth token (by default), and a scripted Newman.
 *
 * @param options - Overrides.
 * @returns The harness.
 */
function e2eHarness(options: E2eHarnessOptions = {}): TestHarness {
  return makeTestLayer({
    context: "test:e2e",
    environment: {variables: options.variables ?? {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN}},
    files: options.files ?? fixtureFiles(),
    processes: [newmanProcess(options.newman ?? {})],
    ...(options.verbose === undefined ? {} : {verbose: options.verbose}),
    ...(options.mode === undefined ? {} : {mode: options.mode}),
  });
}

/**
 * Reads one file of the harness filesystem.
 *
 * @param harness - The harness.
 * @param path - The absolute path.
 * @returns The text, or `null` when the file does not exist.
 */
function fileText(harness: TestHarness, path: string): string | null {
  const value = harness.files().get(normalizeFixturePath(path));
  if (value === undefined) {
    return null;
  }
  return typeof value === "string" ? value : new TextDecoder().decode(value);
}

/**
 * Reads one report of the default report directory.
 *
 * @param harness - The harness.
 * @param name - The report file name.
 * @returns The text, or `null` when the report does not exist.
 */
function reportText(harness: TestHarness, name: string): string | null {
  return fileText(harness, join(REPORT_DIR, name));
}

/**
 * Joins every output record of the harness.
 *
 * @param harness - The harness.
 * @returns The rendered output.
 */
function outputText(harness: TestHarness): string {
  return harness
    .output()
    .map((record) => record.text)
    .join("");
}

/**
 * Every Newman argument vector the harness saw.
 *
 * @param harness - The harness.
 * @returns The argument vectors, in call order.
 */
function newmanArgs(harness: TestHarness): readonly (readonly string[])[] {
  return harness.processCalls().map((call) => call.request.args);
}

/** A filesystem failure injected by {@link failingFileSystem}. */
interface InjectedFailure {
  readonly method: "rename" | "readFileString" | "makeDirectory";
  readonly when: (path: string) => boolean;
}

/**
 * Wraps the harness filesystem: injects failures and records every rename and atomic write.
 *
 * @param failures - The failures to inject.
 * @param recorded - Receives `rename:<basename of the destination>` and `write:<basename>:<contents>` entries.
 * @returns A layer over the harness `FileSystem`.
 */
function failingFileSystem(
  failures: readonly InjectedFailure[],
  recorded: string[] = [],
): Layer.Layer<FileSystem.FileSystem, never, FileSystem.FileSystem> {
  const injected = (method: InjectedFailure["method"], path: string): PlatformError.PlatformError | undefined =>
    failures.some((failure) => failure.method === method && failure.when(path))
      ? PlatformError.systemError({_tag: "Unknown", module: "FileSystem", method, pathOrDescriptor: path, description: "disk full"})
      : undefined;
  const basename = (path: string): string => path.split(/[/\\]/u).pop() ?? path;
  return Layer.effect(
    FileSystem.FileSystem,
    Effect.map(Effect.service(FileSystem.FileSystem), (inner) =>
      FileSystem.FileSystem.of({
        ...inner,
        rename: (from, to) => {
          recorded.push(`rename:${basename(to)}`);
          const error = injected("rename", to);
          return error === undefined ? inner.rename(from, to) : Effect.fail(error);
        },
        writeFileString: (path, data, options) => {
          recorded.push(`write:${basename(path)}:${data}`);
          return inner.writeFileString(path, data, options);
        },
        readFileString: (path, encoding) => {
          const error = injected("readFileString", path);
          return error === undefined ? inner.readFileString(path, encoding) : Effect.fail(error);
        },
        makeDirectory: (path, options) => {
          const error = injected("makeDirectory", path);
          return error === undefined ? inner.makeDirectory(path, options) : Effect.fail(error);
        },
      }),
    ),
  );
}

/** Whether a path is the given report of the default report directory. */
function isReport(name: string): (path: string) => boolean {
  return (path) => normalizeFixturePath(path) === normalizeFixturePath(join(REPORT_DIR, name));
}

// ============================================================================
// runE2e — collection immutability and token transport
// ============================================================================

describe("runE2e: collection immutability and token transport", () => {
  {
    const harness = e2eHarness();
    const collectionPath = join(repositoryFixtureRoot, TARGET_DIRS.backend, "postman-collection.json");
    effectTest(
      "backend success does not modify the collection file and carries the token only inside --env-var",
      () =>
        Effect.gen(function* () {
          const original = fileText(harness, collectionPath);

          const result = yield* runE2e({target: "backend"});

          expect(result).toEqual({targets: ["backend"], completed: ["backend"]});
          expect(fileText(harness, collectionPath)).toBe(original);
          expect(newmanArgs(harness)).toHaveLength(1);
          const args = newmanArgs(harness)[0] ?? [];
          expect(args.filter((arg) => arg === "--env-var")).toHaveLength(1);
          expect(args[args.indexOf("--env-var") + 1]).toBe(`authToken=${FAKE_TOKEN}`);
          expect(args.filter((arg) => arg.includes(FAKE_TOKEN))).toEqual([`authToken=${FAKE_TOKEN}`]);
        }),
      harness.layer,
    );
  }

  {
    const harness = e2eHarness();
    effectTest(
      "frontend optional token run transports the token via --env-var",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "frontend"});

          expect(newmanArgs(harness)[0]).toContain("--env-var");
        }),
      harness.layer,
    );
  }

  {
    const harness = e2eHarness({variables: {E2E_TEST_AUTH_TOKEN: "  "}});
    effectTest(
      "frontend without a token omits --env-var, warns, and still succeeds",
      () =>
        Effect.gen(function* () {
          const result = yield* runE2e({target: "frontend"});

          expect(result.completed).toEqual(["frontend"]);
          expect(newmanArgs(harness)[0]).not.toContain("--env-var");
          expect(outputText(harness)).toContain(
            "[arolariu::test:e2e::frontend] ⚠️ E2E_TEST_AUTH_TOKEN is not set. Continuing frontend run without auth token injection.",
          );
        }),
      harness.layer,
    );
  }

  {
    const harness = e2eHarness();
    effectTest(
      "cv ignores a present token and never includes --env-var",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "cv"});

          expect(newmanArgs(harness)[0]).not.toContain("--env-var");
          expect(newmanArgs(harness)[0]?.some((arg) => arg.includes(FAKE_TOKEN))).toBe(false);
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// runE2e — required token and missing fixture validation
// ============================================================================

describe("runE2e: required token and missing fixture validation", () => {
  {
    const harness = e2eHarness({variables: {}});
    effectTest(
      "fails backend before invoking Newman when the required auth token is absent",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(runE2e({target: "backend"}));

          expect(error).toEqual(
            new NewmanFailed({
              message: "E2E_TEST_AUTH_TOKEN environment variable is required for backend.",
              target: "backend",
              evidence: [],
            }),
          );
          expect(harness.processCalls()).toHaveLength(0);
        }),
      harness.layer,
    );
  }

  {
    const environmentPath = join(repositoryFixtureRoot, TARGET_DIRS.backend, "postman-environment.production.json");
    const harness = e2eHarness({files: {[environmentPath]: "{}"}});
    effectTest(
      "fails before invoking Newman when the collection file is missing",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(runE2e({target: "backend"}));

          expect(error).toBeInstanceOf(NewmanFailed);
          expect(error.message).toBe(
            `Collection file not found: ${join(repositoryFixtureRoot, TARGET_DIRS.backend, "postman-collection.json")}`,
          );
          expect(harness.processCalls()).toHaveLength(0);
        }),
      harness.layer,
    );
  }

  {
    const collectionPath = join(repositoryFixtureRoot, TARGET_DIRS.backend, "postman-collection.json");
    const harness = e2eHarness({files: {[collectionPath]: "{}"}});
    effectTest(
      "fails before invoking Newman when the environment file is missing",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(runE2e({target: "backend"}));

          expect(error.message).toBe(
            `Environment file not found: ${join(repositoryFixtureRoot, TARGET_DIRS.backend, "postman-environment.production.json")}`,
          );
          expect(harness.processCalls()).toHaveLength(0);
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// runE2e — target expansion and sequential execution
// ============================================================================

describe("runE2e: target expansion and sequential execution", () => {
  {
    const harness = e2eHarness();
    effectTest(
      "expands 'all' into frontend, backend, cv and completes them in that order",
      () =>
        Effect.gen(function* () {
          const first = yield* runE2e({target: "all"});
          const second = yield* runE2e({target: "all"});

          expect(first).toEqual({targets: ["frontend", "backend", "cv"], completed: ["frontend", "backend", "cv"]});
          const order = [TARGET_DIRS.frontend, TARGET_DIRS.backend, TARGET_DIRS.cv];
          expect(newmanArgs(harness).map((args) => args[2])).toEqual(
            [...order, ...order].map((directory) => join(repositoryFixtureRoot, directory, "postman-collection.json")),
          );
          expect(second.targets).toEqual(first.targets);
          expect(second.targets).not.toBe(first.targets);
        }),
      harness.layer,
    );
  }

  {
    const backendCollection = join(repositoryFixtureRoot, TARGET_DIRS.backend, "postman-collection.json");
    const harness = e2eHarness({newman: (request) => ({outcome: request.args.includes(backendCollection) ? exited(1) : succeeded()})});
    effectTest(
      "stops at the first failing target and never starts an unreached one",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(runE2e({target: "all"}));

          expect(error).toMatchObject({_tag: "NewmanFailed", target: "backend", exitCode: 1});
          // Only frontend and backend were attempted; cv was never reached.
          expect(harness.processCalls()).toHaveLength(2);
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// runE2e — report directory resolution
// ============================================================================

describe("runE2e: report directory resolution", () => {
  {
    const harness = e2eHarness();
    effectTest(
      "resolves the default e2e-logs directory under the environment cwd",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "backend"});

          const args = newmanArgs(harness)[0] ?? [];
          expect(args[args.indexOf("--reporter-json-export") + 1]).toBe(join(REPORT_DIR, "newman-backend.json"));
        }),
      harness.layer,
    );
  }

  {
    const reportDir = join(repositoryFixtureRoot, "custom-e2e-logs");
    const harness = e2eHarness({variables: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_REPORT_DIR: reportDir}});
    effectTest(
      "uses an explicit NEWMAN_REPORT_DIR instead of the default",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "backend"});

          const args = newmanArgs(harness)[0] ?? [];
          expect(args[args.indexOf("--reporter-json-export") + 1]).toBe(join(reportDir, "newman-backend.json"));
        }),
      harness.layer,
    );
  }

  {
    const harness = e2eHarness();
    effectTest(
      "warns and still runs Newman when the report directory cannot be created",
      () =>
        Effect.gen(function* () {
          const result = yield* runE2e({target: "backend"}).pipe(
            Effect.provide(
              failingFileSystem([
                {method: "makeDirectory", when: (path) => normalizeFixturePath(path) === normalizeFixturePath(REPORT_DIR)},
              ]),
            ),
          );

          expect(result.completed).toEqual(["backend"]);
          expect(outputText(harness)).toContain(
            `[arolariu::test:e2e::backend] ⚠️ Failed to create report directory: ${REPORT_DIR} (Unknown: FileSystem.makeDirectory (${REPORT_DIR}): disk full)`,
          );
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// runE2e — env-derived Newman arguments
// ============================================================================

describe("runE2e: env-derived Newman arguments", () => {
  {
    const harness = e2eHarness({
      variables: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_TIMEOUT: "42000", NEWMAN_TIMEOUT_REQUEST: "5000", NEWMAN_STRICT_MODE: "true"},
    });
    effectTest(
      "reflects NEWMAN_TIMEOUT, NEWMAN_TIMEOUT_REQUEST, and NEWMAN_STRICT_MODE from the environment",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "backend"});

          const args = newmanArgs(harness)[0] ?? [];
          expect(args[args.indexOf("--timeout") + 1]).toBe("42000");
          expect(args[args.indexOf("--timeout-request") + 1]).toBe("5000");
          expect(args.at(-1)).toBe("--bail");
        }),
      harness.layer,
    );
  }

  {
    const harness = e2eHarness({
      variables: {
        E2E_TEST_AUTH_TOKEN: FAKE_TOKEN,
        NEWMAN_TIMEOUT: "not-a-number",
        NEWMAN_STRICT_MODE: "maybe",
        NEWMAN_TIMEOUT_SCRIPT: "-5",
      },
    });
    effectTest(
      "falls back to defaults and warns on invalid values, before the report lines",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "backend"});

          const args = newmanArgs(harness)[0] ?? [];
          expect(args[args.indexOf("--timeout") + 1]).toBe("600000");
          expect(args[args.indexOf("--timeout-script") + 1]).toBe("10000");
          expect(args).not.toContain("--bail");
          const lines = harness.output().map((record) => record.text);
          const warnings = [
            '[arolariu::test:e2e::backend] ⚠️ Invalid NEWMAN_TIMEOUT="not-a-number", using default 600000.\n',
            '[arolariu::test:e2e::backend] ⚠️ Invalid NEWMAN_TIMEOUT_SCRIPT="-5", using default 10000.\n',
            '[arolariu::test:e2e::backend] ⚠️ Invalid NEWMAN_STRICT_MODE="maybe", using default false.\n',
          ];
          const firstWarning = lines.indexOf(warnings[0] ?? "");
          expect(lines.slice(firstWarning, firstWarning + 3)).toEqual(warnings);
          expect(lines.findIndex((line) => line.startsWith("JSON report:"))).toBeGreaterThan(firstWarning);
        }),
      harness.layer,
    );
  }

  {
    const harness = e2eHarness({variables: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_STRICT_MODE: "off"}});
    effectTest(
      "accepts an explicit false NEWMAN_STRICT_MODE",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "backend"});

          expect(newmanArgs(harness)[0]).not.toContain("--bail");
          expect(outputText(harness)).toContain("Strict mode (--bail): false\n");
        }),
      harness.layer,
    );
  }

  {
    const localEnvironment = join(repositoryFixtureRoot, TARGET_DIRS.backend, "postman-environment.local.json");
    const harness = e2eHarness({
      variables: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, E2E_TEST_ENVIRONMENT: "LOCAL"},
      files: fixtureFiles({[localEnvironment]: "{}"}),
    });
    effectTest(
      "selects the local environment file from E2E_TEST_ENVIRONMENT",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "backend"});

          expect(newmanArgs(harness)[0]?.[4]).toBe(localEnvironment);
          expect(outputText(harness)).toContain(`Environment: ${localEnvironment} (local)\n`);
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// runE2e — process invocation shape and output
// ============================================================================

describe("runE2e: process invocation shape and output", () => {
  {
    const harness = e2eHarness();
    effectTest(
      "runs Newman through npx from the environment cwd with captured output and no command echo",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "backend"});

          const [call] = harness.processCalls();
          expect(call?.request.command).toBe("npx");
          expect(call?.options).toEqual({cwd: repositoryFixtureRoot, output: "capture", echo: false, failureOutput: "full"});
        }),
      harness.layer,
    );
  }

  {
    const jwt = generateSyntheticJwt();
    const harness = e2eHarness({
      newman: {outcome: succeeded({stdout: `GET /invoices with ${FAKE_TOKEN}\n`, stderr: `warn Bearer ${jwt}\n`})},
    });
    effectTest(
      "writes the captured Newman output after redacting the token and JWTs",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "backend"});

          const records = harness.output();
          const strict = records.findIndex((record) => record.text === "Strict mode (--bail): false\n");
          expect(records.slice(strict + 1, strict + 4)).toEqual([
            {stream: "stdout", text: "GET /invoices with [REDACTED]\n"},
            {stream: "stderr", text: "warn ******\n"},
            {stream: "stdout", text: "[arolariu::test:e2e::backend] ✅ Completed Newman tests for: backend\n"},
          ]);
        }),
      harness.layer,
    );
  }

  {
    const harness = e2eHarness({mode: "json", newman: {outcome: succeeded({stdout: "newman output\n"})}});
    effectTest(
      "writes nothing in JSON mode",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "backend"});

          expect(harness.output()).toEqual([]);
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// runE2e — Newman failures never carry the token
// ============================================================================

describe("runE2e: Newman failures", () => {
  {
    const harness = e2eHarness({
      verbose: true,
      variables: {E2E_TEST_AUTH_TOKEN: "tok-xyz"},
      newman: {reports: tokenReports, outcome: succeeded({stdout: "auth tok-xyz\n"})},
    });
    effectTest(
      "never echoes the auth token",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "backend"});

          expect(newmanArgs(harness)[0]).toContain("authToken=tok-xyz");
          expect(harness.output().filter((record) => record.text.includes("tok-xyz"))).toEqual([]);
          expect(outputText(harness)).toContain("auth [REDACTED]\n");
          for (const name of ["newman-backend.json", "newman-backend.xml", "newman-backend-summary.md"]) {
            expect(reportText(harness, name)).not.toBeNull();
            expect(reportText(harness, name)).not.toContain("tok-xyz");
          }
        }),
      harness.layer,
    );
  }

  it.each([
    ["exited", exited(3), {message: "Newman exited with code 3 for backend.", exitCode: 3}],
    [
      "signalled",
      {kind: "signalled", signal: "SIGKILL", stdout: "", stderr: "", durationMs: 1} as ProbeOutcome,
      {message: "Newman was terminated by SIGKILL for backend."},
    ],
    ["spawn failure", spawnFailed("ENOENT"), {message: "Newman failed to start for backend: ENOENT"}],
    [
      "timeout",
      {kind: "timed-out", stdout: "", stderr: "", durationMs: 1} as ProbeOutcome,
      {message: "Newman timed out after 0 ms for backend."},
    ],
  ] as const)("rebuilds a Newman %s without its command line and keeps the collection unchanged", async (_label, outcome, expected) => {
    const harness = e2eHarness({newman: {outcome}});
    const collectionPath = join(repositoryFixtureRoot, TARGET_DIRS.backend, "postman-collection.json");
    const original = fileText(harness, collectionPath);

    const error = await runScoped(Effect.flip(runE2e({target: "backend"})), harness.layer);

    expect(error).toEqual(new NewmanFailed({...expected, target: "backend", evidence: []}));
    expect(fileText(harness, collectionPath)).toBe(original);
  });

  {
    const harness = e2eHarness({
      newman: {outcome: spawnFailed(`spawn failed for ${FAKE_TOKEN}`, {stdout: `stdout ${FAKE_TOKEN}`, stderr: `stderr ${FAKE_TOKEN}`})},
    });
    effectTest(
      "redacts the token from the failure message and the captured-output evidence",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(runE2e({target: "backend"}));

          expect(error).toEqual(
            new NewmanFailed({
              message: "Newman failed to start for backend: spawn failed for [REDACTED]",
              target: "backend",
              evidence: ["stdout: stdout [REDACTED]", "stderr: stderr [REDACTED]"],
            }),
          );
          expect(outputText(harness)).not.toContain(FAKE_TOKEN);
          expect(outputText(harness)).toContain("stdout [REDACTED]");
        }),
      harness.layer,
    );
  }

  {
    const longOutput = `${"x".repeat(MAX_EVIDENCE_CHARACTERS * 2)}${FAKE_TOKEN}`;
    const harness = e2eHarness({newman: {outcome: exited(1, {stdout: longOutput})}});
    effectTest(
      "bounds the evidence to the last characters of the redacted output",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(runE2e({target: "backend"}));

          const [line] = error._tag === "NewmanFailed" ? error.evidence : [];
          expect(line).toBe(`stdout: ${`${"x".repeat(MAX_EVIDENCE_CHARACTERS * 2)}[REDACTED]`.slice(-MAX_EVIDENCE_CHARACTERS)}`);
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// runE2e — report sanitization and cleanup
// ============================================================================

describe("runE2e: report sanitization and cleanup", () => {
  {
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolveStarted) => {
      markStarted = resolveStarted;
    });
    const harness = e2eHarness({newman: {reports: tokenReports, outcome: "never", onStarted: () => markStarted?.()}});
    effectTest(
      "runs cleanup when interrupted",
      () =>
        Effect.gen(function* () {
          const fiber = yield* Effect.forkChild(runE2e({target: "backend"}));
          yield* Effect.promise(() => started);
          expect(reportText(harness, "newman-backend.json")).toContain(FAKE_TOKEN);

          const exit = yield* Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber)));

          expect(Exit.hasInterrupts(exit)).toBe(true);
          const reports = [...harness.files()].filter(([path]) => path.startsWith(normalizeFixturePath(REPORT_DIR)));
          expect(reports.map(([path]) => path.slice(normalizeFixturePath(REPORT_DIR).length + 1)).sort()).toEqual([
            "newman-backend-summary.md",
            "newman-backend.json",
            "newman-backend.xml",
          ]);
          for (const [, content] of reports) {
            expect(content).not.toContain(FAKE_TOKEN);
            expect(content).toContain("[REDACTED]");
          }
        }),
      harness.layer,
    );
  }

  {
    const jwt = generateSyntheticJwt();
    const harness = e2eHarness({variables: {E2E_TEST_AUTH_TOKEN: jwt}, newman: {reports: tokenReports}});
    effectTest(
      "sanitizes JSON, JUnit, and summary artifacts after a successful run",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "backend"});

          for (const name of ["newman-backend.json", "newman-backend.xml", "newman-backend-summary.md"]) {
            const content = reportText(harness, name) ?? "";
            expect(content).not.toContain(jwt);
            expect(content).not.toMatch(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/u);
          }
          expect(reportText(harness, "newman-backend.xml")).toContain("Auth test");
        }),
      harness.layer,
    );
  }

  {
    const jwt = generateSyntheticJwt();
    const harness = e2eHarness({variables: {E2E_TEST_AUTH_TOKEN: jwt}, newman: {reports: tokenReports, outcome: exited(1)}});
    effectTest(
      "sanitizes artifacts on the failure path (nonzero exit) even though the run fails",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(runE2e({target: "backend"}));

          expect(error).toMatchObject({_tag: "NewmanFailed", exitCode: 1, evidence: []});
          expect(reportText(harness, "newman-backend.json")).not.toContain(jwt);
          expect(reportText(harness, "newman-backend.xml")).not.toContain(jwt);
        }),
      harness.layer,
    );
  }

  {
    const harness = e2eHarness({newman: {reports: tokenReports}});
    effectTest(
      "sanitizes a plain runtime token from every retained report artifact, without temporary files",
      () =>
        Effect.gen(function* () {
          yield* runE2e({target: "backend"});

          for (const name of ["newman-backend.json", "newman-backend.xml", "newman-backend-summary.md"]) {
            expect(reportText(harness, name)).not.toContain(FAKE_TOKEN);
            expect(reportText(harness, name)).toContain("[REDACTED]");
          }
          expect([...harness.files().keys()].filter((path) => path.endsWith(".tmp"))).toEqual([]);
        }),
      harness.layer,
    );
  }

  {
    const harness = e2eHarness({newman: {reports: tokenReports}});
    effectTest(
      "performs report cleanup in assertion-summary, JSON, JUnit, summary order",
      () =>
        Effect.gen(function* () {
          const recorded: string[] = [];

          yield* runE2e({target: "backend"}).pipe(Effect.provide(failingFileSystem([], recorded)));

          expect(recorded.filter((entry) => entry.startsWith("rename:"))).toEqual([
            "rename:newman-backend-summary.md",
            "rename:newman-backend.json",
            "rename:newman-backend.xml",
            "rename:newman-backend-summary.md",
          ]);
        }),
      harness.layer,
    );
  }

  {
    const harness = e2eHarness({newman: {reports: tokenReports}});
    effectTest(
      "fails with the cleanup failure when Newman succeeds but a report-cleanup step fails",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(
            runE2e({target: "backend"}).pipe(
              Effect.provide(failingFileSystem([{method: "rename", when: isReport("newman-backend.json")}])),
            ),
          );

          const jsonPath = join(REPORT_DIR, "newman-backend.json");
          expect(error).toBeInstanceOf(NewmanFailed);
          expect(error).toMatchObject({target: "backend", evidence: []});
          expect(error.message).toMatch(
            new RegExp(
              `^Report cleanup failed for backend:\\nJSON report sanitization: Failed to write sanitized Newman JSON report, removed it: ${RegExp.escape(jsonPath)} \\(Unknown: FileSystem\\.rename \\(.*\\): disk full\\)$`,
              "u",
            ),
          );
          expect(reportText(harness, "newman-backend.json")).toBeNull();
          expect([...harness.files().keys()].filter((path) => path.endsWith(".tmp"))).toEqual([]);
        }),
      harness.layer,
    );
  }

  {
    const malformed = (token: string): NewmanReports => ({json: `{"authToken": "${token}", oops`, junit: "<testsuites/>"});
    const harness = e2eHarness({newman: {reports: malformed, outcome: exited(1)}});
    effectTest(
      "keeps the newman failure primary when sanitization also fails",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(runE2e({target: "backend"}));

          expect(error).toBeInstanceOf(NewmanFailed);
          if (!(error instanceof NewmanFailed)) return;
          expect(error.message).toBe("Newman exited with code 1 for backend.");
          expect(error.exitCode).toBe(1);
          expect(error.evidence).toHaveLength(1);
          const jsonPath = join(REPORT_DIR, "newman-backend.json");
          expect(error.evidence[0]).toContain("Report cleanup failed for backend:\n");
          expect(error.evidence[0]).toContain(
            `assertion summary: Failed to read Newman JSON report while generating assertion summary: ${jsonPath} (`,
          );
          expect(error.evidence[0]).toContain(`JSON report sanitization: Failed to parse Newman JSON report, removed it: ${jsonPath} (`);
          expect(JSON.stringify(error)).not.toContain(FAKE_TOKEN);
          expect(reportText(harness, "newman-backend.json")).toBeNull();
        }),
      harness.layer,
    );
  }

  {
    const harness = e2eHarness({newman: {reports: tokenReports}});
    effectTest(
      "attempts every report-cleanup step even when an earlier step fails",
      () =>
        Effect.gen(function* () {
          const recorded: string[] = [];

          yield* Effect.flip(
            runE2e({target: "backend"}).pipe(
              Effect.provide(failingFileSystem([{method: "rename", when: isReport("newman-backend.json")}], recorded)),
            ),
          );

          expect(recorded.filter((entry) => entry.startsWith("rename:"))).toEqual([
            "rename:newman-backend-summary.md",
            "rename:newman-backend.json",
            "rename:newman-backend.xml",
            "rename:newman-backend-summary.md",
          ]);
          const summaryWrites = recorded.filter((entry) => entry.startsWith("write:.newman-backend-summary.md."));
          expect(summaryWrites).toHaveLength(2);
          expect(summaryWrites[0]).toContain(FAKE_TOKEN);
          expect(summaryWrites[1]).not.toContain(FAKE_TOKEN);
          expect(summaryWrites[1]).toContain("[REDACTED]");
        }),
      harness.layer,
    );
  }

  {
    const harness = e2eHarness({newman: {reports: tokenReports}});
    effectTest(
      "reports the first cleanup failure (in cleanup order) and appends the others as evidence",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(
            runE2e({target: "all"}).pipe(
              Effect.provide(
                failingFileSystem([
                  {method: "rename", when: isReport("newman-frontend.xml")},
                  {method: "rename", when: isReport("newman-backend.xml")},
                ]),
              ),
            ),
          );

          expect(error).toMatchObject({_tag: "NewmanFailed", target: "backend"});
          expect(error.message).toMatch(
            /^Report cleanup failed for backend:\nJUnit report sanitization: Failed to write sanitized text report/u,
          );
          const evidence = error._tag === "NewmanFailed" ? error.evidence : [];
          expect(evidence).toHaveLength(1);
          expect(evidence[0]).toMatch(/^Report cleanup failed for frontend:\nJUnit report sanitization: /u);
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// writeAssertionSummary
// ============================================================================

describe("writeAssertionSummary", () => {
  {
    const harness = makeTestLayer();
    effectTest(
      "is a no-op with a warning when the JSON report does not exist",
      () =>
        Effect.gen(function* () {
          yield* writeAssertionSummary("backend", REPORTS);

          expect(fileText(harness, join(REPORTS, "newman-backend-summary.md"))).toBeNull();
          expect(outputText(harness)).toContain(`⚠️ JSON report not found, cannot create summary: ${join(REPORTS, "newman-backend.json")}`);
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({files: {[join(REPORTS, "newman-backend.json")]: JSON.stringify({run: {failures: []}})}});
    effectTest(
      "writes a 'no failed assertions' summary when the report has none",
      () =>
        Effect.gen(function* () {
          yield* writeAssertionSummary("backend", REPORTS);

          expect(fileText(harness, join(REPORTS, "newman-backend-summary.md"))).toBe(
            "### Failed Assertions (backend)\nNo failed assertions.\n",
          );
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({
      files: {
        [join(REPORTS, "newman-backend.json")]: JSON.stringify({
          run: {
            failures: [
              {assertion: "Status is 200", error: "expected 200 but got 500", source: {name: "Get invoice"}},
              {cursor: {scriptId: "script-1"}},
              {},
            ],
          },
        }),
      },
    });
    effectTest(
      "writes failure detail when the report contains failures",
      () =>
        Effect.gen(function* () {
          yield* writeAssertionSummary("backend", REPORTS);

          expect(fileText(harness, join(REPORTS, "newman-backend-summary.md"))).toBe(
            '### Failed Assertions (backend)\n1. AssertionError  Status is 200\n   expected 200 but got 500\n   in "Get invoice"\n\n2. AssertionError  Unknown assertion\n   Unknown error\n   in "script-1"\n\n3. AssertionError  Unknown assertion\n   Unknown error\n   in "Unknown"\n',
          );
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({files: {[join(REPORTS, "newman-backend.json")]: "{not valid json"}});
    effectTest(
      "fails when the JSON report cannot be parsed",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(writeAssertionSummary("backend", REPORTS));

          expect(error).toBeInstanceOf(NewmanReportFailed);
          expect(error.message).toMatch(/^Failed to read Newman JSON report while generating assertion summary: /u);
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({files: {[join(REPORTS, "newman-backend.json")]: "null"}});
    effectTest(
      "fails when the JSON report is not an object",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(writeAssertionSummary("backend", REPORTS));

          expect(error).toEqual(
            new NewmanReportFailed({
              path: join(REPORTS, "newman-backend.json"),
              message: `Failed to read Newman JSON report while generating assertion summary: ${join(REPORTS, "newman-backend.json")} (the report is not a JSON object)`,
            }),
          );
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// sanitizeNewmanJsonReport
// ============================================================================

describe("sanitizeNewmanJsonReport", () => {
  const jsonPath = join(REPORTS, "newman-backend.json");

  {
    const harness = makeTestLayer();
    effectTest(
      "is a no-op when the report does not exist",
      () =>
        Effect.gen(function* () {
          yield* sanitizeNewmanJsonReport(join(REPORTS, "missing.json"));

          expect(harness.output()).toEqual([]);
        }),
      harness.layer,
    );
  }

  {
    const jwt = generateSyntheticJwt();
    const harness = makeTestLayer({files: {[jsonPath]: JSON.stringify({token: jwt, safe: "value"})}});
    effectTest(
      "redacts a JWT-shaped value and rewrites the report",
      () =>
        Effect.gen(function* () {
          yield* sanitizeNewmanJsonReport(jsonPath);

          expect(fileText(harness, jsonPath)).toBe('{\n  "token": "[REDACTED]",\n  "safe": "value"\n}');
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({
      files: {
        [jsonPath]: JSON.stringify({
          environment: {values: [{key: "authToken", value: FAKE_TOKEN}]},
          response: {body: `opaque-prefix:${FAKE_TOKEN}:opaque-suffix`},
        }),
      },
    });
    effectTest(
      "redacts a plain runtime token from environment values and opaque response bodies",
      () =>
        Effect.gen(function* () {
          yield* sanitizeNewmanJsonReport(jsonPath, FAKE_TOKEN);

          const content = fileText(harness, jsonPath) ?? "";
          expect(content).not.toContain(FAKE_TOKEN);
          expect(content.match(/\[REDACTED\]/gu)).toHaveLength(2);
          expect(outputText(harness)).toContain(`ℹ️ Sanitized Newman JSON report (2 redaction(s)): ${jsonPath}`);
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({files: {[jsonPath]: "{not valid json"}});
    effectTest(
      "fails and removes the artifact when the JSON report cannot be parsed",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(sanitizeNewmanJsonReport(jsonPath));

          expect(error.message).toMatch(/^Failed to parse Newman JSON report, removed it: /u);
          expect(fileText(harness, jsonPath)).toBeNull();
        }),
      harness.layer,
    );
  }
  {
    const jwt = generateSyntheticJwt();
    const harness = makeTestLayer({files: {[jsonPath]: JSON.stringify({[jwt]: "value"})}});
    effectTest(
      "removes the report with a warning when a JWT pattern survives sanitization",
      () =>
        Effect.gen(function* () {
          yield* sanitizeNewmanJsonReport(jsonPath);

          expect(fileText(harness, jsonPath)).toBeNull();
          expect(outputText(harness)).toContain(`⚠️ Removed unsanitized Newman JSON report due to remaining JWT patterns: ${jsonPath}`);
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// sanitizeNewmanTextReport
// ============================================================================
describe("sanitizeNewmanTextReport", () => {
  const xmlPath = join(REPORTS, "newman-backend.xml");

  {
    const harness = makeTestLayer();
    effectTest(
      "is a no-op when the report does not exist",
      () =>
        Effect.gen(function* () {
          yield* sanitizeNewmanTextReport(join(REPORTS, "missing.xml"));

          expect(harness.output()).toEqual([]);
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({files: {[xmlPath]: "<testcase>authToken=super-secret-value</testcase>"}});
    effectTest(
      "redacts the runtime auth token by exact match",
      () =>
        Effect.gen(function* () {
          yield* sanitizeNewmanTextReport(xmlPath, "super-secret-value");

          expect(fileText(harness, xmlPath)).toBe("<testcase>authToken=[REDACTED]</testcase>");
          expect(outputText(harness)).toContain(`ℹ️ Sanitized text report (1 redaction pass(es)): ${xmlPath}`);
        }),
      harness.layer,
    );
  }

  {
    const jwt = generateSyntheticJwt();
    const harness = makeTestLayer({files: {[xmlPath]: `<system-out>Authorization: Bearer ${jwt}</system-out><x>${jwt}</x>`}});
    effectTest(
      "redacts a bearer JWT pattern and a bare JWT from text content",
      () =>
        Effect.gen(function* () {
          yield* sanitizeNewmanTextReport(xmlPath);

          expect(fileText(harness, xmlPath)).toBe("<system-out>Authorization: ******</system-out><x>[REDACTED_JWT]</x>");
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({files: {[xmlPath]: "<testcase>clean</testcase>"}});
    effectTest(
      "rewrites a clean report silently",
      () =>
        Effect.gen(function* () {
          yield* sanitizeNewmanTextReport(xmlPath, FAKE_TOKEN);

          expect(fileText(harness, xmlPath)).toBe("<testcase>clean</testcase>");
          expect(harness.output()).toEqual([]);
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({files: {[xmlPath]: `<x>${FAKE_TOKEN}</x>`}});
    effectTest(
      "fails and removes the artifact when the report cannot be read",
      () =>
        Effect.gen(function* () {
          const error = yield* Effect.flip(
            sanitizeNewmanTextReport(xmlPath, FAKE_TOKEN).pipe(
              Effect.provide(
                failingFileSystem([
                  {method: "readFileString", when: (path) => normalizeFixturePath(path) === normalizeFixturePath(xmlPath)},
                ]),
              ),
            ),
          );

          expect(error.message).toBe(
            `Failed to read text report, removed it: ${xmlPath} (Unknown: FileSystem.readFileString (${xmlPath}): disk full)`,
          );
          expect(fileText(harness, xmlPath)).toBeNull();
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// sanitizeJsonValue / redactSensitiveString
// ============================================================================

describe("sanitizeJsonValue and redactSensitiveString", () => {
  it("redacts values under sensitive keys regardless of shape", () => {
    const accumulator = {redactionCount: 0};
    const sanitized = sanitizeJsonValue({authToken: "abc123", nested: {accessToken: "def456"}, safe: "ok"}, accumulator);
    expect(sanitized).toEqual({authToken: "[REDACTED]", nested: {accessToken: "[REDACTED]"}, safe: "ok"});
    expect(accumulator.redactionCount).toBe(2);
  });

  it("redacts JWT-shaped strings even under non-sensitive keys", () => {
    const jwt = generateSyntheticJwt();
    const accumulator = {redactionCount: 0};
    const sanitized = redactSensitiveString(`payload: ${jwt}`, "message", accumulator);
    expect(sanitized).not.toContain(jwt);
    expect(accumulator.redactionCount).toBeGreaterThan(0);
  });

  it("recurses through arrays", () => {
    const accumulator = {redactionCount: 0};
    const sanitized = sanitizeJsonValue([{token: "secret"}, {safe: "ok"}], accumulator);
    expect(sanitized).toEqual([{token: "[REDACTED]"}, {safe: "ok"}]);
  });
});

// ============================================================================
// E2E characterization (R1 pins, through runCli)
// ============================================================================

/** Every report file name a target can leave behind. */
const REPORT_FILES = (target: string): readonly string[] => [
  `newman-${target}.json`,
  `newman-${target}.xml`,
  `newman-${target}-summary.md`,
];

/**
 * Builds a token-bearing Newman JSON report with a bearer JWT header, a JWT in a non-sensitive
 * field, the raw token in an opaque body, and the token under a sensitive environment key.
 *
 * @param token - Runtime auth token Newman would have seen.
 * @param failures - Failed assertions recorded by the run.
 * @returns The exact report text Newman would export.
 */
function characterizationJsonReport(token: string, failures: readonly unknown[]): string {
  const jwt = generateSyntheticJwt();
  return JSON.stringify(
    {
      run: {
        stats: {requests: {total: 1, failed: 0}, assertions: {total: 2, failed: failures.length}},
        executions: [
          {
            item: {name: "GET /rest/v1/invoices"},
            request: {url: "https://api.arolariu.ro/rest/v1/invoices", headers: [{key: "Authorization", value: `Bearer ${jwt}`}]},
            response: {code: 200, body: `{"echo":"${token}"}`},
            console: [`decoded ${jwt}`],
          },
        ],
        failures,
      },
      environment: {
        values: [
          {key: "authToken", value: token, type: "secret"},
          {key: "baseUrl", value: "https://api.arolariu.ro", type: "default"},
        ],
      },
    },
    null,
    2,
  );
}

/**
 * Builds a token-bearing Newman JUnit report.
 *
 * @param token - Runtime auth token Newman would have seen.
 * @param failureCount - Number of failed test cases.
 * @returns The exact JUnit XML Newman would export.
 */
function characterizationJunitReport(token: string, failureCount: number): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites name="newman" tests="2" failures="${String(failureCount)}">`,
    '  <testsuite name="Invoices" tests="2">',
    '    <testcase name="GET /rest/v1/invoices" classname="Invoices">',
    `      <system-out>Authorization: Bearer ${generateSyntheticJwt()}</system-out>`,
    `      <system-out>authToken=${token}</system-out>`,
    "    </testcase>",
    "  </testsuite>",
    "</testsuites>",
  ].join("\n");
}

/**
 * Builds the characterization reports Newman writes for a list of failed assertions.
 *
 * @param failures - Failed assertions recorded by the run.
 * @returns The report builder.
 */
function characterizationReports(failures: readonly unknown[]): (token: string) => NewmanReports {
  return (token) => ({json: characterizationJsonReport(token, failures), junit: characterizationJunitReport(token, failures.length)});
}

/** Replaces the machine-dependent fixture root and normalizes path separators. */
function withPortablePaths(text: string): string {
  return text.replaceAll(repositoryFixtureRoot, "<root>").replaceAll("\\", "/");
}

/** Everything one characterized E2E invocation produced. */
interface E2eCharacterization {
  readonly code: number;
  readonly calls: readonly unknown[];
  readonly tokenArgs: readonly (readonly string[])[];
  readonly output: readonly SinkRecord[];
  readonly reports: Readonly<Record<string, string | null>>;
}

/**
 * Runs `test e2e <target>` through `runCli` against the scripted Newman.
 *
 * @param target - Requested target.
 * @param json - Whether to pass `--json`.
 * @param newman - Newman behavior.
 * @returns The exit code, Newman calls, token-bearing args, rendered output, and report bytes.
 */
async function characterizeE2e(target: E2ETarget, json: boolean, newman: NewmanScript): Promise<E2eCharacterization> {
  const harness = e2eHarness({newman});
  const argv = ["test", "e2e", target, ...(json ? ["--json"] : [])];
  const exit = await runScoped(Effect.exit(runCli(argv, makeRootCommand([makeE2eCommand()]))), harness.layer);

  const reports: Record<string, string | null> = {};
  for (const name of (target === "all" ? ["frontend", "backend", "cv"] : [target]).flatMap(REPORT_FILES)) {
    reports[name] = reportText(harness, name);
  }
  return {
    code: exitCodeFor(exit, undefined),
    calls: harness.processCalls().map(({request, options}) => ({
      command: request.command,
      args: request.args.map((arg) => withPortablePaths(arg).replaceAll(FAKE_TOKEN, "<token>")),
      options: {...options, cwd: options.cwd === undefined ? undefined : withPortablePaths(options.cwd)},
    })),
    tokenArgs: harness.processCalls().map(({request}) => request.args.filter((arg) => arg.includes(FAKE_TOKEN))),
    output: harness.output().map((record) => ({stream: record.stream, text: withPortablePaths(record.text.replace(/\n$/u, ""))})),
    reports,
  };
}

/** Asserts the raw token never reaches rendered output. */
function expectTokenNeverRendered(result: Readonly<E2eCharacterization>): void {
  expect(JSON.stringify(result.output).includes(FAKE_TOKEN)).toBe(false);
}

const ASSERTION_FAILURES: readonly unknown[] = [
  {
    assertion: "Status code is 200",
    error: {message: `expected 401 to equal 200 for ${FAKE_TOKEN}`},
    source: {name: "GET /rest/v1/invoices"},
  },
  {assertion: "Body has id", error: "expected body to have property 'id'", parent: {name: "Invoices"}},
];

/** The Newman call options every characterized run uses (intentional change: captured output, no echo). */
const NEWMAN_OPTIONS = {cwd: "<root>", output: "capture", echo: false, failureOutput: "full"} as const;

/**
 * The pinned Newman argument vector of one target with the token placeholder.
 *
 * @param target - The target.
 * @param directory - The target's site directory.
 * @param withToken - Whether the token is passed.
 * @returns The argument vector.
 */
function newmanCall(target: string, directory: string, withToken: boolean): unknown {
  return {
    command: "npx",
    args: [
      "newman",
      "run",
      `<root>/${directory}/postman-collection.json`,
      "--environment",
      `<root>/${directory}/postman-environment.production.json`,
      ...(withToken ? ["--env-var", "authToken=<token>"] : []),
      "--reporters",
      "cli,json,junit",
      "--reporter-json-export",
      `<root>/e2e-logs/newman-${target}.json`,
      "--reporter-junit-export",
      `<root>/e2e-logs/newman-${target}.xml`,
      "--timeout",
      "600000",
      "--timeout-request",
      "30000",
      "--timeout-script",
      "10000",
    ],
    options: NEWMAN_OPTIONS,
  };
}

/**
 * The pinned header lines of one target.
 *
 * @param target - The target.
 * @param directory - The target's site directory.
 * @returns The output records.
 */
function targetHeader(target: string, directory: string): readonly SinkRecord[] {
  return [
    {stream: "stdout", text: ""},
    {stream: "stdout", text: `🧪 E2E Testing: ${target}`},
    {stream: "stdout", text: ""},
    {stream: "stdout", text: `Collection: <root>/${directory}/postman-collection.json`},
    {stream: "stdout", text: `Environment: <root>/${directory}/postman-environment.production.json (production)`},
    {stream: "stdout", text: `JSON report: <root>/e2e-logs/newman-${target}.json`},
    {stream: "stdout", text: `JUnit report: <root>/e2e-logs/newman-${target}.xml`},
    {stream: "stdout", text: "Timeout: 600000ms (request: 30000ms, script: 10000ms)"},
    {stream: "stdout", text: "Strict mode (--bail): false"},
  ];
}

const RUNNER_HEADER: readonly SinkRecord[] = [
  {stream: "stdout", text: ""},
  {stream: "stdout", text: "🎯 arolariu.ro E2E Test Runner"},
  {stream: "stdout", text: ""},
];

const PASS_JSON_REPORT =
  '{\n  "run": {\n    "stats": {\n      "requests": {\n        "total": 1,\n        "failed": 0\n      },\n      "assertions": {\n        "total": 2,\n        "failed": 0\n      }\n    },\n    "executions": [\n      {\n        "item": {\n          "name": "GET /rest/v1/invoices"\n        },\n        "request": {\n          "url": "https://api.arolariu.ro/rest/v1/invoices",\n          "headers": [\n            {\n              "key": "Authorization",\n              "value": "******"\n            }\n          ]\n        },\n        "response": {\n          "code": 200,\n          "body": "{\\"echo\\":\\"[REDACTED]\\"}"\n        },\n        "console": [\n          "decoded [REDACTED_JWT]"\n        ]\n      }\n    ],\n    "failures": []\n  },\n  "environment": {\n    "values": [\n      {\n        "key": "authToken",\n        "value": "[REDACTED]",\n        "type": "secret"\n      },\n      {\n        "key": "baseUrl",\n        "value": "https://api.arolariu.ro",\n        "type": "default"\n      }\n    ]\n  }\n}';
const PASS_JUNIT_REPORT =
  '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="newman" tests="2" failures="0">\n  <testsuite name="Invoices" tests="2">\n    <testcase name="GET /rest/v1/invoices" classname="Invoices">\n      <system-out>Authorization: ******</system-out>\n      <system-out>authToken=[REDACTED]</system-out>\n    </testcase>\n  </testsuite>\n</testsuites>';
const FAIL_JSON_REPORT =
  '{\n  "run": {\n    "stats": {\n      "requests": {\n        "total": 1,\n        "failed": 0\n      },\n      "assertions": {\n        "total": 2,\n        "failed": 2\n      }\n    },\n    "executions": [\n      {\n        "item": {\n          "name": "GET /rest/v1/invoices"\n        },\n        "request": {\n          "url": "https://api.arolariu.ro/rest/v1/invoices",\n          "headers": [\n            {\n              "key": "Authorization",\n              "value": "******"\n            }\n          ]\n        },\n        "response": {\n          "code": 200,\n          "body": "{\\"echo\\":\\"[REDACTED]\\"}"\n        },\n        "console": [\n          "decoded [REDACTED_JWT]"\n        ]\n      }\n    ],\n    "failures": [\n      {\n        "assertion": "Status code is 200",\n        "error": {\n          "message": "expected 401 to equal 200 for [REDACTED]"\n        },\n        "source": {\n          "name": "GET /rest/v1/invoices"\n        }\n      },\n      {\n        "assertion": "Body has id",\n        "error": "expected body to have property \'id\'",\n        "parent": {\n          "name": "Invoices"\n        }\n      }\n    ]\n  },\n  "environment": {\n    "values": [\n      {\n        "key": "authToken",\n        "value": "[REDACTED]",\n        "type": "secret"\n      },\n      {\n        "key": "baseUrl",\n        "value": "https://api.arolariu.ro",\n        "type": "default"\n      }\n    ]\n  }\n}';
const FAIL_JUNIT_REPORT =
  '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="newman" tests="2" failures="2">\n  <testsuite name="Invoices" tests="2">\n    <testcase name="GET /rest/v1/invoices" classname="Invoices">\n      <system-out>Authorization: ******</system-out>\n      <system-out>authToken=[REDACTED]</system-out>\n    </testcase>\n  </testsuite>\n</testsuites>';
const FAIL_SUMMARY =
  '### Failed Assertions (backend)\n1. AssertionError  Status code is 200\n   expected 401 to equal 200 for [REDACTED]\n   in "GET /rest/v1/invoices"\n\n2. AssertionError  Body has id\n   expected body to have property \'id\'\n   in "Invoices"\n';
const CV_JSON_REPORT =
  '{\n  "run": {\n    "stats": {\n      "requests": {\n        "total": 1,\n        "failed": 0\n      },\n      "assertions": {\n        "total": 2,\n        "failed": 0\n      }\n    },\n    "executions": [\n      {\n        "item": {\n          "name": "GET /rest/v1/invoices"\n        },\n        "request": {\n          "url": "https://api.arolariu.ro/rest/v1/invoices",\n          "headers": [\n            {\n              "key": "Authorization",\n              "value": "******"\n            }\n          ]\n        },\n        "response": {\n          "code": 200,\n          "body": "{\\"echo\\":\\"no-token-received\\"}"\n        },\n        "console": [\n          "decoded [REDACTED_JWT]"\n        ]\n      }\n    ],\n    "failures": []\n  },\n  "environment": {\n    "values": [\n      {\n        "key": "authToken",\n        "value": "no-token-received",\n        "type": "secret"\n      },\n      {\n        "key": "baseUrl",\n        "value": "https://api.arolariu.ro",\n        "type": "default"\n      }\n    ]\n  }\n}';
const CV_JUNIT_REPORT =
  '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="newman" tests="2" failures="0">\n  <testsuite name="Invoices" tests="2">\n    <testcase name="GET /rest/v1/invoices" classname="Invoices">\n      <system-out>Authorization: ******</system-out>\n      <system-out>authToken=no-token-received</system-out>\n    </testcase>\n  </testsuite>\n</testsuites>';

describe("e2e characterization (R1 pins through runCli)", () => {
  it("backend pass (human): Newman args, sanitized reports, summary, output, exit 0", async () => {
    const result = await characterizeE2e("backend", false, {reports: characterizationReports([])});

    expect(result.code).toBe(0);
    expect(result.calls).toEqual([newmanCall("backend", TARGET_DIRS.backend, true)]);
    expect(result.tokenArgs).toEqual([[`authToken=${FAKE_TOKEN}`]]);
    expect(result.output).toEqual([
      ...RUNNER_HEADER,
      ...targetHeader("backend", TARGET_DIRS.backend),
      {stream: "stdout", text: "[arolariu::test:e2e::backend] ✅ Completed Newman tests for: backend"},
      {stream: "stdout", text: "[arolariu::test:e2e::backend] ✅ No failed assertions for backend."},
      {stream: "stdout", text: "[arolariu::test:e2e::backend] ℹ️ Summary written to: <root>/e2e-logs/newman-backend-summary.md"},
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized Newman JSON report (4 redaction(s)): <root>/e2e-logs/newman-backend.json",
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized text report (2 redaction pass(es)): <root>/e2e-logs/newman-backend.xml",
      },
      {stream: "stdout", text: "[arolariu::test:e2e] ✅ Completed 1 of 1 E2E target(s): backend."},
    ]);
    expect(result.reports).toEqual({
      "newman-backend.json": PASS_JSON_REPORT,
      "newman-backend.xml": PASS_JUNIT_REPORT,
      "newman-backend-summary.md": "### Failed Assertions (backend)\nNo failed assertions.\n",
    });
    expectTokenNeverRendered(result);
  });

  it("backend pass (json): one result document and exit 0 (intentional change from legacy exit 1)", async () => {
    const result = await characterizeE2e("backend", true, {reports: characterizationReports([])});

    expect(result.code).toBe(0);
    expect(result.output).toEqual([{stream: "stdout", text: JSON.stringify({targets: ["backend"], completed: ["backend"]}, null, 2)}]);
    expect(result.reports).toEqual({
      "newman-backend.json": PASS_JSON_REPORT,
      "newman-backend.xml": PASS_JUNIT_REPORT,
      "newman-backend-summary.md": "### Failed Assertions (backend)\nNo failed assertions.\n",
    });
    expectTokenNeverRendered(result);
  });

  it("backend assertion failure (human): exit 1, failure output without the command line, sanitized reports, summary", async () => {
    const result = await characterizeE2e("backend", false, {reports: characterizationReports(ASSERTION_FAILURES), outcome: exited(1)});

    expect(result.code).toBe(1);
    expect(result.calls).toEqual([newmanCall("backend", TARGET_DIRS.backend, true)]);
    expect(result.output).toEqual([
      ...RUNNER_HEADER,
      ...targetHeader("backend", TARGET_DIRS.backend),
      {stream: "stderr", text: "[arolariu::test:e2e::backend] ⚠️ 2 failed assertion(s) for backend."},
      {stream: "stdout", text: "[arolariu::test:e2e::backend] ℹ️ Summary written to: <root>/e2e-logs/newman-backend-summary.md"},
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized Newman JSON report (5 redaction(s)): <root>/e2e-logs/newman-backend.json",
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized text report (2 redaction pass(es)): <root>/e2e-logs/newman-backend.xml",
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized text report (1 redaction pass(es)): <root>/e2e-logs/newman-backend-summary.md",
      },
      {stream: "stderr", text: "[arolariu::test:e2e] ⛔ Newman exited with code 1 for backend."},
    ]);
    expect(result.reports).toEqual({
      "newman-backend.json": FAIL_JSON_REPORT,
      "newman-backend.xml": FAIL_JUNIT_REPORT,
      "newman-backend-summary.md": FAIL_SUMMARY,
    });
    expectTokenNeverRendered(result);
  });

  it("backend assertion failure (json): exit 1, one failure document, and the plain stderr diagnostic", async () => {
    const result = await characterizeE2e("backend", true, {reports: characterizationReports(ASSERTION_FAILURES), outcome: exited(1)});

    expect(result.code).toBe(1);
    expect(result.output).toEqual([
      {
        stream: "stdout",
        text: JSON.stringify(
          {status: "failed", kind: "operational", message: "Newman exited with code 1 for backend.", evidence: []},
          null,
          2,
        ),
      },
      {stream: "stderr", text: "Newman exited with code 1 for backend."},
    ]);
    expect(result.reports["newman-backend-summary.md"]).toBe(FAIL_SUMMARY);
    expectTokenNeverRendered(result);
  });

  it("backend spawn failure (human): exit 1, no reports, failure output", async () => {
    const result = await characterizeE2e("backend", false, {outcome: spawnFailed("spawn npx ENOENT")});

    expect(result.code).toBe(1);
    expect(result.calls).toEqual([newmanCall("backend", TARGET_DIRS.backend, true)]);
    expect(result.output).toEqual([
      ...RUNNER_HEADER,
      ...targetHeader("backend", TARGET_DIRS.backend),
      {
        stream: "stderr",
        text: "[arolariu::test:e2e::backend] ⚠️ JSON report not found, cannot create summary: <root>/e2e-logs/newman-backend.json",
      },
      {stream: "stderr", text: "[arolariu::test:e2e] ⛔ Newman failed to start for backend: spawn npx ENOENT"},
    ]);
    expect(result.reports).toEqual({
      "newman-backend.json": null,
      "newman-backend.xml": null,
      "newman-backend-summary.md": null,
    });
    expectTokenNeverRendered(result);
  });

  it("backend spawn failure (json): exit 1, one failure document, and the plain stderr diagnostic", async () => {
    const result = await characterizeE2e("backend", true, {outcome: spawnFailed("spawn npx ENOENT")});

    expect(result.code).toBe(1);
    expect(result.output).toEqual([
      {
        stream: "stdout",
        text: JSON.stringify(
          {status: "failed", kind: "operational", message: "Newman failed to start for backend: spawn npx ENOENT", evidence: []},
          null,
          2,
        ),
      },
      {stream: "stderr", text: "Newman failed to start for backend: spawn npx ENOENT"},
    ]);
    expectTokenNeverRendered(result);
  });

  it("all (human): runs frontend, backend, cv sequentially with per-target token policy", async () => {
    const result = await characterizeE2e("all", false, {reports: characterizationReports([])});

    expect(result.code).toBe(0);
    expect(result.calls).toEqual([
      newmanCall("frontend", TARGET_DIRS.frontend, true),
      newmanCall("backend", TARGET_DIRS.backend, true),
      newmanCall("cv", TARGET_DIRS.cv, false),
    ]);
    expect(result.tokenArgs).toEqual([[`authToken=${FAKE_TOKEN}`], [`authToken=${FAKE_TOKEN}`], []]);
    expect(result.output).toEqual([
      ...RUNNER_HEADER,
      ...targetHeader("frontend", TARGET_DIRS.frontend),
      {stream: "stdout", text: "[arolariu::test:e2e::frontend] ✅ Completed Newman tests for: frontend"},
      ...targetHeader("backend", TARGET_DIRS.backend),
      {stream: "stdout", text: "[arolariu::test:e2e::backend] ✅ Completed Newman tests for: backend"},
      {stream: "stdout", text: "[arolariu::test:e2e::cv] ℹ️ cv does not require auth token; skipping auth injection."},
      ...targetHeader("cv", TARGET_DIRS.cv),
      {stream: "stdout", text: "[arolariu::test:e2e::cv] ✅ Completed Newman tests for: cv"},
      {stream: "stdout", text: "[arolariu::test:e2e::cv] ✅ No failed assertions for cv."},
      {stream: "stdout", text: "[arolariu::test:e2e::cv] ℹ️ Summary written to: <root>/e2e-logs/newman-cv-summary.md"},
      {stream: "stdout", text: "[arolariu::test:e2e::cv] ℹ️ Sanitized Newman JSON report (2 redaction(s)): <root>/e2e-logs/newman-cv.json"},
      {stream: "stdout", text: "[arolariu::test:e2e::cv] ℹ️ Sanitized text report (1 redaction pass(es)): <root>/e2e-logs/newman-cv.xml"},
      {stream: "stdout", text: "[arolariu::test:e2e::backend] ✅ No failed assertions for backend."},
      {stream: "stdout", text: "[arolariu::test:e2e::backend] ℹ️ Summary written to: <root>/e2e-logs/newman-backend-summary.md"},
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized Newman JSON report (4 redaction(s)): <root>/e2e-logs/newman-backend.json",
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::backend] ℹ️ Sanitized text report (2 redaction pass(es)): <root>/e2e-logs/newman-backend.xml",
      },
      {stream: "stdout", text: "[arolariu::test:e2e::frontend] ✅ No failed assertions for frontend."},
      {stream: "stdout", text: "[arolariu::test:e2e::frontend] ℹ️ Summary written to: <root>/e2e-logs/newman-frontend-summary.md"},
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::frontend] ℹ️ Sanitized Newman JSON report (4 redaction(s)): <root>/e2e-logs/newman-frontend.json",
      },
      {
        stream: "stdout",
        text: "[arolariu::test:e2e::frontend] ℹ️ Sanitized text report (2 redaction pass(es)): <root>/e2e-logs/newman-frontend.xml",
      },
      {stream: "stdout", text: "[arolariu::test:e2e] ✅ Completed 3 of 3 E2E target(s): frontend, backend, cv."},
    ]);
    expect(result.reports).toEqual({
      "newman-frontend.json": PASS_JSON_REPORT,
      "newman-frontend.xml": PASS_JUNIT_REPORT,
      "newman-frontend-summary.md": "### Failed Assertions (frontend)\nNo failed assertions.\n",
      "newman-backend.json": PASS_JSON_REPORT,
      "newman-backend.xml": PASS_JUNIT_REPORT,
      "newman-backend-summary.md": "### Failed Assertions (backend)\nNo failed assertions.\n",
      "newman-cv.json": CV_JSON_REPORT,
      "newman-cv.xml": CV_JUNIT_REPORT,
      "newman-cv-summary.md": "### Failed Assertions (cv)\nNo failed assertions.\n",
    });
    expectTokenNeverRendered(result);
  });
});
