// @vitest-environment node
/**
 * @fileoverview Contract tests for the monorepo status dashboard.
 * @module scripts.status.test
 */

import {spawn} from "node:child_process";
import {readFileSync} from "node:fs";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandRunner, CommandRunOptions, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import {createDoctorReport} from "./doctor.reporter.ts";
import type {DiagnosticResult} from "./doctor.types.ts";
import {healthFromDoctorResult, main, parseStatusOptions} from "./status.ts";

// ============================================================================
// Fixtures
// ============================================================================

const FIXED_ROOT = resolve("C:\\fixture\\arolariu.ro");
const FIXED_REPOSITORY_PATHS = createRepositoryPaths(FIXED_ROOT);
const DOCTOR_SCRIPT_PATH = join(FIXED_ROOT, "scripts", "doctor.ts");

const GIT_BRANCH_KEY = "git rev-parse --abbrev-ref HEAD";
const GIT_SHA_KEY = "git rev-parse --short HEAD";
const GIT_LOG_TIME_KEY = "git log -1 --format=%cr";
const GIT_LOG_MSG_KEY = "git log -1 --format=%s";
const GIT_STATUS_KEY = "git status --porcelain";
const NPM_AUDIT_KEY = "npm audit --json";
const NPM_OUTDATED_KEY = "npm outdated --json";
const NX_GRAPH_KEY = "npx --no-install nx graph --print --open=false --watch=false";
const DOCTOR_KEY = `${process.execPath} ${DOCTOR_SCRIPT_PATH} --quick --json`;

function commandKey(command: Readonly<CommandSpec>): string {
  return [command.command, ...command.args].join(" ");
}

function commandResult(overrides: Partial<CommandResult> = {}): CommandResult {
  return {code: 0, stdout: "", stderr: "", durationMs: 1, timedOut: false, ...overrides};
}

function passCheck(id: string): DiagnosticResult {
  return {
    id,
    module: "workspace",
    name: id,
    status: "pass",
    summary: `${id} is healthy.`,
    evidence: [],
    potentialCauses: [],
    fixes: [],
    durationMs: 1,
  };
}

function failCheck(id: string): DiagnosticResult {
  return {
    id,
    module: "workspace",
    name: id,
    status: "fail",
    summary: `${id} failed.`,
    evidence: [`${id} evidence`],
    rootCause: `${id} root cause`,
    potentialCauses: [],
    fixes: [{description: `Fix ${id}.`}],
    durationMs: 1,
  };
}

const PASSING_DOCTOR_REPORT = createDoctorReport([passCheck("workspace.repository-root")], "2026-08-29T00:00:00.000Z");
const FAILING_DOCTOR_REPORT = createDoctorReport([failCheck("workspace.repository-root")], "2026-08-29T00:00:00.000Z");

const HEALTHY_NX_GRAPH_STDOUT = JSON.stringify({
  graph: {
    nodes: {"@arolariu/website": {}, "@arolariu/components": {}},
    dependencies: {
      "@arolariu/website": [{source: "@arolariu/website", target: "@arolariu/components"}],
      "@arolariu/components": [],
    },
  },
});

const CLEAN_AUDIT_STDOUT = JSON.stringify({
  metadata: {vulnerabilities: {critical: 0, high: 0, moderate: 0, low: 0}},
});

/** Records every command issued to a fake runner and replies from a keyed response table. */
function createRecordingRunner(responses: ReadonlyMap<string, CommandResult>): Readonly<{
  runner: CommandRunner;
  calls: readonly Readonly<{command: CommandSpec; options?: CommandRunOptions}>[];
}> {
  const calls: {command: CommandSpec; options?: CommandRunOptions}[] = [];
  const runner: CommandRunner = {
    run: async (command, options) => {
      calls.push(options === undefined ? {command} : {command, options});
      const response = responses.get(commandKey(command));
      if (response === undefined) {
        throw new Error(`Unexpected command in test: ${commandKey(command)}`);
      }
      return response;
    },
  };
  return {runner, calls};
}

