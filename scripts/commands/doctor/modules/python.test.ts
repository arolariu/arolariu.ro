// @vitest-environment node
/**
 * @fileoverview Contract tests for read-only Python diagnostics sourced from shared PythonFacts.
 * @module scripts/commands/doctor/modules/python.test
 *
 * @remarks
 * `modules/python.ts` is sourced exclusively from `context.inspection.inspect("python")`,
 * `context.requirements` for version policy, and `context.network.get()` for PyPI reachability.
 * These tests never write a fixture file, spawn a command, or construct a `CommandSpec`: they
 * configure a fake inspection session that returns a deterministic `InspectionOutcome<PythonFacts>`,
 * and assert on the produced `DiagnosticResult` rows. `context.probes` is wired to throw if the
 * module ever touches it, and a source guard proves the module never references `context.runner`.
 */

import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {Clock, Effect, Layer} from "effect";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";

import {createRepositoryPaths} from "../../../common/repository-paths.ts";
import type {RepositoryRequirements} from "../../../common/requirements.ts";
import {Inspection} from "../../../inspection/Inspection.ts";
import {inspectionProbeRunner} from "../../../inspection/probes.ts";
import type {RepositoryInspectionSession} from "../../../inspection/repository.ts";
import type {EnvironmentSnapshot} from "../../../platform/Environment.ts";
import {makeTestLayer, runScoped, type TestHarness} from "../../../platform/testing.ts";
import {pythonDoctorModule} from "./python.ts";
import {createDoctorReport} from "../reporter.ts";
import {NetworkProbe, type DiagnosticNetworkResult, type DiagnosticResult, type DoctorContext, type DoctorInput} from "../types.ts";
import type {PythonFacts, PythonInterpreterFact} from "../../../inspection/python.ts";
import type {InspectionOutcome} from "../../../inspection/types.ts";

const PYTHON_IDS = [
  "python.runtime",
  "python.virtual-environment",
  "python.pip",
  "python.requirements",
  "python.conflicts",
  "python.configuration",
  "python.pypi",
] as const;

function validRequirements(): RepositoryRequirements {
  return {
    node: {major: 24, minor: 0, patch: 0},
    npm: {major: 11, minor: 0, patch: 0},
    dotnet: {major: 10, minor: 0, patch: 0},
    python: {major: 3, minor: 12, patch: 0},
    packages: new Map(),
  };
}

function doctorOptions(patch: Partial<DoctorInput> = {}): DoctorInput {
  return {verbose: false, quick: false, ...patch};
}

/** A monotonic clock that advances 1 ms on every read, as the legacy fixture clock did; time never elapses on its own. */
function countingClock(): Clock.Clock {
  let current = 0n;
  const tick = (): bigint => (current += 1_000_000n);
  return {
    currentTimeMillisUnsafe: () => 0,
    currentTimeMillis: Effect.succeed(0),
    currentTimeNanosUnsafe: () => 0n,
    currentTimeNanos: Effect.succeed(0n),
    monotonicTimeNanosUnsafe: tick,
    monotonicTimeNanos: Effect.sync(tick),
    sleep: () => Effect.never,
  };
}

/**
 * Wraps a session so every inspected key is recorded.
 *
 * @param session - The harness session.
 * @param inspected - Receives every inspected key, in order.
 * @returns The recording session.
 */
function recordingSession(session: RepositoryInspectionSession, inspected: string[]): RepositoryInspectionSession {
  return {
    ...session,
    inspect: (key) => {
      inspected.push(key);
      return session.inspect(key);
    },
  };
}

/** Immutable environment snapshot every fixture context observes. */
function fixtureEnvironment(variables: Readonly<Record<string, string | undefined>> = {}): EnvironmentSnapshot {
  return {
    variables,
    cwd: "C:\\fixture\\arolariu.ro",
    executablePath: "C:\\Program Files\\nodejs\\node.exe",
    platform: "win32",
    architecture: "x64",
    stdinIsTTY: false,
    stdoutIsTTY: false,
    isCI: false,
  };
}

function selectedInterpreter(): PythonInterpreterFact {
  return {command: "py", prefixArgs: ["-3.12"], version: "3.12.6"};
}

