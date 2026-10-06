// @vitest-environment node
/**
 * @fileoverview Contract tests for read-only standalone SvelteKit diagnostics.
 * @module scripts/commands/doctor/modules/svelte.test
 *
 * @remarks
 * `modules/svelte.ts` is sourced exclusively from `context.inspection.inspect("svelte.cv")` and
 * `context.inspection.inspect("svelte.status")`. These tests never write a fixture file, spawn a
 * command, or construct a `CommandSpec`: they configure a fake inspection session that returns a
 * deterministic `InspectionOutcome<SvelteFacts>` per project, and assert on the produced
 * `DiagnosticResult` rows. `context.runner` and `context.probes` are wired to throw if the module
 * ever touches them.
 */

import {readFile} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {Clock, Effect, Layer} from "effect";
import {afterEach, describe, expect, it, vi} from "vitest";

import {createRepositoryPaths} from "../../../common/repository-paths.ts";
import type {RepositoryRequirements} from "../../../common/requirements.ts";
import {Inspection} from "../../../inspection/Inspection.ts";
import {inspectionProbeRunner} from "../../../inspection/probes.ts";
import type {RepositoryInspectionSession} from "../../../inspection/repository.ts";
import type {EnvironmentSnapshot} from "../../../platform/Environment.ts";
import {makeTestLayer, runScoped, type TestHarness} from "../../../platform/testing.ts";
import {NetworkProbe} from "../NetworkProbe.ts";
import {createDoctorReport} from "../reporter.ts";
import {svelteDoctorModule} from "./svelte.ts";
import type {DiagnosticResult, DoctorContext, DoctorInput} from "../types.ts";
import type {SvelteFacts} from "../../../inspection/frontend.ts";
import type {InspectionOutcome} from "../../../inspection/types.ts";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = resolve(moduleDirectory, "__fixtures__", "doctor-svelte");

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

/** A network probe that dies on any request: these modules never reach the network. */
const unscriptedNetwork = Layer.succeed(
  NetworkProbe,
  NetworkProbe.of({get: (url) => Effect.die(new Error(`unscripted network probe: ${url.href}`))}),
);

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

function healthySvelteFacts(id: "cv" | "status"): SvelteFacts {
  return {
    id,
    packageIssues: [],
    nodeEngine: id === "cv" ? ">=22.8" : ">=24",
    scriptIssues: [],
    generatedConfigExists: true,
    adapterSpecifier: "svelte-adapter-azure-swa",
    adapterIssues: [],
  };
}

function availableOutcome(facts: SvelteFacts): InspectionOutcome<SvelteFacts> {
  return {kind: "available", value: facts, durationMs: 0};
}

/** Strips block and line comments so source-guard assertions never match prose in doc comments. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/[^\n]*/gu, "");
}

function resultIds(results: readonly DiagnosticResult[]): readonly string[] {
  return results.map((result) => result.id);
}

function resultById(results: readonly DiagnosticResult[], id: string): DiagnosticResult {
  const found = results.find((result) => result.id === id);
  if (found === undefined) {
    throw new Error(`Diagnostic '${id}' was not produced.`);
  }
  return found;
}

interface SvelteFixture {
  /** Runs the module once against the fixture. */
  readonly run: () => Promise<readonly DiagnosticResult[]>;
  /** Every inspected key, in order. */
  readonly inspected: readonly string[];
  /** The harness; its process calls must stay empty. */
  readonly harness: TestHarness;
}

