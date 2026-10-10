// @vitest-environment node
/**
 * @fileoverview Contract tests for read-only React and website diagnostics.
 * @module scripts/commands/doctor/modules/react.test
 *
 * @remarks
 * `modules/react.ts` is sourced exclusively from `context.inspection.inspect("react")`. These
 * tests never write a fixture file, spawn a command, or construct a `CommandSpec`: they configure
 * a fake inspection session that returns a deterministic `InspectionOutcome<ReactFacts>`, and
 * assert on the produced `DiagnosticResult` rows. `context.runner` and `context.probes` are wired
 * to throw if the module ever touches them.
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
import {reactDoctorModule} from "./react.ts";
import {NetworkProbe} from "../NetworkProbe.ts";
import {createDoctorReport} from "../reporter.ts";
import type {DiagnosticResult, DoctorContext, DoctorInput} from "../types.ts";
import type {EnvironmentFacts, ReactFacts} from "../../../inspection/frontend.ts";
import type {InstalledPackageFact, PackageInventoryFacts} from "../../../inspection/packages.ts";
import type {InspectionOutcome} from "../../../inspection/types.ts";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = resolve(moduleDirectory, "__fixtures__", "doctor-react");

const REACT_PACKAGE_VERSIONS: ReadonlyMap<string, string> = new Map([
  ["next", "16.3.0"],
  ["react", "19.2.8"],
  ["react-dom", "19.2.8"],
  ["@arolariu/components", "2.2.0"],
  ["@clerk/nextjs", "7.6.5"],
  ["@docusaurus/core", "3.10.2"],
  ["playwright", "1.62.1"],
]);

function validRequirements(patch: Readonly<{omitPackages?: readonly string[]}> = {}): RepositoryRequirements {
  const omitted = new Set(patch.omitPackages ?? []);
  const packages = new Map(
    [...REACT_PACKAGE_VERSIONS].filter(([name]) => !omitted.has(name)).map(([name, version]) => [name, {name, version}]),
  );
  return {
    node: {major: 24, minor: 0, patch: 0},
    npm: {major: 11, minor: 0, patch: 0},
    dotnet: {major: 10, minor: 0, patch: 0},
    python: {major: 3, minor: 12, patch: 0},
    packages,
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

function healthyEnvironmentFacts(): EnvironmentFacts {
  return {
    syntaxErrors: [],
    presentKeys: ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "SITE_ENV", "SITE_NAME", "SITE_URL", "USE_CDN"],
    missingCoreKeys: [],
    missingAuthenticationKeys: [],
  };
}

function healthyPackageInventoryFacts(overrides: Readonly<Partial<Record<string, InstalledPackageFact>>> = {}): PackageInventoryFacts {
  const installed: Record<string, InstalledPackageFact> = {
    next: {version: "16.3.0"},
    react: {version: "19.2.8"},
    "react-dom": {version: "19.2.8"},
    "@arolariu/components": {version: "2.2.0"},
    "@clerk/nextjs": {version: "7.6.5"},
    "@docusaurus/core": {version: "3.10.2"},
    playwright: {version: "1.62.1"},
    ...overrides,
  };
  return {installed, malformed: []};
}

function healthyReactFacts(overrides: Readonly<Partial<ReactFacts>> = {}): ReactFacts {
  return {
    packages: healthyPackageInventoryFacts(),
    workspaceLinkIssues: [],
    environment: healthyEnvironmentFacts(),
    i18nIssues: [],
    artifactIssues: [],
    playwright: {version: "1.62.1", browsers: ["chromium-1234", "ffmpeg-1011"]},
    frameworkIssues: [],
    ...overrides,
  };
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

interface ReactFixture {
  /** Runs the module once against the fixture. */
  readonly run: () => Promise<readonly DiagnosticResult[]>;
  /** Every inspected key, in order. */
  readonly inspected: readonly string[];
  /** The harness; its process calls must stay empty. */
  readonly harness: TestHarness;
}

