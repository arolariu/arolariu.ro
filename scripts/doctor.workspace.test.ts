// @vitest-environment node
/**
 * @fileoverview Contract tests for read-only workspace diagnostics.
 * @module scripts.doctor.workspace.test
 *
 * @remarks
 * These tests are built exclusively around inspection outcomes and opaque probe ids: no test
 * asserts a raw `CommandSpec`, and no test relies on a real Nx worker or real npm/git process.
 * `context.inspection.inspect` and `context.probes.run` are configured fakes keyed by fact key and
 * probe id respectively; `context.runner` is never touched by `doctor.workspace.ts` and is wired to
 * throw if it ever is. Only genuine filesystem-backed checks (repository root identity, required
 * configuration files, and mirrored taxonomy artifacts) use a real temporary directory.
 */

import {mkdir, mkdtemp, readFile, rm, utimes, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {basename, dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {ProcessOutcome} from "./common/runner.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {asReadOnlyFileSystem, FileSystemError, type Clock, type ReadOnlyFileSystem, type RuntimeEnvironment} from "./common/runtime.ts";
import {nodeFileSystem} from "./common/runtime.node.ts";
import {getExpectedTaxonomyArtifactPaths} from "./common/taxonomy-artifacts.ts";
import {createDoctorReport} from "./doctor.reporter.ts";
import {workspaceDoctorModule} from "./doctor.workspace.ts";
import type {DiagnosticNetworkResult, DiagnosticResult, DoctorContext, DoctorInput} from "./doctor.types.ts";
import type {InspectionProbe, InspectionProbeRunner} from "./inspection/probes.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import type {NpmTreeFacts, NpmProblemFact} from "./inspection/packages.ts";
import type {WorkspaceFacts} from "./inspection/workspace.ts";
import type {AggregateFacts} from "./inspection/aggregate.ts";

const fixtureRoots: string[] = [];
const moduleDirectory = dirname(fileURLToPath(import.meta.url));

const validRequirements: RepositoryRequirements = {
  node: {major: 24, minor: 0, patch: 0},
  npm: {major: 11, minor: 0, patch: 0},
  dotnet: {major: 10, minor: 0, patch: 0},
  python: {major: 3, minor: 12, patch: 0},
  packages: new Map(),
};

/** Legacy-shaped fixture description translated into one typed {@link ProcessOutcome}. */
interface ProcessOutcomeFixture {
  readonly code?: number;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly durationMs?: number;
  readonly timedOut?: boolean;
  readonly signal?: NodeJS.Signals;
  readonly spawnError?: string;
}

/**
 * Builds one typed {@link ProcessOutcome} from a fixture description, so every probe case keeps
 * naming the exact spawn/timeout/signal/exit classification it exercises.
 *
 * @param patch - Fixture description of the probe outcome under test.
 * @returns The equivalent typed process outcome.
 */
function commandResult(patch: ProcessOutcomeFixture = {}): ProcessOutcome {
  const output = {stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: patch.durationMs ?? 4};
  if (patch.spawnError !== undefined) {
    return {kind: "spawn-failed", message: patch.spawnError, ...output};
  }
  if (patch.timedOut === true) {
    return {kind: "timed-out", ...(patch.signal === undefined ? {} : {signal: patch.signal}), ...output};
  }
  if (patch.signal !== undefined) {
    return {kind: "signalled", signal: patch.signal, ...output};
  }
  const code = patch.code ?? 0;
  return code === 0 ? {kind: "succeeded", exitCode: 0, ...output} : {kind: "exited", exitCode: code, ...output};
}

function doctorOptions(patch: Partial<DoctorInput> = {}): DoctorInput {
  return {verbose: false, quick: false, ...patch};
}

/** Deterministic monotonic clock every fixture context observes. */
function fixtureClock(): Clock {
  let current = 0;
  return {
    monotonicNow: (): number => ++current,
    isoTimestamp: (): string => "2026-08-29T00:00:00.000Z",
    delay: (): Promise<void> => Promise.resolve(),
  };
}

/** Immutable environment snapshot every fixture context observes. */
function fixtureEnvironment(
  variables: Readonly<Record<string, string | undefined>> = {},
  platform: NodeJS.Platform = "win32",
): RuntimeEnvironment {
  return {
    variables,
    cwd: "C:\\fixture\\arolariu.ro",
    executablePath: "C:\\Program Files\\nodejs\\node.exe",
    platform,
    architecture: "x64",
    stdinIsTTY: false,
    stdoutIsTTY: false,
    isCI: false,
  };
}

function healthyWorkspaceFacts(): WorkspaceFacts {
  return {
    projects: [
      {name: "@arolariu/components", root: "packages/components", targets: ["build", "dev", "lint", "test"]},
      {name: "@arolariu/website", root: "sites/arolariu.ro", targets: ["build", "dev", "lint", "test"]},
    ],
    dependencies: [{source: "@arolariu/website", target: "@arolariu/components"}],
    cycles: [],
  };
}

function healthyNpmTreeFacts(scope: "root" | "github-scripts"): NpmTreeFacts {
  return {scope, valid: true, packageCount: 42, problemCount: 0, problems: []};
}

function healthyAggregateFacts(): AggregateFacts {
  return {
    tooling: {kind: "available", value: {system: {}, tools: [], packages: []}, durationMs: 0},
    host: {
      kind: "available",
      value: {
        os: {platform: "win32", distro: "Windows 11", release: "10.0.26100", arch: "x64"},
        cpu: {brand: "Test CPU", cores: 8, physicalCores: 4, virtualization: false},
        memory: {totalBytes: 32 * 1024 ** 3, usedBytes: 8 * 1024 ** 3, availableBytes: 24 * 1024 ** 3},
        load: {currentPercent: 12},
        filesystems: [
          {
            sizeBytes: 500 * 1024 ** 3,
            usedBytes: 200 * 1024 ** 3,
            availableBytes: 300 * 1024 ** 3,
            usedPercent: 40,
            repositoryVolume: true,
          },
        ],
        processes: {total: 200, running: 150, blocked: 0},
        portOwners: [],
        containers: {available: false, running: 0, stopped: 0, images: 0, repositoryContainers: []},
        network: {},
      },
      durationMs: 0,
    },
  };
}

function taxonomyArtifactContents(path: string, generatedAt = "2026-08-29T00:00:00.000Z"): string {
  const fileName = basename(path);
  const version =
    /^ecoicop-v(?<version>.+)\.min\.json$/u.exec(fileName)?.groups?.["version"]
    ?? /^(?:gpc|nace)-(?<version>.+)\.min\.json$/u.exec(fileName)?.groups?.["version"];
  if (version === undefined) {
    throw new Error(`Unsupported taxonomy fixture path: ${path}`);
  }
  return `${JSON.stringify({version, generatedAt, nodes: []})}\n`;
}

async function writeFixtureFile(path: string, contents = "{}\n"): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, contents, "utf8");
}