function createSvelteFixture(
  input: Readonly<{
    options?: Partial<DoctorInput>;
    requirementsValid?: boolean;
    cvOutcome?: InspectionOutcome<SvelteFacts>;
    statusOutcome?: InspectionOutcome<SvelteFacts>;
  }> = {},
): SvelteFixture {
  const cvOutcome = input.cvOutcome ?? availableOutcome(healthySvelteFacts("cv"));
  const statusOutcome = input.statusOutcome ?? availableOutcome(healthySvelteFacts("status"));
  const harness = makeTestLayer({inspection: {"svelte.cv": cvOutcome, "svelte.status": statusOutcome}, environment: fixtureEnvironment()});
  const requirements: DoctorContext["requirements"] =
    input.requirementsValid === false
      ? {status: "invalid", errors: [".nvmrc disagrees with package.json#engines.node"]}
      : {status: "valid", requirements: validRequirements()};
  const inspected: string[] = [];
  const paths = createRepositoryPaths(fixtureRoot);
  const options = doctorOptions(input.options);
  const run = (): Promise<readonly DiagnosticResult[]> =>
    runScoped(
      Effect.gen(function* () {
        const session = yield* (yield* Inspection).session({profile: "full", paths});
        const context: DoctorContext = {
          options,
          paths,
          requirements,
          inspection: recordingSession(session, inspected),
          probes: inspectionProbeRunner,
        };
        return yield* Effect.provideService(svelteDoctorModule.run(context), Clock.Clock, countingClock());
      }),
      Layer.merge(harness.layer, unscriptedNetwork),
    );

  return {run, inspected, harness};
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("svelteDoctorModule", () => {
  it("declares the facts the command prewarms so they are never inspected serially", () => {
    expect(svelteDoctorModule.facts).toEqual(["svelte.cv", "svelte.status"]);
  });

  it("returns every stable svelte check in CV-then-status order for a healthy baseline", async () => {
    const fixture = createSvelteFixture();

    const results = await fixture.run();

    expect(resultIds(results)).toEqual([
      "svelte.cv.packages",
      "svelte.cv.node-engine",
      "svelte.cv.scripts",
      "svelte.cv.generated-state",
      "svelte.cv.adapter",
      "svelte.status.packages",
      "svelte.status.node-engine",
      "svelte.status.scripts",
      "svelte.status.generated-state",
      "svelte.status.adapter",
    ]);
    for (const result of results) {
      expect(result.status, `${result.id} should pass`).toBe("pass");
    }
    expect(fixture.inspected).toContain("svelte.cv");
    expect(fixture.inspected).toContain("svelte.status");
    expect(fixture.inspected).toHaveLength(2);
  });

  it("uses package-qualified names to distinguish CV and status diagnostics", async () => {
    const fixture = createSvelteFixture();

    const results = await fixture.run();

    expect(results.map(({name}) => name)).toEqual([
      "@arolariu/cv: SvelteKit ecosystem packages",
      "@arolariu/cv: SvelteKit Node.js engine compatibility",
      "@arolariu/cv: SvelteKit lifecycle scripts",
      "@arolariu/cv: SvelteKit generated local state",
      "@arolariu/cv: SvelteKit adapter configuration",
      "@arolariu/status: SvelteKit ecosystem packages",
      "@arolariu/status: SvelteKit Node.js engine compatibility",
      "@arolariu/status: SvelteKit lifecycle scripts",
      "@arolariu/status: SvelteKit generated local state",
      "@arolariu/status: SvelteKit adapter configuration",
    ]);
  });

  it("produces degraded results when cv inspection is unavailable", async () => {
    const fixture = createSvelteFixture({
      cvOutcome: {kind: "unavailable", reason: "The CV Svelte inspection worker crashed.", durationMs: 0},
    });

    const results = await fixture.run();

    for (const id of [
      "svelte.cv.packages",
      "svelte.cv.node-engine",
      "svelte.cv.scripts",
      "svelte.cv.generated-state",
      "svelte.cv.adapter",
    ]) {
      const result = resultById(results, id);
      expect(result.status, `${id} should fail`).toBe("fail");
      expect(result.evidence).toContain("The CV Svelte inspection worker crashed.");
    }
    // The independent status project is unaffected.
    for (const id of [
      "svelte.status.packages",
      "svelte.status.node-engine",
      "svelte.status.scripts",
      "svelte.status.generated-state",
      "svelte.status.adapter",
    ]) {
      expect(resultById(results, id).status, `${id} should pass`).toBe("pass");
    }
    expect(resultById(results, "svelte.cv.node-engine").name).toBe("@arolariu/cv: SvelteKit Node.js engine compatibility");
  });

  it("produces degraded results when status inspection is invalid", async () => {
    const issues = Array.from({length: 7}, (_, index) => `Status Svelte inspection issue ${String(index)}.`);
    const fixture = createSvelteFixture({statusOutcome: {kind: "invalid", issues, durationMs: 0}});

    const results = await fixture.run();

    for (const id of [
      "svelte.status.packages",
      "svelte.status.node-engine",
      "svelte.status.scripts",
      "svelte.status.generated-state",
      "svelte.status.adapter",
    ]) {
      const result = resultById(results, id);
      expect(result.status, `${id} should fail`).toBe("fail");
      expect(result.evidence).toContain("Status Svelte inspection issue 0.");
      expect(result.evidence).toContain("Status Svelte inspection issue 3.");
      expect(result.evidence).not.toContain("Status Svelte inspection issue 4.");
      expect(result.evidence.at(-1)).toBe("3 additional evidence entries omitted.");
      expect(result.potentialCauses).toHaveLength(5);
      expect(result.potentialCauses.map(({cause}) => cause)).not.toContain("3 additional evidence entries omitted.");
    }
    for (const id of [
      "svelte.cv.packages",
      "svelte.cv.node-engine",
      "svelte.cv.scripts",
      "svelte.cv.generated-state",
      "svelte.cv.adapter",
    ]) {
      expect(resultById(results, id).status, `${id} should pass`).toBe("pass");
    }
    expect(resultById(results, "svelte.status.packages").name).toBe("@arolariu/status: SvelteKit ecosystem packages");
    expect(() => createDoctorReport(results, "2026-08-31T00:00:00.000Z")).not.toThrow();
  });

  it("detects package issues from SvelteFacts", async () => {
    const cvFacts: SvelteFacts = {...healthySvelteFacts("cv"), packageIssues: ["svelte-adapter-azure-swa is not installed."]};
    const fixture = createSvelteFixture({cvOutcome: availableOutcome(cvFacts)});

    const results = await fixture.run();

    const packages = resultById(results, "svelte.cv.packages");
    expect(packages.status).toBe("fail");
    expect(packages.rootCause).toBe("svelte-adapter-azure-swa is not installed.");
  });

  it("skips node-engine check when requirements are invalid", async () => {
    const fixture = createSvelteFixture({requirementsValid: false});

    const results = await fixture.run();

    expect(resultById(results, "svelte.cv.node-engine").status).toBe("skipped");
    expect(resultById(results, "svelte.status.node-engine").status).toBe("skipped");
    expect(resultById(results, "svelte.cv.node-engine").name).toBe("@arolariu/cv: SvelteKit Node.js engine compatibility");
    expect(resultById(results, "svelte.status.node-engine").name).toBe("@arolariu/status: SvelteKit Node.js engine compatibility");
    // Independent checks still evaluate from the available facts.
    expect(resultById(results, "svelte.cv.packages").status).toBe("pass");
    expect(resultById(results, "svelte.status.scripts").status).toBe("pass");
  });

  it("detects node engine missing from facts", async () => {
    const {nodeEngine: _omittedNodeEngine, ...rest} = healthySvelteFacts("cv");
    const cvFacts: SvelteFacts = rest;
    const fixture = createSvelteFixture({cvOutcome: availableOutcome(cvFacts)});

    const results = await fixture.run();

    const nodeEngine = resultById(results, "svelte.cv.node-engine");
    expect(nodeEngine.status).toBe("fail");
    expect(nodeEngine.summary).toContain("does not declare a valid Node.js engine requirement");
  });

  it("detects root requirement not satisfying site engine", async () => {
    const statusFacts: SvelteFacts = {...healthySvelteFacts("status"), nodeEngine: ">=26"};
    const fixture = createSvelteFixture({statusOutcome: availableOutcome(statusFacts)});

    const results = await fixture.run();

    const nodeEngine = resultById(results, "svelte.status.node-engine");
    expect(nodeEngine.status).toBe("fail");
    expect(nodeEngine.rootCause).toContain("does not satisfy this site's package.json#engines.node requirement >=26");
  });

  it("detects script issues", async () => {
    const statusFacts: SvelteFacts = {...healthySvelteFacts("status"), scriptIssues: ["package.json is missing a 'check' script."]};
    const fixture = createSvelteFixture({statusOutcome: availableOutcome(statusFacts)});

    const results = await fixture.run();

    const scripts = resultById(results, "svelte.status.scripts");
    expect(scripts.status).toBe("fail");
    expect(scripts.rootCause).toBe("package.json is missing a 'check' script.");
  });

  it("detects missing generated config", async () => {
    const cvFacts: SvelteFacts = {...healthySvelteFacts("cv"), generatedConfigExists: false};
    const fixture = createSvelteFixture({cvOutcome: availableOutcome(cvFacts)});

    const results = await fixture.run();

    const generatedState = resultById(results, "svelte.cv.generated-state");
    expect(generatedState.status).toBe("fail");
    expect(generatedState.summary).toContain(".svelte-kit/tsconfig.json is missing");
  });

  it("detects adapter issues", async () => {
    const statusFacts: SvelteFacts = {
      ...healthySvelteFacts("status"),
      adapterIssues: ["svelte-adapter-azure-swa is declared but not installed."],
    };
    const fixture = createSvelteFixture({statusOutcome: availableOutcome(statusFacts)});

    const results = await fixture.run();

    const adapter = resultById(results, "svelte.status.adapter");
    expect(adapter.status).toBe("fail");
    expect(adapter.rootCause).toBe("svelte-adapter-azure-swa is declared but not installed.");
  });

  it("detects adapter specifier missing with no issues", async () => {
    const {adapterSpecifier: _omittedAdapterSpecifier, ...rest} = healthySvelteFacts("cv");
    const cvFacts: SvelteFacts = {...rest, adapterIssues: []};
    const fixture = createSvelteFixture({cvOutcome: availableOutcome(cvFacts)});

    const results = await fixture.run();

    const adapter = resultById(results, "svelte.cv.adapter");
    expect(adapter.status).toBe("fail");
    expect(adapter.summary).toContain("does not configure a recognizable kit.adapter");
  });

  it("never invokes context.probes", async () => {
    const fixture = createSvelteFixture();

    await fixture.run();

    expect(fixture.harness.processCalls()).toEqual([]);
  });

  it("never imports CommandSpec", async () => {
    const source = await readFile(resolve(moduleDirectory, "svelte.ts"), "utf8");
    const code = stripComments(source);

    expect(code).not.toContain("context.runner");
    expect(code).not.toMatch(/\bCommandSpec\b/u);
    expect(code).not.toMatch(/new\s+CommandSpec/u);
    expect(code).not.toContain("npm ls");
  });
});