function healthyPythonFacts(overrides: Readonly<Partial<PythonFacts>> = {}): PythonFacts {
  return {
    interpreters: [
      {command: "py", prefixArgs: ["-3.12"], version: "3.12.6"},
      {command: "python3.12", prefixArgs: [], version: "3.12.6"},
    ],
    selected: selectedInterpreter(),
    virtualEnvironment: {exists: true, compatible: true, version: "3.12.6"},
    pip: {available: true, version: "24.0", conflicts: []},
    requirements: {
      declared: [
        {name: "requests", specifier: "2.31.0", source: "sites/exp.arolariu.ro/requirements.txt"},
        {name: "pytest", specifier: "8.3.2", source: "sites/exp.arolariu.ro/requirements-dev.txt"},
      ],
      unverifiable: [],
      mismatches: [],
    },
    configurationIssues: [],
    ...overrides,
  };
}

function resultIds(results: readonly DiagnosticResult[]): readonly string[] {
  return results.map((r) => r.id);
}

function resultById(results: readonly DiagnosticResult[], id: string): DiagnosticResult {
  const found = results.find((r) => r.id === id);
  if (found === undefined) {
    throw new Error(`Diagnostic '${id}' was not produced.`);
  }
  return found;
}

interface PythonFixture {
  /** Runs the module once against the fixture. */
  readonly run: () => Promise<readonly DiagnosticResult[]>;
  /** Every inspected key, in order. */
  readonly inspected: readonly string[];
  /** The harness; its process calls must stay empty. */
  readonly harness: TestHarness;
  /** Records every network probe request. */
  readonly networkGet: Mock<NetworkProbe["Service"]["get"]>;
}

function createPythonFixture(
  input: Readonly<{
    options?: Partial<DoctorInput>;
    requirements?: RepositoryRequirements | "invalid";
    outcome?: InspectionOutcome<PythonFacts>;
    networkResult?: DiagnosticNetworkResult;
    env?: Readonly<Record<string, string | undefined>>;
  }> = {},
): PythonFixture {
  const outcome: InspectionOutcome<PythonFacts> = input.outcome ?? {
    kind: "available",
    value: healthyPythonFacts(),
    durationMs: 0,
  };

  const harness = makeTestLayer({inspection: {python: outcome}, environment: fixtureEnvironment(input.env ?? {})});
  const networkGet = vi.fn<NetworkProbe["Service"]["get"]>(() =>
    Effect.succeed<DiagnosticNetworkResult>(
      input.networkResult ?? {
        status: "reachable",
        statusCode: 200,
        durationMs: 3,
        body: JSON.stringify({info: {name: "pip"}}),
      },
    ),
  );

  const inspected: string[] = [];
  const paths = createRepositoryPaths(process.cwd());
  const layer = Layer.merge(harness.layer, Layer.succeed(NetworkProbe, NetworkProbe.of({get: networkGet})));
  const run = (): Promise<readonly DiagnosticResult[]> =>
    runScoped(
      Effect.gen(function* () {
        const session = yield* (yield* Inspection).session({profile: "full", paths});
        const context: DoctorContext = {
          options: doctorOptions(input.options),
          paths,
          requirements:
            input.requirements === "invalid"
              ? {status: "invalid", errors: ["pyproject.toml uses unsupported syntax"]}
              : {status: "valid", requirements: input.requirements ?? validRequirements()},
          inspection: recordingSession(session, inspected),
          probes: inspectionProbeRunner,
        };
        return yield* Effect.provideService(pythonDoctorModule.run(context), Clock.Clock, countingClock());
      }),
      layer,
    );

  return {run, inspected, harness, networkGet};
}

afterEach(() => {
  vi.restoreAllMocks();
});

/** Strips block and line comments so source-guard assertions never match prose in doc comments. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/[^\n]*/gu, "");
}