/** Strips block and line comments so source-guard assertions never match prose in doc comments. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/[^\n]*/gu, "");
}

/**
 * Wraps the real read-only filesystem so only `assertAccessible` fails, keeping every other
 * fixture read (repository identity, configuration files, taxonomy artifacts) intact.
 *
 * @param failure - The code-preserving failure `assertAccessible` rejects with.
 * @returns A read-only filesystem whose access assertion always fails.
 */
function readOnlyFilesWithAccessFailure(failure: FileSystemError): ReadOnlyFileSystem {
  return {
    ...asReadOnlyFileSystem(nodeFileSystem),
    assertAccessible: (): Promise<void> => Promise.reject(failure),
  };
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

const REQUIRED_CONFIG_PATHS = [
  ".nvmrc",
  ".node-version",
  "package.json",
  "package-lock.json",
  "nx.json",
  "tsconfig.json",
  "eslint.config.ts",
  "arolariu.slnx",
  join(".config", "dotnet-tools.json"),
  join(".github", "scripts", "package.json"),
  join(".github", "scripts", "package-lock.json"),
] as const;

interface WorkspaceFixture {
  readonly root: string;
  readonly cacheRoot: string;
  readonly context: DoctorContext;
  readonly probeRun: Mock<(probe: InspectionProbe, options?: unknown) => Promise<ProcessOutcome>>;
  readonly inspect: Mock<(key: string) => Promise<InspectionOutcome<unknown>>>;
}

async function createWorkspaceFixture(
  input: Readonly<{
    options?: Partial<DoctorInput>;
    requirementsValid?: boolean;
    probeOverrides?: ReadonlyMap<string, ProcessOutcome>;
    inspectionOverrides?: ReadonlyMap<string, InspectionOutcome<unknown>>;
    omitConfigPaths?: readonly string[];
    taxonomyContentOverrides?: ReadonlyMap<string, string>;
    files?: ReadOnlyFileSystem;
  }> = {},
): Promise<WorkspaceFixture> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-doctor-workspace-"));
  fixtureRoots.push(root);
  const paths = createRepositoryPaths(root);
  const cacheRoot = resolve(root, ".npm-cache");
  const omitted = new Set(input.omitConfigPaths ?? []);

  await Promise.all([
    ...REQUIRED_CONFIG_PATHS.filter((relativePath) => !omitted.has(relativePath)).map((relativePath) =>
      writeFixtureFile(
        resolve(root, relativePath),
        relativePath === "package.json" ? JSON.stringify({name: "@arolariu/monorepo"}) : "{}\n",
      ),
    ),
    mkdir(cacheRoot, {recursive: true}),
  ]);

  const generatedAt = new Date("2026-08-29T00:00:00.000Z");
  for (const artifactPath of getExpectedTaxonomyArtifactPaths(root)) {
    const override = input.taxonomyContentOverrides?.get(artifactPath);
    await writeFixtureFile(artifactPath, override ?? taxonomyArtifactContents(artifactPath));
    await utimes(artifactPath, generatedAt, generatedAt);
  }

  const probeResponses = new Map<string, ProcessOutcome>([
    ["workspace.git.version", commandResult({stdout: "git version 2.50.1\n"})],
    ["workspace.git.status", commandResult({stdout: "## preview...origin/preview\n M docs/example.md\n"})],
    ["workspace.git.last-commit", commandResult({stdout: "abc1234 example\n"})],
    ["workspace.node.version", commandResult({stdout: "v26.3.1\n"})],
    ["workspace.npm.version", commandResult({stdout: "11.16.0\n"})],
    ["workspace.npm.cache", commandResult({stdout: `${cacheRoot}\n`})],
    [
      "workspace.npm.audit",
      commandResult({
        stdout: JSON.stringify({metadata: {vulnerabilities: {info: 0, low: 0, moderate: 0, high: 0, critical: 0}}}),
      }),
    ],
    ["workspace.npm.outdated", commandResult({stdout: "{}\n"})],
    ...(input.probeOverrides ?? []),
  ]);

  const inspectionOutcomes = new Map<string, InspectionOutcome<unknown>>([
    ["workspace", {kind: "available", value: healthyWorkspaceFacts(), durationMs: 0}],
    ["npm.root", {kind: "available", value: healthyNpmTreeFacts("root"), durationMs: 0}],
    ["npm.github-scripts", {kind: "available", value: healthyNpmTreeFacts("github-scripts"), durationMs: 0}],
    ["aggregate", {kind: "available", value: healthyAggregateFacts(), durationMs: 0}],
    ...(input.inspectionOverrides ?? []),
  ]);

  const probeRun = vi.fn(async (probe: InspectionProbe): Promise<ProcessOutcome> => {
    const response = probeResponses.get(probe.id);
    if (response === undefined) {
      throw new Error(`Unexpected inspection probe requested: '${probe.id}'.`);
    }
    return response;
  });

  const inspect = vi.fn(async (key: string): Promise<InspectionOutcome<unknown>> => {
    const outcome = inspectionOutcomes.get(key);
    if (outcome === undefined) {
      throw new Error(`Unexpected inspection key requested: '${key}'.`);
    }
    return outcome;
  });

  const sink = new InMemoryLoggerSink();
  const context: DoctorContext = {
    options: doctorOptions(input.options),
    paths,
    requirements:
      input.requirementsValid === false
        ? {status: "invalid", errors: [".nvmrc disagrees with package.json#engines.node"]}
        : {status: "valid", requirements: validRequirements},
    network: {
      get: vi.fn(async (): Promise<DiagnosticNetworkResult> => ({status: "reachable", statusCode: 200, durationMs: 1})),
    },
    logger: new MonorepositoryConsoleLogger("doctor::workspace", {color: false, sink}),
    files: input.files ?? asReadOnlyFileSystem(nodeFileSystem),
    clock: fixtureClock(),
    environment: fixtureEnvironment({PATH: resolve(root, "bin")}),
    probes: {run: probeRun as unknown as InspectionProbeRunner["run"]},
    inspection: {
      inspect: inspect as unknown as RepositoryInspectionSession["inspect"],
      invalidate: vi.fn(),
      updateInfrastructureEngine: vi.fn(),
    } as RepositoryInspectionSession,
  };

  return {root, cacheRoot, context, probeRun, inspect};
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

describe("workspaceDoctorModule", () => {
  it("returns every stable workspace check in order for a healthy local baseline", async () => {
    const fixture = await createWorkspaceFixture();

    const results = await workspaceDoctorModule.run(fixture.context);

    expect(resultIds(results)).toEqual([
      "workspace.repository-root",
      "workspace.git",
      "workspace.node-sources",
      "workspace.node-runtime",
      "workspace.npm-runtime",
      "workspace.root-dependencies",
      "workspace.github-scripts-dependencies",
      "workspace.npm-cache",
      "workspace.nx-projects",
      "workspace.nx-graph",
      "workspace.config-files",
      "workspace.generated-artifacts",
      "workspace.host-capacity",
      "workspace.npm-audit",
      "workspace.npm-outdated",
    ]);
    for (const result of results) {
      expect(result.status, `${result.id} should pass`).toBe("pass");
    }
  });

  it("reports requirement-source drift while still probing independent workspace checks", async () => {
    const fixture = await createWorkspaceFixture({requirementsValid: false});

    const results = await workspaceDoctorModule.run(fixture.context);

    expect(resultById(results, "workspace.node-sources").status).toBe("fail");
    expect(resultById(results, "workspace.node-runtime").status).toBe("skipped");
    expect(resultById(results, "workspace.npm-runtime").status).toBe("skipped");
    // Independent checks are unaffected by requirement-source drift.
    expect(resultById(results, "workspace.git").status).toBe("pass");
    expect(resultById(results, "workspace.root-dependencies").status).toBe("pass");
    expect(resultById(results, "workspace.config-files").status).toBe("pass");
    expect(resultById(results, "workspace.host-capacity").status).toBe("pass");
  });

  it("uses only opaque probe ids and never requests workspace.npm.tree", async () => {
    const fixture = await createWorkspaceFixture();

    await workspaceDoctorModule.run(fixture.context);

    const requestedIds = fixture.probeRun.mock.calls.map(([probe]) => probe.id);
    expect(requestedIds.length).toBeGreaterThan(0);
    for (const id of requestedIds) {
      expect(id.startsWith("workspace.")).toBe(true);
    }
    expect(requestedIds).not.toContain("workspace.npm.tree");
  });

  it("fails git diagnostic when the git version probe fails", async () => {
    const fixture = await createWorkspaceFixture({
      probeOverrides: new Map([
        ["workspace.git.version", commandResult({code: 127, stderr: "'git' is not recognized as an internal or external command"})],
        ["workspace.executable-resolution:git.exe", commandResult({code: 1, stdout: ""})],
      ]),
    });

    const results = await workspaceDoctorModule.run(fixture.context);

    const git = resultById(results, "workspace.git");
    expect(git.status).toBe("fail");
    expect(git.summary).toContain("unavailable or returned an invalid version");
    // Probe-derived evidence is preserved exactly; the empty-evidence fallback never applies here.
    expect(git.evidence).toContain("Command exited with code 127.");
    expect(git.evidence.some((entry) => entry.includes("is not recognized as an internal or external command"))).toBe(true);
    expect(git.evidence.some((entry) => entry.includes("without producing"))).toBe(false);
  });

  it("declares the facts the command prewarms so they are never inspected serially", () => {
    expect(workspaceDoctorModule.facts).toEqual(["workspace", "npm.root", "npm.github-scripts"]);
  });

  it("keeps a silent successful git version probe as one reportable failure instead of an empty-evidence row", async () => {
    const fixture = await createWorkspaceFixture({
      probeOverrides: new Map([["workspace.git.version", commandResult({stdout: "  \n"})]]),
    });

    const results = await workspaceDoctorModule.run(fixture.context);

    const git = resultById(results, "workspace.git");
    expect(git.status).toBe("fail");
    expect(git.evidence).toEqual(["The git version probe completed without producing a recognizable version."]);
    // A failed row with no evidence aborts the entire report instead of degrading one check.
    expect(() => createDoctorReport(results, "2026-08-29T00:00:00.000Z", {verbose: false})).not.toThrow();
  });

  it("keeps a silent failing git state probe as one reportable failure instead of an empty-evidence row", async () => {
    const fixture = await createWorkspaceFixture({
      probeOverrides: new Map<string, ProcessOutcome>([
        ["workspace.git.status", {kind: "exited", exitCode: 0, stdout: "", stderr: "", durationMs: 4}],
        ["workspace.git.last-commit", {kind: "exited", exitCode: 0, stdout: "", stderr: "", durationMs: 4}],
      ]),
    });

    const results = await workspaceDoctorModule.run(fixture.context);

    const git = resultById(results, "workspace.git");
    expect(git.status).toBe("fail");
    expect(git.summary).toContain("repository state could not be inspected");
    expect(git.evidence).toEqual(["The git status and last-commit probes completed without producing any output."]);
    expect(() => createDoctorReport(results, "2026-08-29T00:00:00.000Z", {verbose: false})).not.toThrow();
  });

  it("reports unavailable workspace facts as explicit Nx failures", async () => {
    const fixture = await createWorkspaceFixture({
      inspectionOverrides: new Map([["workspace", {kind: "unavailable", reason: "Nx workspace worker timed out.", durationMs: 0}]]),
    });

    const results = await workspaceDoctorModule.run(fixture.context);

    const projects = resultById(results, "workspace.nx-projects");
    const graph = resultById(results, "workspace.nx-graph");
    expect(projects.status).toBe("fail");
    expect(projects.evidence).toContain("Nx workspace worker timed out.");
    expect(graph.status).toBe("fail");
    expect(graph.evidence).toContain("Nx workspace worker timed out.");
  });

  it("reports invalid workspace facts as explicit Nx failures", async () => {
    const fixture = await createWorkspaceFixture({
      inspectionOverrides: new Map([
        ["workspace", {kind: "invalid", issues: ["Nx workspace project 'x' has a missing 'data.root'."], durationMs: 0}],
      ]),
    });

    const results = await workspaceDoctorModule.run(fixture.context);

    expect(resultById(results, "workspace.nx-projects").status).toBe("fail");
    expect(resultById(results, "workspace.nx-projects").evidence).toContain("Nx workspace project 'x' has a missing 'data.root'.");
    expect(resultById(results, "workspace.nx-graph").status).toBe("fail");
  });

  it("diagnoses npm root tree from NpmTreeFacts with bounded problems", async () => {
    const problems: NpmProblemFact[] = Array.from({length: 7}, (_, index) => ({
      ...(index === 0 ? {code: "missing"} : index === 1 ? {code: "invalid"} : {}),
      detail: `npm reported problem ${String(index)}.`,
    }));
    const facts: NpmTreeFacts = {scope: "root", valid: false, packageCount: 12, problemCount: 7, problems};
    const fixture = await createWorkspaceFixture({
      inspectionOverrides: new Map([["npm.root", {kind: "available", value: facts, durationMs: 0}]]),
    });

    const results = await workspaceDoctorModule.run(fixture.context);

    const root = resultById(results, "workspace.root-dependencies");
    expect(root.status).toBe("fail");
    expect(root.evidence[0]).toBe("7 dependency problems reported.");
    expect(root.evidence).toContain("npm reported problem 0.");
    expect(root.evidence).toContain("npm reported problem 4.");
    expect(root.evidence).not.toContain("npm reported problem 5.");
    expect(root.evidence.at(-1)).toBe("2 additional problems omitted.");
    expect(root.potentialCauses.map(({cause}) => cause)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("missing from the installed dependency tree"),
        expect.stringContaining("do not satisfy the locked dependency graph"),
      ]),
    );
  });

  it("uses total npm problemCount when the provider retained only a shorter bounded problem list", async () => {
    const facts: NpmTreeFacts = {
      scope: "root",
      valid: false,
      packageCount: 12,
      problemCount: 25,
      problems: [
        {code: "missing", detail: "npm reported missing package alpha."},
        {code: "invalid", detail: "npm reported invalid package beta."},
        {detail: "npm reported problem gamma."},
      ],
    };
    const fixture = await createWorkspaceFixture({
      inspectionOverrides: new Map([["npm.root", {kind: "available", value: facts, durationMs: 0}]]),
    });

    const results = await workspaceDoctorModule.run(fixture.context);

    const root = resultById(results, "workspace.root-dependencies");
    expect(root.evidence[0]).toBe("25 dependency problems reported.");
    expect(root.evidence.at(-1)).toBe("22 additional problems omitted.");
  });

  it("diagnoses unavailable npm tree as explicit failure", async () => {
    const fixture = await createWorkspaceFixture({
      inspectionOverrides: new Map([
        ["npm.github-scripts", {kind: "unavailable", reason: "npm dependency inspection could not be started.", durationMs: 0}],
      ]),
    });

    const results = await workspaceDoctorModule.run(fixture.context);

    const githubScripts = resultById(results, "workspace.github-scripts-dependencies");
    expect(githubScripts.status).toBe("fail");
    expect(githubScripts.evidence).toEqual(["npm dependency inspection could not be started."]);
    expect(githubScripts.fixes[0]?.command).toBe("npm run setup");
  });

  it("skips host-capacity in quick mode without requesting aggregate", async () => {
    const fixture = await createWorkspaceFixture({options: {quick: true}});

    const results = await workspaceDoctorModule.run(fixture.context);

    expect(resultById(results, "workspace.host-capacity").status).toBe("skipped");
    const inspectedKeys = fixture.inspect.mock.calls.map(([key]) => key);
    expect(inspectedKeys).not.toContain("aggregate");
  });

  it("skips audit and outdated in quick mode", async () => {
    const fixture = await createWorkspaceFixture({options: {quick: true}});

    const results = await workspaceDoctorModule.run(fixture.context);

    expect(resultById(results, "workspace.npm-audit").status).toBe("skipped");
    expect(resultById(results, "workspace.npm-outdated").status).toBe("skipped");
    const requestedIds = fixture.probeRun.mock.calls.map(([probe]) => probe.id);
    expect(requestedIds).not.toContain("workspace.npm.audit");
    expect(requestedIds).not.toContain("workspace.npm.outdated");
  });

  it("derives host capacity from aggregate facts in normal mode", async () => {
    const criticallyLowDiskFacts = healthyAggregateFacts();
    if (criticallyLowDiskFacts.host.kind !== "available") {
      throw new Error("Expected an available host outcome fixture.");
    }
    const criticallyLow = await createWorkspaceFixture({
      inspectionOverrides: new Map<string, InspectionOutcome<unknown>>([
        [
          "aggregate",
          {
            kind: "available",
            value: {
              ...criticallyLowDiskFacts,
              host: {
                kind: "available",
                durationMs: 0,
                value: {
                  ...criticallyLowDiskFacts.host.value,
                  filesystems: [
                    {
                      sizeBytes: 10 * 1024 ** 3,
                      usedBytes: 9.9 * 1024 ** 3,
                      availableBytes: 0.5 * 1024 ** 3,
                      usedPercent: 99,
                      repositoryVolume: true,
                    },
                  ],
                },
              },
            },
            durationMs: 0,
          },
        ],
      ]),
    });
    const lowDiskResults = await workspaceDoctorModule.run(criticallyLow.context);
    expect(resultById(lowDiskResults, "workspace.host-capacity").status).toBe("fail");

    const recommendedFacts = healthyAggregateFacts();
    if (recommendedFacts.host.kind !== "available") {
      throw new Error("Expected an available host outcome fixture.");
    }
    const belowRecommended = await createWorkspaceFixture({
      inspectionOverrides: new Map<string, InspectionOutcome<unknown>>([
        [
          "aggregate",
          {
            kind: "available",
            value: {
              ...recommendedFacts,
              host: {
                kind: "available",
                durationMs: 0,
                value: {
                  ...recommendedFacts.host.value,
                  filesystems: [
                    {
                      sizeBytes: 100 * 1024 ** 3,
                      usedBytes: 98 * 1024 ** 3,
                      availableBytes: 2 * 1024 ** 3,
                      usedPercent: 98,
                      repositoryVolume: true,
                    },
                  ],
                },
              },
            },
            durationMs: 0,
          },
        ],
      ]),
    });
    const warnResults = await workspaceDoctorModule.run(belowRecommended.context);
    expect(resultById(warnResults, "workspace.host-capacity").status).toBe("warn");
  });

  it("handles nested aggregate host degradation independently", async () => {
    const unavailableHost = await createWorkspaceFixture({
      inspectionOverrides: new Map<string, InspectionOutcome<unknown>>([
        [
          "aggregate",
          {
            kind: "available",
            value: {
              tooling: {kind: "available", value: {system: {}, tools: [], packages: []}, durationMs: 0},
              host: {kind: "unavailable", reason: "The host inspection worker crashed.", durationMs: 0},
            },
            durationMs: 0,
          },
        ],
      ]),
    });
    const unavailableResults = await workspaceDoctorModule.run(unavailableHost.context);
    const unavailableResult = resultById(unavailableResults, "workspace.host-capacity");
    expect(unavailableResult.status).toBe("warn");
    expect(unavailableResult.evidence).toContain("The host inspection worker crashed.");

    const invalidHost = await createWorkspaceFixture({
      inspectionOverrides: new Map<string, InspectionOutcome<unknown>>([
        [
          "aggregate",
          {
            kind: "available",
            value: {
              tooling: {kind: "available", value: {system: {}, tools: [], packages: []}, durationMs: 0},
              host: {kind: "invalid", issues: ["The aggregate host facts are malformed."], durationMs: 0},
            },
            durationMs: 0,
          },
        ],
      ]),
    });
    const invalidResults = await workspaceDoctorModule.run(invalidHost.context);
    const invalidResult = resultById(invalidResults, "workspace.host-capacity");
    expect(invalidResult.status).toBe("warn");
    expect(invalidResult.evidence).toContain("The aggregate host facts are malformed.");
  });

  it("handles audit malformed JSON and large payloads with bounded diagnostics", async () => {
    const malformed = await createWorkspaceFixture({
      probeOverrides: new Map([["workspace.npm.audit", commandResult({stdout: "{not-json"})]]),
    });
    const malformedResults = await workspaceDoctorModule.run(malformed.context);
    const malformedAudit = resultById(malformedResults, "workspace.npm-audit");
    expect(malformedAudit.status).toBe("warn");
    expect(malformedAudit.summary).toContain("unrecognized response");
    expect(malformedAudit.evidence.length).toBeGreaterThan(0);

    const paddedStdout = JSON.stringify({
      metadata: {vulnerabilities: {info: 0, low: 0, moderate: 0, high: 1, critical: 0}},
      padding: "x".repeat(2_500),
    });
    const large = await createWorkspaceFixture({
      probeOverrides: new Map([["workspace.npm.audit", commandResult({stdout: paddedStdout})]]),
    });
    const largeResults = await workspaceDoctorModule.run(large.context);
    const largeAudit = resultById(largeResults, "workspace.npm-audit");
    expect(largeAudit.status).toBe("fail");
    expect(largeAudit.evidence.some((entry) => entry.includes("(truncated)"))).toBe(true);
  });

  it("handles outdated packages with bounded evidence", async () => {
    const outdated = Object.fromEntries(
      Array.from({length: 8}, (_, index) => [`package-${String(index).padStart(2, "0")}`, {current: "1.0.0", latest: "2.0.0"}]),
    );
    const fixture = await createWorkspaceFixture({
      probeOverrides: new Map([["workspace.npm.outdated", commandResult({stdout: JSON.stringify(outdated)})]]),
    });

    const results = await workspaceDoctorModule.run(fixture.context);

    const outdatedResult = resultById(results, "workspace.npm-outdated");
    expect(outdatedResult.status).toBe("warn");
    expect(outdatedResult.evidence).toHaveLength(5);
    expect(outdatedResult.evidence.at(-1)).toBe("4 additional evidence entries omitted.");
  });

  it("reports workspace cycles from inspection facts", async () => {
    const facts: WorkspaceFacts = {
      projects: [
        {name: "@arolariu/components", root: "packages/components", targets: []},
        {name: "@arolariu/website", root: "sites/arolariu.ro", targets: []},
      ],
      dependencies: [
        {source: "@arolariu/website", target: "@arolariu/components"},
        {source: "@arolariu/components", target: "@arolariu/website"},
      ],
      cycles: [["@arolariu/components", "@arolariu/website", "@arolariu/components"]],
    };
    const fixture = await createWorkspaceFixture({
      inspectionOverrides: new Map([["workspace", {kind: "available", value: facts, durationMs: 0}]]),
    });

    const results = await workspaceDoctorModule.run(fixture.context);

    const graph = resultById(results, "workspace.nx-graph");
    expect(graph.status).toBe("fail");
    expect(graph.summary).toContain("circular project dependencies");
    expect(graph.evidence).toContain("@arolariu/components -> @arolariu/website -> @arolariu/components");
  });

  it("reports missing config files without running any commands", async () => {
    const fixture = await createWorkspaceFixture({omitConfigPaths: ["arolariu.slnx"]});

    const results = await workspaceDoctorModule.run(fixture.context);

    const configFiles = resultById(results, "workspace.config-files");
    expect(configFiles.status).toBe("fail");
    expect(configFiles.evidence).toContain("Missing: arolariu.slnx");
  });

  it("reports mismatched taxonomy artifacts", async () => {
    const fixture = await createWorkspaceFixture();
    const mismatchedPath = getExpectedTaxonomyArtifactPaths(fixture.root).find((path) => basename(path) === "nace-2.1.min.json");
    if (mismatchedPath === undefined) {
      throw new Error("Expected a nace taxonomy artifact path.");
    }
    await writeFixtureFile(mismatchedPath, taxonomyArtifactContents(mismatchedPath, "2026-08-30T00:00:00.000Z"));

    const results = await workspaceDoctorModule.run(fixture.context);

    const artifacts = resultById(results, "workspace.generated-artifacts");
    expect(artifacts.status).toBe("fail");
    expect(artifacts.evidence).toContain("Mirrored taxonomy bytes differ: nace-2.1.min.json");
  });

  it("same shared session and probe runner identity reaches the module", async () => {
    const fixture = await createWorkspaceFixture();
    const inspectFn = fixture.context.inspection.inspect;
    const probeRunFn = fixture.context.probes.run;

    await workspaceDoctorModule.run(fixture.context);

    expect(fixture.context.inspection.inspect).toBe(inspectFn);
    expect(fixture.context.probes.run).toBe(probeRunFn);
    expect(fixture.inspect.mock.calls.length).toBeGreaterThan(0);
    expect(fixture.probeRun.mock.calls.length).toBeGreaterThan(0);
  });

  it.each([
    ["EACCES", "The current user does not have read/write access to the configured npm cache."],
    ["EPERM", "The current user does not have read/write access to the configured npm cache."],
  ])("classifies a %s npm cache access failure as a permission root cause", async (code, rootCause) => {
    const fixture = await createWorkspaceFixture({
      files: readOnlyFilesWithAccessFailure(new FileSystemError("assertAccessible", "cache", "Failed to access the npm cache.", {code})),
    });

    const results = await workspaceDoctorModule.run(fixture.context);

    const cache = resultById(results, "workspace.npm-cache");
    expect(cache.status).toBe("fail");
    expect(cache.rootCause).toBe(rootCause);
    expect(cache.potentialCauses).toEqual([]);
    expect(cache.evidence.some((entry) => entry.includes("Failed to access the npm cache."))).toBe(true);
  });

  it("classifies a non-permission npm cache access failure as potential causes", async () => {
    const fixture = await createWorkspaceFixture({
      files: readOnlyFilesWithAccessFailure(new FileSystemError("assertAccessible", "cache", "npm cache is missing.", {code: "ENOENT"})),
    });

    const results = await workspaceDoctorModule.run(fixture.context);

    const cache = resultById(results, "workspace.npm-cache");
    expect(cache.status).toBe("fail");
    expect(cache.rootCause).toBeUndefined();
    expect(cache.potentialCauses.map(({cause}) => cause)).toEqual([
      "The configured npm cache directory does not exist.",
      "npm points at a stale or unavailable filesystem path.",
    ]);
  });

  it("never imports CommandSpec or calls context.runner", async () => {
    const source = await readFile(resolve(moduleDirectory, "doctor.workspace.ts"), "utf8");
    const code = stripComments(source);

    expect(code).not.toContain("context.runner");
    expect(code).not.toMatch(/\bCommandSpec\b/u);
    expect(code).not.toMatch(/new\s+CommandSpec/u);
    expect(code).not.toContain("npm ls");
  });
});