function baseResponses(): Map<string, CommandResult> {
  return new Map<string, CommandResult>([
    [GIT_BRANCH_KEY, commandResult({stdout: "main\n"})],
    [GIT_SHA_KEY, commandResult({stdout: "abc1234\n"})],
    [GIT_LOG_TIME_KEY, commandResult({stdout: "2 hours ago\n"})],
    [GIT_LOG_MSG_KEY, commandResult({stdout: "chore: something\n"})],
    [GIT_STATUS_KEY, commandResult({stdout: ""})],
    [NPM_AUDIT_KEY, commandResult({stdout: CLEAN_AUDIT_STDOUT})],
    [NPM_OUTDATED_KEY, commandResult({stdout: ""})],
    [NX_GRAPH_KEY, commandResult({stdout: HEALTHY_NX_GRAPH_STDOUT})],
    [DOCTOR_KEY, commandResult({stdout: JSON.stringify(PASSING_DOCTOR_REPORT)})],
  ]);
}

function withOverrides(overrides: Readonly<Record<string, CommandResult>>): Map<string, CommandResult> {
  const responses = baseResponses();
  for (const [key, value] of Object.entries(overrides)) {
    responses.set(key, value);
  }
  return responses;
}

const runnerThatMustNotBeCalled: CommandRunner = {
  run: async () => {
    throw new Error("Status test runner should not be invoked for this path.");
  },
};

function resolvePathsThatMustNotBeCalled(): never {
  throw new Error("Status test resolveRepositoryPaths should not be invoked for this path.");
}

function fixedMeasureDirectorySize(): Promise<number> {
  return Promise.resolve(4_096);
}

function createLogger(mode?: "human" | "json"): Readonly<{logger: MonorepositoryConsoleLogger; sink: InMemoryLoggerSink}> {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("status", {
    color: false,
    sink,
    verbose: false,
    ...(mode === undefined ? {} : {mode}),
  });
  return {logger, sink};
}

/** Runs `main` against the fixed repository fixture with a fully successful command table. */
async function runMainHappyPath(argv: readonly string[], mode?: "human" | "json") {
  const {logger, sink} = createLogger(mode);
  const {runner, calls} = createRecordingRunner(baseResponses());
  const exitCode = await main(argv, {
    logger,
    runner,
    resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS,
    measureDirectorySize: fixedMeasureDirectorySize,
  });
  return {exitCode, sink, calls};
}

function parseJsonOutput(sink: InMemoryLoggerSink): Record<string, unknown> {
  expect(sink.records).toHaveLength(1);
  const [record] = sink.records;
  expect(record?.stream).toBe("stdout");
  expect(record?.text).not.toMatch(/\u001B/);
  return JSON.parse(record?.text ?? "") as Record<string, unknown>;
}

// ============================================================================
// healthFromDoctorResult
// ============================================================================

describe("healthFromDoctorResult", () => {
  it("accepts a valid schema-1 report when doctor exits 0", () => {
    const result = commandResult({code: 0, stdout: JSON.stringify(PASSING_DOCTOR_REPORT)});

    expect(healthFromDoctorResult(result)).toEqual({
      score: PASSING_DOCTOR_REPORT.score,
      grade: PASSING_DOCTOR_REPORT.grade,
      summary: PASSING_DOCTOR_REPORT.summary,
    });
  });

  it("accepts a valid schema-1 report when doctor exits 1 because checks failed", () => {
    const result = commandResult({code: 1, stdout: JSON.stringify(FAILING_DOCTOR_REPORT)});

    expect(healthFromDoctorResult(result)).toEqual({
      score: FAILING_DOCTOR_REPORT.score,
      grade: FAILING_DOCTOR_REPORT.grade,
      summary: FAILING_DOCTOR_REPORT.summary,
    });
  });

  it("ignores stderr warnings when stdout holds a valid report", () => {
    const result = commandResult({
      code: 0,
      stdout: JSON.stringify(PASSING_DOCTOR_REPORT),
      stderr: "npm warn deprecated some-package@1.0.0",
    });

    expect(healthFromDoctorResult(result)).not.toBeNull();
  });

  it("rejects an empty stdout as null", () => {
    expect(healthFromDoctorResult(commandResult({stdout: ""}))).toBeNull();
  });

  it("rejects a non-JSON preamble instead of scanning for the first '{'", () => {
    const result = commandResult({stdout: `npm warn using --force\n${JSON.stringify(PASSING_DOCTOR_REPORT)}`});

    expect(healthFromDoctorResult(result)).toBeNull();
  });

  it("rejects malformed JSON", () => {
    expect(healthFromDoctorResult(commandResult({stdout: "{not valid json"}))).toBeNull();
  });

  it("rejects an old schema that omits schemaVersion", () => {
    const withoutVersion: Record<string, unknown> = JSON.parse(JSON.stringify(PASSING_DOCTOR_REPORT));
    delete withoutVersion["schemaVersion"];
    expect(healthFromDoctorResult(commandResult({stdout: JSON.stringify(withoutVersion)}))).toBeNull();
  });

  it("rejects an unknown future schema version", () => {
    const future = {...PASSING_DOCTOR_REPORT, schemaVersion: 2};
    expect(healthFromDoctorResult(commandResult({stdout: JSON.stringify(future)}))).toBeNull();
  });

  it("rejects an internally inconsistent score", () => {
    const inconsistent = {...PASSING_DOCTOR_REPORT, score: PASSING_DOCTOR_REPORT.score === 100 ? 42 : 100};
    expect(healthFromDoctorResult(commandResult({stdout: JSON.stringify(inconsistent)}))).toBeNull();
  });

  it("rejects an internally inconsistent summary", () => {
    const inconsistent = {...PASSING_DOCTOR_REPORT, summary: {passed: 0, warnings: 0, failed: 0, skipped: 0}};
    expect(healthFromDoctorResult(commandResult({stdout: JSON.stringify(inconsistent)}))).toBeNull();
  });

  it("rejects an internally inconsistent grade", () => {
    const inconsistent = {...PASSING_DOCTOR_REPORT, grade: "F"};
    expect(healthFromDoctorResult(commandResult({stdout: JSON.stringify(inconsistent)}))).toBeNull();
  });
});