describe("source guards", () => {
  const source = stripComments(readFileSync(resolve(process.cwd(), "scripts", "commands", "doctor", "modules", "python.ts"), "utf8"));

  it("never touches context.runner", () => {
    expect(source).not.toMatch(/context\.runner/u);
  });

  it("never touches context.probes", () => {
    expect(source).not.toMatch(/context\.probes/u);
  });

  it("never imports or constructs CommandSpec", () => {
    expect(source).not.toMatch(/CommandSpec/u);
  });

  it("never imports node:fs or node:fs/promises", () => {
    expect(source).not.toMatch(/from\s+["']node:fs(?:\/promises)?["']/u);
  });

  it("never constructs python or pip commands", () => {
    expect(source).not.toMatch(/command:\s*["']py["']/u);
    expect(source).not.toMatch(/command:\s*["']python/u);
    expect(source).not.toMatch(/command:\s*["']pip/u);
    expect(source).not.toMatch(/\.venv/u);
  });

  it("does not use the CI environment variable to alter behavior", () => {
    expect(source).not.toMatch(/\bCI\b.*=\s*["']true["']/u);
    expect(source).not.toMatch(/process\.env\.CI/u);
  });
});

describe("pythonDoctorModule", () => {
  it("returns every stable python check in order for a healthy baseline", async () => {
    const fixture = createPythonFixture();

    const results = await fixture.run();

    expect(resultIds(results)).toEqual([...PYTHON_IDS]);
    for (const result of results) {
      expect(result.status, `${result.id} should pass`).toBe("pass");
      expect(result.module).toBe("python");
    }
    expect(fixture.inspected).toEqual(["python"]);
  });

  it("never calls context.probes in normal mode", async () => {
    const fixture = createPythonFixture();

    await fixture.run();

    expect(fixture.harness.processCalls()).toEqual([]);
  });

  it("never calls context.probes in quick mode", async () => {
    const fixture = createPythonFixture({options: {quick: true}});

    await fixture.run();

    expect(fixture.harness.processCalls()).toEqual([]);
  });

  // --- Runtime ---

  it("passes python.runtime when a compatible interpreter is selected", async () => {
    const fixture = createPythonFixture();

    const results = await fixture.run();

    const runtime = resultById(results, "python.runtime");
    expect(runtime.status).toBe("pass");
    expect(runtime.evidence.join("\n")).not.toMatch(/[A-Z]:\\/u);
  });

  it("reports multiple interpreter candidates in evidence", async () => {
    const fixture = createPythonFixture();

    const results = await fixture.run();

    const runtime = resultById(results, "python.runtime");
    expect(runtime.evidence.join("\n")).toContain("2");
  });

  it("fails python.runtime when no selected interpreter exists", async () => {
    const {selected: _selected, ...noSelectedFacts} = healthyPythonFacts();
    const fixture = createPythonFixture({outcome: {kind: "available", value: noSelectedFacts as PythonFacts, durationMs: 0}});

    const results = await fixture.run();

    expect(resultById(results, "python.runtime").status).toBe("fail");
  });

  it("passes python.runtime when no interpreters exist but a selected one does", async () => {
    const facts = healthyPythonFacts({interpreters: [], selected: selectedInterpreter()});
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    expect(resultById(results, "python.runtime").status).toBe("pass");
  });

  // --- Virtual Environment ---

  it("passes python.virtual-environment when the venv exists and is compatible", async () => {
    const fixture = createPythonFixture();

    const results = await fixture.run();

    expect(resultById(results, "python.virtual-environment").status).toBe("pass");
  });

  it("fails python.virtual-environment when the venv does not exist", async () => {
    const facts = healthyPythonFacts({virtualEnvironment: {exists: false, compatible: false}});
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const venv = resultById(results, "python.virtual-environment");
    expect(venv.status).toBe("fail");
    expect(venv.summary).toContain("not found");
  });

  it("fails python.virtual-environment when the venv exists but is incompatible", async () => {
    const facts = healthyPythonFacts({virtualEnvironment: {exists: true, compatible: false, version: "3.10.1"}});
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const venv = resultById(results, "python.virtual-environment");
    expect(venv.status).toBe("fail");
    expect(venv.summary).toContain("incompatible");
  });

  it("does not output venv absolute paths in evidence", async () => {
    const facts = healthyPythonFacts({
      virtualEnvironment: {exists: true, compatible: true, interpreterPath: "C:\\checkout\\.venv\\Scripts\\python.exe", version: "3.12.6"},
    });
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const venv = resultById(results, "python.virtual-environment");
    expect(venv.evidence.join("\n")).not.toMatch(/[A-Z]:\\/u);
  });

  // --- Pip ---

  it("passes python.pip when pip is available", async () => {
    const fixture = createPythonFixture();

    const results = await fixture.run();

    expect(resultById(results, "python.pip").status).toBe("pass");
  });

  it("fails python.pip when pip is unavailable", async () => {
    const facts = healthyPythonFacts({pip: {available: false, conflicts: []}});
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    expect(resultById(results, "python.pip").status).toBe("fail");
  });

  it("skips python.pip when the venv is absent", async () => {
    const facts = healthyPythonFacts({virtualEnvironment: {exists: false, compatible: false}});
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    expect(resultById(results, "python.pip").status).toBe("skipped");
  });

  // --- Requirements ---

  it("passes python.requirements when all exact pins match", async () => {
    const fixture = createPythonFixture();

    const results = await fixture.run();

    expect(resultById(results, "python.requirements").status).toBe("pass");
  });

  it("fails python.requirements when mismatches exist", async () => {
    const facts = healthyPythonFacts({
      requirements: {
        declared: [{name: "requests", specifier: "2.31.0", source: "requirements.txt"}],
        unverifiable: [],
        mismatches: ["requests requires 2.31.0 but 2.30.0 is installed."],
      },
    });
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const req = resultById(results, "python.requirements");
    expect(req.status).toBe("fail");
    expect(req.evidence.join("\n")).toContain("2.30.0");
  });

  it("warns python.requirements when unverifiable entries exist but no mismatches", async () => {
    const facts = healthyPythonFacts({
      requirements: {
        declared: [{name: "requests", specifier: "2.31.0", source: "requirements.txt"}],
        unverifiable: ["requirements.txt:3 declares 'opentelemetry' with non-exact specifier."],
        mismatches: [],
      },
    });
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const req = resultById(results, "python.requirements");
    expect(req.status).toBe("warn");
    expect(req.evidence.join("\n")).toContain("opentelemetry");
  });

  it("passes python.requirements when no requirements are declared", async () => {
    const facts = healthyPythonFacts({
      requirements: {declared: [], unverifiable: [], mismatches: []},
    });
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    expect(resultById(results, "python.requirements").status).toBe("pass");
  });

  it("skips python.requirements when the venv is absent", async () => {
    const facts = healthyPythonFacts({virtualEnvironment: {exists: false, compatible: false}});
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    expect(resultById(results, "python.requirements").status).toBe("skipped");
  });

  // --- Conflicts ---

  it("passes python.conflicts when there are no conflicts", async () => {
    const fixture = createPythonFixture();

    const results = await fixture.run();

    expect(resultById(results, "python.conflicts").status).toBe("pass");
  });

  it("warns python.conflicts when conflicts are reported", async () => {
    const facts = healthyPythonFacts({
      pip: {available: true, version: "24.0", conflicts: ["pip reported a dependency conflict for 'requests'."]},
    });
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const conflicts = resultById(results, "python.conflicts");
    expect(conflicts.status).toBe("warn");
    expect(conflicts.evidence.join("\n")).toContain("requests");
  });

  it("bounds conflicts beyond evidence limits", async () => {
    const many = Array.from({length: 10}, (_, i) => `Conflict ${String(i)}`);
    const facts = healthyPythonFacts({pip: {available: true, version: "24.0", conflicts: many}});
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const conflicts = resultById(results, "python.conflicts");
    expect(conflicts.evidence.length).toBeLessThanOrEqual(6);
  });

  it("skips python.conflicts when the venv is absent", async () => {
    const facts = healthyPythonFacts({virtualEnvironment: {exists: false, compatible: false}});
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    expect(resultById(results, "python.conflicts").status).toBe("skipped");
  });

  // --- Configuration ---

  it("passes python.configuration when there are no issues", async () => {
    const fixture = createPythonFixture();

    const results = await fixture.run();

    expect(resultById(results, "python.configuration").status).toBe("pass");
  });

  it("fails python.configuration when issues exist", async () => {
    const facts = healthyPythonFacts({configurationIssues: ["config.docker.json is missing required key 'Site:Name'."]});
    const fixture = createPythonFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const config = resultById(results, "python.configuration");
    expect(config.status).toBe("fail");
    expect(config.evidence.join("\n")).toContain("Site:Name");
  });

  // --- PyPI ---

  it("skips python.pypi in quick mode without probing the network", async () => {
    const fixture = createPythonFixture({options: {quick: true}});

    const results = await fixture.run();

    expect(resultById(results, "python.pypi").status).toBe("skipped");
    expect(fixture.networkGet).not.toHaveBeenCalled();
  });

  it("passes python.pypi for a healthy PyPI response", async () => {
    const fixture = createPythonFixture();

    const results = await fixture.run();

    expect(resultById(results, "python.pypi").status).toBe("pass");
  });

  it("skips python.pypi when the network probe is unreachable", async () => {
    const fixture = createPythonFixture({
      networkResult: {status: "unavailable", durationMs: 2, error: "getaddrinfo ENOTFOUND pypi.org"},
    });

    const results = await fixture.run();

    expect(resultById(results, "python.pypi").status).toBe("skipped");
  });

  it("warns python.pypi when the response status code is not 200", async () => {
    const fixture = createPythonFixture({
      networkResult: {status: "reachable", statusCode: 503, durationMs: 5, body: "Service Unavailable"},
    });

    const results = await fixture.run();

    expect(resultById(results, "python.pypi").status).toBe("warn");
  });

  it("warns python.pypi when the response body is malformed", async () => {
    const fixture = createPythonFixture({
      networkResult: {status: "reachable", statusCode: 200, durationMs: 5, body: "not-json"},
    });

    const results = await fixture.run();

    expect(resultById(results, "python.pypi").status).toBe("warn");
  });

  // --- Degraded outcomes ---

  it("produces degraded results when python inspection is unavailable", async () => {
    const fixture = createPythonFixture({
      outcome: {kind: "unavailable", reason: "The Python project root is missing.", durationMs: 0},
    });

    const results = await fixture.run();

    expect(resultIds(results)).toEqual([...PYTHON_IDS]);
    for (const result of results) {
      if (result.id === "python.pypi") {
        expect(result.status === "pass" || result.status === "skipped" || result.status === "warn").toBe(true);
      } else {
        expect(result.status, `${result.id} should fail on unavailable`).toBe("fail");
      }
    }
  });

  it("produces degraded results when python inspection is invalid", async () => {
    const issues = Array.from({length: 7}, (_, i) => `Python issue ${String(i)}.`);
    const fixture = createPythonFixture({outcome: {kind: "invalid", issues, durationMs: 0}});

    const results = await fixture.run();

    for (const result of results) {
      if (result.id === "python.pypi") {
        continue;
      }
      expect(result.status).toBe("fail");
    }
    expect(() => createDoctorReport(results, "2026-09-01T00:00:00.000Z")).not.toThrow();
  });

  it("preserves independent PyPI behavior when facts are unavailable in normal mode", async () => {
    const fixture = createPythonFixture({
      outcome: {kind: "unavailable", reason: "test", durationMs: 0},
    });

    const results = await fixture.run();

    expect(resultById(results, "python.pypi").status).toBe("pass");
    expect(fixture.networkGet).toHaveBeenCalled();
  });

  it("skips PyPI in quick mode even when facts are unavailable", async () => {
    const fixture = createPythonFixture({
      options: {quick: true},
      outcome: {kind: "unavailable", reason: "test", durationMs: 0},
    });

    const results = await fixture.run();

    expect(resultById(results, "python.pypi").status).toBe("skipped");
    expect(fixture.networkGet).not.toHaveBeenCalled();
  });

  // --- CI environment ---

  it("produces identical results with CI=true and CI=false", async () => {
    const factsCi = createPythonFixture({env: {CI: "true"}});
    const resultsCi = await factsCi.run();

    const factsNoCi = createPythonFixture({env: {CI: "false"}});
    const resultsNoCi = await factsNoCi.run();

    expect(resultIds(resultsCi)).toEqual(resultIds(resultsNoCi));
    for (const [index, result] of resultsCi.entries()) {
      expect(result.status).toBe(resultsNoCi[index]?.status);
    }
  });
});
