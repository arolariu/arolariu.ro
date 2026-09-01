// @vitest-environment node
/**
 * @fileoverview Contract tests for read-only standalone SvelteKit diagnostics.
 * @module scripts.doctor.svelte.test
 *
 * @remarks
 * `doctor.svelte.ts` is sourced exclusively from `context.inspection.inspect("svelte.cv")` and
 * `context.inspection.inspect("svelte.status")`. These tests never write a fixture file, spawn a
 * command, or construct a `CommandSpec`: they configure a fake inspection session that returns a
 * deterministic `InspectionOutcome<SvelteFacts>` per project, and assert on the produced
 * `DiagnosticResult` rows. `context.runner` and `context.probes` are wired to throw if the module
 * ever touches them.
 */

import {readFile} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {afterEach, describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {createDoctorReport} from "./doctor.reporter.ts";
import {svelteDoctorModule} from "./doctor.svelte.ts";
import type {DiagnosticNetworkResult, DiagnosticResult, DoctorContext, DoctorRunOptions} from "./doctor.types.ts";
import type {SvelteFacts} from "./inspection/frontend.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";

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

function doctorOptions(patch: Partial<DoctorRunOptions> = {}): DoctorRunOptions {
  return {verbose: false, quick: false, ...patch};
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
  readonly context: DoctorContext;
  readonly inspect: ReturnType<typeof vi.fn<(key: string) => Promise<InspectionOutcome<unknown>>>>;
  readonly probeRun: ReturnType<typeof vi.fn<(...args: readonly unknown[]) => Promise<never>>>;
}

function createSvelteFixture(
  input: Readonly<{
    options?: Partial<DoctorRunOptions>;
    requirementsValid?: boolean;
    cvOutcome?: InspectionOutcome<SvelteFacts>;
    statusOutcome?: InspectionOutcome<SvelteFacts>;
  }> = {},
): SvelteFixture {
  const cvOutcome = input.cvOutcome ?? availableOutcome(healthySvelteFacts("cv"));
  const statusOutcome = input.statusOutcome ?? availableOutcome(healthySvelteFacts("status"));

  const inspect = vi.fn(async (key: string): Promise<InspectionOutcome<unknown>> => {
    if (key === "svelte.cv") {
      return cvOutcome;
    }
    if (key === "svelte.status") {
      return statusOutcome;
    }
    throw new Error(`Unexpected inspection key requested: '${key}'.`);
  });

  const probeRun = vi.fn(async (): Promise<never> => {
    throw new Error("doctor.svelte.ts must never call context.probes.");
  });

  const sink = new InMemoryLoggerSink();
  let now = 0;
  const context: DoctorContext = {
    options: doctorOptions(input.options),
    paths: createRepositoryPaths(fixtureRoot),
    requirements:
      input.requirementsValid === false
        ? {status: "invalid", errors: [".nvmrc disagrees with package.json#engines.node"]}
        : {status: "valid", requirements: validRequirements()},
    network: {
      get: vi.fn(async (): Promise<DiagnosticNetworkResult> => ({status: "reachable", statusCode: 200, durationMs: 1})),
    },
    logger: new MonorepositoryConsoleLogger("doctor::svelte", {color: false, sink}),
    platform: "win32",
    arch: "x64",
    env: {},
    now: () => ++now,
    probes: {run: probeRun as unknown as DoctorContext["probes"]["run"]},
    inspection: {
      inspect: inspect as unknown as RepositoryInspectionSession["inspect"],
      invalidate: vi.fn(),
      updateInfrastructureEngine: vi.fn(),
    } as RepositoryInspectionSession,
  };

  return {context, inspect, probeRun};
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("svelteDoctorModule", () => {
  it("returns every stable svelte check in CV-then-status order for a healthy baseline", async () => {
    const fixture = createSvelteFixture();

    const results = await svelteDoctorModule.run(fixture.context);

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
    expect(fixture.inspect).toHaveBeenCalledWith("svelte.cv");
    expect(fixture.inspect).toHaveBeenCalledWith("svelte.status");
    expect(fixture.inspect).toHaveBeenCalledTimes(2);
  });

  it("produces degraded results when cv inspection is unavailable", async () => {
    const fixture = createSvelteFixture({
      cvOutcome: {kind: "unavailable", reason: "The CV Svelte inspection worker crashed.", durationMs: 0},
    });

    const results = await svelteDoctorModule.run(fixture.context);

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
  });

  it("produces degraded results when status inspection is invalid", async () => {
    const issues = Array.from({length: 7}, (_, index) => `Status Svelte inspection issue ${String(index)}.`);
    const fixture = createSvelteFixture({statusOutcome: {kind: "invalid", issues, durationMs: 0}});

    const results = await svelteDoctorModule.run(fixture.context);

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
    expect(() => createDoctorReport(results, "2026-08-31T00:00:00.000Z")).not.toThrow();
  });

  it("detects package issues from SvelteFacts", async () => {
    const cvFacts: SvelteFacts = {...healthySvelteFacts("cv"), packageIssues: ["svelte-adapter-azure-swa is not installed."]};
    const fixture = createSvelteFixture({cvOutcome: availableOutcome(cvFacts)});

    const results = await svelteDoctorModule.run(fixture.context);

    const packages = resultById(results, "svelte.cv.packages");
    expect(packages.status).toBe("fail");
    expect(packages.rootCause).toBe("svelte-adapter-azure-swa is not installed.");
  });

  it("skips node-engine check when requirements are invalid", async () => {
    const fixture = createSvelteFixture({requirementsValid: false});

    const results = await svelteDoctorModule.run(fixture.context);

    expect(resultById(results, "svelte.cv.node-engine").status).toBe("skipped");
    expect(resultById(results, "svelte.status.node-engine").status).toBe("skipped");
    // Independent checks still evaluate from the available facts.
    expect(resultById(results, "svelte.cv.packages").status).toBe("pass");
    expect(resultById(results, "svelte.status.scripts").status).toBe("pass");
  });

  it("detects node engine missing from facts", async () => {
    const {nodeEngine: _omittedNodeEngine, ...rest} = healthySvelteFacts("cv");
    const cvFacts: SvelteFacts = rest;
    const fixture = createSvelteFixture({cvOutcome: availableOutcome(cvFacts)});

    const results = await svelteDoctorModule.run(fixture.context);

    const nodeEngine = resultById(results, "svelte.cv.node-engine");
    expect(nodeEngine.status).toBe("fail");
    expect(nodeEngine.summary).toContain("does not declare a valid Node.js engine requirement");
  });

  it("detects root requirement not satisfying site engine", async () => {
    const statusFacts: SvelteFacts = {...healthySvelteFacts("status"), nodeEngine: ">=26"};
    const fixture = createSvelteFixture({statusOutcome: availableOutcome(statusFacts)});

    const results = await svelteDoctorModule.run(fixture.context);

    const nodeEngine = resultById(results, "svelte.status.node-engine");
    expect(nodeEngine.status).toBe("fail");
    expect(nodeEngine.rootCause).toContain("does not satisfy this site's package.json#engines.node requirement >=26");
  });

  it("detects script issues", async () => {
    const statusFacts: SvelteFacts = {...healthySvelteFacts("status"), scriptIssues: ["package.json is missing a 'check' script."]};
    const fixture = createSvelteFixture({statusOutcome: availableOutcome(statusFacts)});

    const results = await svelteDoctorModule.run(fixture.context);

    const scripts = resultById(results, "svelte.status.scripts");
    expect(scripts.status).toBe("fail");
    expect(scripts.rootCause).toBe("package.json is missing a 'check' script.");
  });

  it("detects missing generated config", async () => {
    const cvFacts: SvelteFacts = {...healthySvelteFacts("cv"), generatedConfigExists: false};
    const fixture = createSvelteFixture({cvOutcome: availableOutcome(cvFacts)});

    const results = await svelteDoctorModule.run(fixture.context);

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

    const results = await svelteDoctorModule.run(fixture.context);

    const adapter = resultById(results, "svelte.status.adapter");
    expect(adapter.status).toBe("fail");
    expect(adapter.rootCause).toBe("svelte-adapter-azure-swa is declared but not installed.");
  });

  it("detects adapter specifier missing with no issues", async () => {
    const {adapterSpecifier: _omittedAdapterSpecifier, ...rest} = healthySvelteFacts("cv");
    const cvFacts: SvelteFacts = {...rest, adapterIssues: []};
    const fixture = createSvelteFixture({cvOutcome: availableOutcome(cvFacts)});

    const results = await svelteDoctorModule.run(fixture.context);

    const adapter = resultById(results, "svelte.cv.adapter");
    expect(adapter.status).toBe("fail");
    expect(adapter.summary).toContain("does not configure a recognizable kit.adapter");
  });

  it("never invokes context.probes", async () => {
    const fixture = createSvelteFixture();

    await svelteDoctorModule.run(fixture.context);

    expect(fixture.probeRun).not.toHaveBeenCalled();
  });

  it("never imports CommandSpec", async () => {
    const source = await readFile(resolve(moduleDirectory, "doctor.svelte.ts"), "utf8");
    const code = stripComments(source);

    expect(code).not.toContain("context.runner");
    expect(code).not.toMatch(/\bCommandSpec\b/u);
    expect(code).not.toMatch(/new\s+CommandSpec/u);
    expect(code).not.toContain("npm ls");
  });
});