// ============================================================================
// parseStatusOptions
// ============================================================================

describe("parseStatusOptions", () => {
  it("returns every flag disabled by default", () => {
    expect(parseStatusOptions([])).toEqual({json: false, help: false});
  });

  it("enables --json", () => {
    expect(parseStatusOptions(["--json"]).json).toBe(true);
  });

  it.each(["--help", "-h"])("enables help via '%s'", (flag) => {
    expect(parseStatusOptions([flag]).help).toBe(true);
  });

  it("rejects an unknown flag", () => {
    expect(() => parseStatusOptions(["--bogus"])).toThrow(/unknown status option/i);
  });

  it("rejects a bare positional argument", () => {
    expect(() => parseStatusOptions(["workspace"])).toThrow(/unknown status option/i);
  });
});

// ============================================================================
// main: help, unknown option
// ============================================================================

describe("main — help and option parsing", () => {
  it("emits usage and exits 0 for --help without invoking any collector", async () => {
    const {logger, sink} = createLogger();

    const exitCode = await main(["--help"], {
      logger,
      runner: runnerThatMustNotBeCalled,
      resolveRepositoryPaths: resolvePathsThatMustNotBeCalled,
    });

    expect(exitCode).toBe(0);
    expect(sink.records.map((record) => record.text).join("\n")).toMatch(/Usage: node scripts\/status\.ts/);
  });

  it("emits usage and exits 0 for -h combined with an otherwise-unknown flag", async () => {
    const {logger} = createLogger();

    await expect(
      main(["--bogus", "-h"], {logger, runner: runnerThatMustNotBeCalled, resolveRepositoryPaths: resolvePathsThatMustNotBeCalled}),
    ).resolves.toBe(0);
  });

  it("returns 1 and renders the option error for an unknown flag, without invoking any collector", async () => {
    const {logger, sink} = createLogger();

    const exitCode = await main(["--bogus"], {
      logger,
      runner: runnerThatMustNotBeCalled,
      resolveRepositoryPaths: resolvePathsThatMustNotBeCalled,
    });

    expect(exitCode).toBe(1);
    expect(sink.records.map((record) => record.text).join("\n")).toMatch(/unknown status option/i);
  });

  it("returns 1 and renders the error when repository-path resolution fails", async () => {
    const {logger, sink} = createLogger();

    const exitCode = await main([], {
      logger,
      runner: runnerThatMustNotBeCalled,
      resolveRepositoryPaths: () => {
        throw new Error("context assembly boom");
      },
    });

    expect(exitCode).toBe(1);
    expect(sink.records.map((record) => record.text).join("\n")).toMatch(/context assembly boom/);
  });
});