function createReactFixture(
  input: Readonly<{
    options?: Partial<DoctorInput>;
    requirements?: RepositoryRequirements | "invalid";
    outcome?: InspectionOutcome<ReactFacts>;
  }> = {},
): ReactFixture {
  const outcome: InspectionOutcome<ReactFacts> = input.outcome ?? {kind: "available", value: healthyReactFacts(), durationMs: 0};
  const harness = makeTestLayer({inspection: {react: outcome}, environment: fixtureEnvironment()});
  const requirements: DoctorContext["requirements"] =
    input.requirements === "invalid"
      ? {status: "invalid", errors: [".nvmrc disagrees with package.json#engines.node"]}
      : {status: "valid", requirements: input.requirements ?? validRequirements()};
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
        return yield* Effect.provideService(reactDoctorModule.run(context), Clock.Clock, countingClock());
      }),
      Layer.merge(harness.layer, unscriptedNetwork),
    );

  return {run, inspected, harness};
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reactDoctorModule", () => {
  it("returns every stable react check in order for a healthy baseline", async () => {
    const fixture = createReactFixture();

    const results = await fixture.run();

    expect(resultIds(results)).toEqual([
      "react.packages",
      "react.workspace-link",
      "react.environment",
      "react.i18n",
      "react.taxonomy-and-licenses",
      "react.playwright",
      "react.framework-config",
    ]);
    for (const result of results) {
      expect(result.status, `${result.id} should pass`).toBe("pass");
    }
    expect(fixture.inspected).toEqual(["react"]);
  });

  it("produces degraded results when react inspection is unavailable", async () => {
    const fixture = createReactFixture({
      outcome: {kind: "unavailable", reason: "The React inspection worker crashed.", durationMs: 0},
    });

    const results = await fixture.run();

    expect(resultIds(results)).toEqual([
      "react.packages",
      "react.workspace-link",
      "react.environment",
      "react.i18n",
      "react.taxonomy-and-licenses",
      "react.playwright",
      "react.framework-config",
    ]);
    for (const result of results) {
      expect(result.status, `${result.id} should fail`).toBe("fail");
      expect(result.evidence).toContain("The React inspection worker crashed.");
    }
  });

  it("produces degraded results when react inspection is invalid", async () => {
    const issues = Array.from({length: 7}, (_, index) => `React inspection issue ${String(index)}.`);
    const fixture = createReactFixture({outcome: {kind: "invalid", issues, durationMs: 0}});

    const results = await fixture.run();

    for (const result of results) {
      expect(result.status).toBe("fail");
      expect(result.evidence).toContain("React inspection issue 0.");
      expect(result.evidence).toContain("React inspection issue 3.");
      expect(result.evidence).not.toContain("React inspection issue 4.");
      expect(result.evidence.at(-1)).toBe("3 additional evidence entries omitted.");
      expect(result.potentialCauses).toHaveLength(5);
      expect(result.potentialCauses.map(({cause}) => cause)).not.toContain("3 additional evidence entries omitted.");
    }
    expect(() => createDoctorReport(results, "2026-08-31T00:00:00.000Z")).not.toThrow();
  });

  it("skips package comparison when requirements are invalid", async () => {
    const fixture = createReactFixture({requirements: "invalid"});

    const results = await fixture.run();

    const packages = resultById(results, "react.packages");
    expect(packages.status).toBe("skipped");
    expect(packages.summary).toContain("invalid");
    const playwright = resultById(results, "react.playwright");
    expect(playwright.status).toBe("skipped");
    // Independent checks still evaluate from the available facts.
    expect(resultById(results, "react.workspace-link").status).toBe("pass");
    expect(resultById(results, "react.environment").status).toBe("pass");
  });

  it("detects version drift in installed packages", async () => {
    const facts = healthyReactFacts({packages: healthyPackageInventoryFacts({react: {version: "19.0.0"}})});
    const fixture = createReactFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const packages = resultById(results, "react.packages");
    expect(packages.status).toBe("fail");
    expect(packages.rootCause).toContain("react installed version '19.0.0' does not match the locked version '19.2.8'");
  });

  it("detects missing registry dependency for @arolariu/components", async () => {
    const facts = healthyReactFacts({workspaceLinkIssues: ["sites/arolariu.ro/package.json does not declare @arolariu/components."]});
    const fixture = createReactFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const workspaceLink = resultById(results, "react.workspace-link");
    expect(workspaceLink.status).toBe("fail");
    expect(workspaceLink.rootCause).toBe("sites/arolariu.ro/package.json does not declare @arolariu/components.");
  });

  it("detects environment syntax errors", async () => {
    const facts = healthyReactFacts({
      environment: {...healthyEnvironmentFacts(), syntaxErrors: ["line 3: duplicate key SITE_ENV"]},
    });
    const fixture = createReactFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const environment = resultById(results, "react.environment");
    expect(environment.status).toBe("fail");
    expect(environment.summary).toContain("syntax errors");
    expect(environment.rootCause).toBe("line 3: duplicate key SITE_ENV");
  });

  it("detects missing core environment keys", async () => {
    const facts = healthyReactFacts({
      environment: {...healthyEnvironmentFacts(), missingCoreKeys: ["SITE_URL"]},
    });
    const fixture = createReactFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const environment = resultById(results, "react.environment");
    expect(environment.status).toBe("fail");
    expect(environment.summary).toContain("missing required core site keys");
    expect(environment.evidence).toContain("Missing required core key: SITE_URL");
  });

  it("warns when both Clerk keys are absent (keyless mode)", async () => {
    const facts = healthyReactFacts({
      environment: {
        ...healthyEnvironmentFacts(),
        missingAuthenticationKeys: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"],
      },
    });
    const fixture = createReactFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const environment = resultById(results, "react.environment");
    expect(environment.status).toBe("warn");
    expect(environment.summary).toContain("keyless mode");
  });

  it("fails when only one Clerk key is present", async () => {
    const facts = healthyReactFacts({
      environment: {...healthyEnvironmentFacts(), missingAuthenticationKeys: ["CLERK_SECRET_KEY"]},
    });
    const fixture = createReactFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const environment = resultById(results, "react.environment");
    expect(environment.status).toBe("fail");
    expect(environment.rootCause).toContain("inconsistent");
    expect(environment.evidence).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: present");
    expect(environment.evidence).toContain("CLERK_SECRET_KEY: absent");
  });

  it("detects i18n issues", async () => {
    const facts = healthyReactFacts({i18nIssues: ["messages/fr.json key shape does not match messages/en.json."]});
    const fixture = createReactFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const i18n = resultById(results, "react.i18n");
    expect(i18n.status).toBe("fail");
    expect(i18n.rootCause).toBe("messages/fr.json key shape does not match messages/en.json.");
  });

  it("detects artifact issues", async () => {
    const facts = healthyReactFacts({artifactIssues: ["licenses.json is missing a production entry for 'left-pad'."]});
    const fixture = createReactFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const taxonomy = resultById(results, "react.taxonomy-and-licenses");
    expect(taxonomy.status).toBe("fail");
    expect(taxonomy.rootCause).toBe("licenses.json is missing a production entry for 'left-pad'.");
  });

  it("detects Playwright version drift", async () => {
    const facts = healthyReactFacts({playwright: {version: "1.60.0", browsers: ["chromium-1223"]}});
    const fixture = createReactFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const playwright = resultById(results, "react.playwright");
    expect(playwright.status).toBe("fail");
    expect(playwright.rootCause).toContain("1.62.1");
  });

  it("detects missing chromium browser", async () => {
    const facts = healthyReactFacts({playwright: {version: "1.62.1", browsers: ["ffmpeg-1011"]}});
    const fixture = createReactFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const playwright = resultById(results, "react.playwright");
    expect(playwright.status).toBe("fail");
    expect(playwright.summary).toContain("Chromium is not installed");
  });

  it("skips Playwright when no locked version exists", async () => {
    const fixture = createReactFixture({requirements: validRequirements({omitPackages: ["playwright"]})});

    const results = await fixture.run();

    const playwright = resultById(results, "react.playwright");
    expect(playwright.status).toBe("skipped");
    expect(playwright.summary).toContain("no locked Playwright requirement");
    // Independent checks still evaluate from the available facts.
    expect(resultById(results, "react.packages").status).toBe("fail");
  });

  it("detects framework configuration issues", async () => {
    const facts = healthyReactFacts({frameworkIssues: ["next.config.ts does not wire next-intl message declaration generation."]});
    const fixture = createReactFixture({outcome: {kind: "available", value: facts, durationMs: 0}});

    const results = await fixture.run();

    const frameworkConfig = resultById(results, "react.framework-config");
    expect(frameworkConfig.status).toBe("fail");
    expect(frameworkConfig.rootCause).toBe("next.config.ts does not wire next-intl message declaration generation.");
  });

  it("never invokes context.probes", async () => {
    const fixture = createReactFixture();

    await fixture.run();

    expect(fixture.harness.processCalls()).toEqual([]);
  });

  it("never imports CommandSpec", async () => {
    const source = await readFile(resolve(moduleDirectory, "react.ts"), "utf8");
    const code = stripComments(source);

    expect(code).not.toContain("context.runner");
    expect(code).not.toMatch(/\bCommandSpec\b/u);
    expect(code).not.toMatch(/new\s+CommandSpec/u);
    expect(code).not.toContain("npm ls");
  });
});