// ============================================================================
// main: command specs (no shell strings, exact Nx/doctor/git/npm forms)
// ============================================================================

describe("main — command specs", () => {
  it("issues every external probe as an explicit CommandSpec with the expected cwd and timeout", async () => {
    const {calls} = await runMainHappyPath([], "json");

    const byKey = new Map(calls.map((call) => [commandKey(call.command), call] as const));

    const git = [GIT_BRANCH_KEY, GIT_SHA_KEY, GIT_LOG_TIME_KEY, GIT_LOG_MSG_KEY, GIT_STATUS_KEY];
    for (const key of git) {
      const call = byKey.get(key);
      expect(call, key).toBeDefined();
      expect(call?.options?.cwd).toBe(FIXED_ROOT);
      expect(call?.options?.timeoutMs).toBe(30_000);
    }

    for (const key of [NPM_AUDIT_KEY, NPM_OUTDATED_KEY]) {
      const call = byKey.get(key);
      expect(call, key).toBeDefined();
      expect(call?.options?.cwd).toBe(FIXED_ROOT);
      expect(call?.options?.timeoutMs).toBe(60_000);
    }

    const nxCall = byKey.get(NX_GRAPH_KEY);
    expect(nxCall).toBeDefined();
    expect(nxCall?.command).toEqual({
      command: "npx",
      args: ["--no-install", "nx", "graph", "--print", "--open=false", "--watch=false"],
    });
    expect(nxCall?.options?.cwd).toBe(FIXED_ROOT);
    expect(nxCall?.options?.timeoutMs).toBe(60_000);

    const doctorCall = byKey.get(DOCTOR_KEY);
    expect(doctorCall).toBeDefined();
    expect(doctorCall?.command.command).toBe(process.execPath);
    expect(doctorCall?.command.args).toEqual([DOCTOR_SCRIPT_PATH, "--quick", "--json"]);
    expect(doctorCall?.options?.cwd).toBe(FIXED_ROOT);
    expect(doctorCall?.options?.timeoutMs).toBe(60_000);
  });

  it("never passes a shell string: every command is {command, args}", async () => {
    const {calls} = await runMainHappyPath([], "json");

    for (const call of calls) {
      expect(typeof call.command.command).toBe("string");
      expect(Array.isArray(call.command.args)).toBe(true);
    }
  });
});

// ============================================================================
// No temporary Nx graph file
// ============================================================================

describe("no temporary Nx graph file", () => {
  const sourceText = readFileSync(fileURLToPath(new URL("./status.ts", import.meta.url)), "utf8");

  it("never writes or unlinks a temporary graph file in production source", () => {
    expect(sourceText).not.toMatch(/unlinkSync/);
    expect(sourceText).not.toMatch(/writeFileSync/);
    expect(sourceText).not.toMatch(/--file=/);
    expect(sourceText).not.toMatch(/nx-graph-status-tmp/);
  });

  it("parses the Nx graph directly from captured stdout", async () => {
    const {calls} = await runMainHappyPath([], "json");
    const nxCall = calls.find((call) => commandKey(call.command) === NX_GRAPH_KEY);

    expect(nxCall?.command.args).toContain("--print");
  });
});

// ============================================================================
// Collector independence
// ============================================================================

describe("collector independence", () => {
  it("renders git as unavailable when one underlying git command fails, while siblings still render", async () => {
    const {logger, sink} = createLogger("json");
    const {runner} = createRecordingRunner(withOverrides({[GIT_BRANCH_KEY]: commandResult({code: 1, stdout: ""})}));

    const exitCode = await main(["--json"], {
      logger,
      runner,
      resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS,
      measureDirectorySize: fixedMeasureDirectorySize,
    });

    expect(exitCode).toBe(0);
    const output = parseJsonOutput(sink);
    expect(output["git"]).toBeNull();
    expect(output["workspaces"]).not.toBeNull();
    expect(output["health"]).not.toBeNull();
    expect(output["nxEdges"]).not.toBeNull();
    expect(output["security"]).not.toBeNull();
    expect(output["disk"]).not.toBeNull();
  });

  it("renders nxEdges as unavailable when the Nx graph command is malformed", async () => {
    const {logger, sink} = createLogger("json");
    const {runner} = createRecordingRunner(withOverrides({[NX_GRAPH_KEY]: commandResult({stdout: "{not valid nx json"})}));

    await main(["--json"], {logger, runner, resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS, measureDirectorySize: fixedMeasureDirectorySize});

    const output = parseJsonOutput(sink);
    expect(output["nxEdges"]).toBeNull();
    expect(output["git"]).not.toBeNull();
  });

  it("renders nxEdges as unavailable when the Nx graph command exits non-zero", async () => {
    const {logger, sink} = createLogger("json");
    const {runner} = createRecordingRunner(
      withOverrides({[NX_GRAPH_KEY]: commandResult({code: 1, stdout: HEALTHY_NX_GRAPH_STDOUT})}),
    );

    await main(["--json"], {logger, runner, resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS, measureDirectorySize: fixedMeasureDirectorySize});

    const output = parseJsonOutput(sink);
    expect(output["nxEdges"]).toBeNull();
  });

  it("renders security as unavailable (not zero counts) when npm audit JSON is malformed", async () => {
    const {logger, sink} = createLogger("json");
    const {runner} = createRecordingRunner(
      withOverrides({[NPM_AUDIT_KEY]: commandResult({code: 1, stdout: "not json at all"})}),
    );

    await main(["--json"], {logger, runner, resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS, measureDirectorySize: fixedMeasureDirectorySize});

    const output = parseJsonOutput(sink);
    expect(output["security"]).toBeNull();
    expect(output["security"]).not.toEqual({critical: 0, high: 0, moderate: 0, low: 0, majorOutdated: 0, minorOutdated: 0, patchOutdated: 0});
  });

  it("renders security as unavailable when npm outdated JSON is malformed", async () => {
    const {logger, sink} = createLogger("json");
    const {runner} = createRecordingRunner(withOverrides({[NPM_OUTDATED_KEY]: commandResult({stdout: "not json"})}));

    await main(["--json"], {logger, runner, resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS, measureDirectorySize: fixedMeasureDirectorySize});

    const output = parseJsonOutput(sink);
    expect(output["security"]).toBeNull();
  });

  it("retains nonzero npm audit/outdated JSON output as valid security data", async () => {
    const {logger, sink} = createLogger("json");
    const auditWithFindings = JSON.stringify({metadata: {vulnerabilities: {critical: 1, high: 2, moderate: 0, low: 0}}});
    const outdatedWithPackages = JSON.stringify({
      major: {current: "1.0.0", latest: "2.0.0"},
      minor: {current: "1.1.0", latest: "1.2.0"},
      patch: {current: "1.1.1", latest: "1.1.2"},
    });
    const {runner} = createRecordingRunner(
      withOverrides({
        [NPM_AUDIT_KEY]: commandResult({code: 1, stdout: auditWithFindings}),
        [NPM_OUTDATED_KEY]: commandResult({code: 1, stdout: outdatedWithPackages}),
      }),
    );

    await main(["--json"], {logger, runner, resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS, measureDirectorySize: fixedMeasureDirectorySize});

    const output = parseJsonOutput(sink);
    expect(output["security"]).toEqual({
      critical: 1,
      high: 2,
      moderate: 0,
      low: 0,
      majorOutdated: 1,
      minorOutdated: 1,
      patchOutdated: 1,
    });
  });

  it("renders disk as unavailable when directory measurement fails unexpectedly", async () => {
    const {logger, sink} = createLogger("json");
    const {runner} = createRecordingRunner(baseResponses());

    await main(["--json"], {
      logger,
      runner,
      resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS,
      measureDirectorySize: () => Promise.reject(new Error("disk measurement boom")),
    });

    const output = parseJsonOutput(sink);
    expect(output["disk"]).toBeNull();
    expect(output["git"]).not.toBeNull();
  });

  it("renders health as unavailable when the doctor report is malformed, while siblings still render", async () => {
    const {logger, sink} = createLogger("json");
    const {runner} = createRecordingRunner(withOverrides({[DOCTOR_KEY]: commandResult({stdout: "{bad json"})}));

    await main(["--json"], {logger, runner, resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS, measureDirectorySize: fixedMeasureDirectorySize});

    const output = parseJsonOutput(sink);
    expect(output["health"]).toBeNull();
    expect(output["git"]).not.toBeNull();
    expect(output["security"]).not.toBeNull();
  });
});

// ============================================================================
// --json output
// ============================================================================

describe("main --json", () => {
  it("emits exactly one ANSI-free JSON document with the six preserved top-level keys", async () => {
    const {exitCode, sink} = await runMainHappyPath(["--json"], "json");

    expect(exitCode).toBe(0);
    const output = parseJsonOutput(sink);
    expect(Object.keys(output).toSorted()).toEqual(["disk", "git", "health", "nxEdges", "security", "workspaces"].toSorted());
  });

  it("includes health.summary alongside score and grade", async () => {
    const {sink} = await runMainHappyPath(["--json"], "json");

    const output = parseJsonOutput(sink);
    expect(output["health"]).toEqual({
      score: PASSING_DOCTOR_REPORT.score,
      grade: PASSING_DOCTOR_REPORT.grade,
      summary: PASSING_DOCTOR_REPORT.summary,
    });
  });

  it("propagates a failing doctor summary into the JSON output", async () => {
    const {logger, sink} = createLogger("json");
    const {runner} = createRecordingRunner(withOverrides({[DOCTOR_KEY]: commandResult({code: 1, stdout: JSON.stringify(FAILING_DOCTOR_REPORT)})}));

    await main(["--json"], {logger, runner, resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS, measureDirectorySize: fixedMeasureDirectorySize});

    const output = parseJsonOutput(sink);
    expect(output["health"]).toEqual({
      score: FAILING_DOCTOR_REPORT.score,
      grade: FAILING_DOCTOR_REPORT.grade,
      summary: FAILING_DOCTOR_REPORT.summary,
    });
  });
});

// ============================================================================
// Human dashboard
// ============================================================================

describe("main — human dashboard", () => {
  it("renders meaningful workspace, git, security, disk, and health content only through the logger", async () => {
    const {exitCode, sink} = await runMainHappyPath([], "human");

    expect(exitCode).toBe(0);
    const text = sink.records.map((record) => record.text).join("\n");
    expect(text).toMatch(/Workspaces/);
    expect(text).toMatch(/main/);
    expect(text).toMatch(/Health/);
    expect(text).toMatch(new RegExp(String(PASSING_DOCTOR_REPORT.score)));
    expect(text).toMatch(/Git/);
    expect(text).toMatch(/Security/);
    expect(text).toMatch(/Disk/);
  });

  it("propagates the doctor summary into human output", async () => {
    const {sink} = await runMainHappyPath([], "human");

    const text = sink.records.map((record) => record.text).join("\n");
    expect(text).toMatch(/1 passed, 0 warnings, 0 failures, 0 skipped/);
  });

  it("renders unavailable sections without crashing or fabricating success values", async () => {
    const {logger, sink} = createLogger("human");
    const {runner} = createRecordingRunner(withOverrides({[GIT_BRANCH_KEY]: commandResult({code: 1, stdout: ""})}));

    const exitCode = await main([], {
      logger,
      runner,
      resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS,
      measureDirectorySize: fixedMeasureDirectorySize,
    });

    expect(exitCode).toBe(0);
    const text = sink.records.map((record) => record.text).join("\n");
    expect(text).toMatch(/unavailable/);
  });
});

// ============================================================================
// Direct entrypoint smoke
// ============================================================================

describe("direct entrypoint", () => {
  const statusEntrypoint = fileURLToPath(new URL("./status.ts", import.meta.url));

  function runDirect(args: readonly string[]): Promise<Readonly<{code: number | null; output: string}>> {
    return new Promise((resolveProcess, rejectProcess) => {
      const child = spawn(process.execPath, [statusEntrypoint, ...args], {
        cwd: resolve(statusEntrypoint, "..", ".."),
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk: Buffer) => {
        output += chunk.toString("utf8");
      });
      child.once("error", rejectProcess);
      child.once("close", (code) => {
        resolveProcess({code, output});
      });
    });
  }

  it("emits help and exits 0 for a direct process invocation of --help", async () => {
    const result = await runDirect(["--help"]);

    expect(result.code).toBe(0);
    expect(result.output).toMatch(/Usage: node scripts\/status\.ts/);
  }, 30_000);

  it("emits a diagnostic and exits 1 for a direct process invocation of an unknown flag", async () => {
    const result = await runDirect(["--bogus"]);

    expect(result.code).toBe(1);
    expect(result.output).toMatch(/unknown status option/i);
  }, 30_000);
});
