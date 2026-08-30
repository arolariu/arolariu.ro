// @vitest-environment node
/**
 * @fileoverview Contract tests for read-only workspace diagnostics.
 * @module scripts.doctor.workspace.test
 */

import {mkdir, mkdtemp, rm, utimes, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {basename, dirname, join, resolve} from "node:path";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {getExpectedTaxonomyArtifactPaths} from "./generate.artifacts.ts";
import {diagnoseNpmIntegrity, parseNxGraph, workspaceDoctorModule} from "./doctor.workspace.ts";
import type {
  DiagnosticCommandRunner,
  DiagnosticNetworkResult,
  DoctorContext,
  DoctorOptions,
} from "./doctor.types.ts";

const fixtureRoots: string[] = [];

const validRequirements: RepositoryRequirements = {
  node: {major: 24, minor: 0, patch: 0},
  npm: {major: 11, minor: 0, patch: 0},
  dotnet: {major: 10, minor: 0, patch: 0},
  python: {major: 3, minor: 12, patch: 0},
  packages: new Map(),
};

function commandResult(patch: Partial<CommandResult> = {}): CommandResult {
  return {
    code: 0,
    stdout: "",
    stderr: "",
    durationMs: 4,
    timedOut: false,
    ...patch,
  };
}

function commandKey(command: Readonly<CommandSpec>, cwd?: string): string {
  return `${cwd ?? ""}\u0000${command.command}\u0000${JSON.stringify(command.args)}`;
}

function healthyNxGraph(): string {
  return JSON.stringify({
    graph: {
      nodes: {
        "@arolariu/website": {name: "@arolariu/website"},
        "@arolariu/components": {name: "@arolariu/components"},
      },
      dependencies: {
        "@arolariu/website": [
          {
            source: "@arolariu/website",
            target: "@arolariu/components",
            type: "static",
          },
        ],
        "@arolariu/components": [],
      },
    },
  });
}

interface WorkspaceFixture {
  readonly root: string;
  readonly cacheRoot: string;
  readonly context: DoctorContext;
  readonly run: Mock<DiagnosticCommandRunner["run"]>;
  readonly responses: Map<string, CommandResult>;
}

async function writeFixtureFile(path: string, contents = "{}\n"): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, contents, "utf8");
}

function doctorOptions(patch: Partial<DoctorOptions> = {}): DoctorOptions {
  return {
    verbose: false,
    ci: false,
    score: false,
    json: false,
    quick: false,
    help: false,
    ...patch,
  };
}

async function createWorkspaceFixture(
  input: Readonly<{
    options?: Partial<DoctorOptions>;
    requirementsValid?: boolean;
  }> = {},
): Promise<WorkspaceFixture> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-doctor-workspace-"));
  fixtureRoots.push(root);
  const paths = createRepositoryPaths(root);
  const cacheRoot = resolve(root, ".npm-cache");

  await Promise.all([
    writeFixtureFile(paths.packageJson, JSON.stringify({name: "@arolariu/monorepo"})),
    writeFixtureFile(paths.packageLock),
    writeFixtureFile(paths.githubScriptsPackageJson, JSON.stringify({name: "@arolariu/github-scripts"})),
    writeFixtureFile(paths.githubScriptsPackageLock),
    writeFixtureFile(paths.solution, "<Solution />\n"),
    writeFixtureFile(paths.dotnetBuildProps, "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>\n"),
    writeFixtureFile(paths.dotnetToolManifest, JSON.stringify({version: 1, tools: {}})),
    writeFixtureFile(paths.pythonProject, '[project]\nrequires-python = ">=3.12"\n'),
    writeFixtureFile(paths.pythonRequirements, "pytest==9.1.1\n"),
    writeFixtureFile(resolve(root, ".nvmrc"), "24\n"),
    writeFixtureFile(resolve(root, ".node-version"), "24\n"),
    writeFixtureFile(resolve(root, "nx.json")),
    writeFixtureFile(resolve(root, "tsconfig.json")),
    writeFixtureFile(resolve(root, "eslint.config.ts"), "export default [];\n"),
    writeFixtureFile(resolve(root, "scripts", "generate.artifacts.ts"), "export {};\n"),
    mkdir(resolve(root, "node_modules"), {recursive: true}),
    mkdir(resolve(paths.githubScriptsRoot, "node_modules"), {recursive: true}),
    mkdir(cacheRoot, {recursive: true}),
  ]);

  const generatedAt = new Date("2026-08-29T00:00:00.000Z");
  const sourceAt = new Date("2026-08-28T00:00:00.000Z");
  await utimes(resolve(root, "scripts", "generate.artifacts.ts"), sourceAt, sourceAt);
  for (const artifactPath of getExpectedTaxonomyArtifactPaths(root)) {
    await writeFixtureFile(artifactPath, `${basename(artifactPath)}\n`);
    await utimes(artifactPath, generatedAt, generatedAt);
  }

  const responses = new Map<string, CommandResult>();
  const setResponse = (command: CommandSpec, result: CommandResult, cwd = root): void => {
    responses.set(commandKey(command, cwd), result);
  };

  setResponse({command: "git", args: ["--version"]}, commandResult({stdout: "git version 2.50.1\n"}));
  setResponse(
    {command: "git", args: ["status", "--short", "--branch"]},
    commandResult({stdout: "## preview...origin/preview\n M docs/example.md\n"}),
  );
  setResponse({command: "git", args: ["log", "--oneline", "-1", "HEAD"]}, commandResult({stdout: "abc1234 example\n"}));
  setResponse({command: "node", args: ["--version"]}, commandResult({stdout: "v26.3.1\n"}));
  setResponse({command: "npm", args: ["--version"]}, commandResult({stdout: "11.16.0\n"}));
  setResponse({command: "npm", args: ["ls", "--all", "--json"]}, commandResult({stdout: '{"problems":[]}\n'}));
  setResponse(
    {command: "npm", args: ["ls", "--all", "--json"]},
    commandResult({stdout: '{"problems":[]}\n'}),
    paths.githubScriptsRoot,
  );
  setResponse({command: "npm", args: ["config", "get", "cache"]}, commandResult({stdout: `${cacheRoot}\n`}));
  setResponse(
    {command: "npx", args: ["--no-install", "nx", "show", "projects", "--json"]},
    commandResult({stdout: '["@arolariu/website","@arolariu/components"]\n'}),
  );
  setResponse(
    {command: "npx", args: ["--no-install", "nx", "graph", "--print", "--open=false", "--watch=false"]},
    commandResult({stdout: healthyNxGraph()}),
  );
  setResponse(
    {command: "npm", args: ["audit", "--json"]},
    commandResult({
      stdout: JSON.stringify({
        metadata: {vulnerabilities: {info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0}},
      }),
    }),
  );
  setResponse({command: "npm", args: ["outdated", "--json"]}, commandResult({stdout: "{}\n"}));

  const run = vi.fn<DiagnosticCommandRunner["run"]>(
    async (command: Readonly<CommandSpec>, options): Promise<CommandResult> =>
      responses.get(commandKey(command, options?.cwd))
      ?? commandResult({code: 127, spawnError: `Unexpected command ${command.command}`}),
  );
  const runner: DiagnosticCommandRunner = {run};
  const sink = new InMemoryLoggerSink();
  let now = 0;
  const context: DoctorContext = {
    options: doctorOptions(input.options),
    paths,
    requirements:
      input.requirementsValid === false
        ? {status: "invalid", errors: [".nvmrc disagrees with package.json#engines.node"]}
        : {status: "valid", requirements: validRequirements},
    runner,
    network: {
      get: vi.fn(async (): Promise<DiagnosticNetworkResult> => ({status: "reachable", statusCode: 200, durationMs: 1})),
    },
    logger: new MonorepositoryConsoleLogger("doctor::workspace", {color: false, sink}),
    platform: "win32",
    arch: "x64",
    env: {
      PATH: resolve(root, "bin"),
      ProgramFiles: resolve(root, "Program Files"),
      LOCALAPPDATA: resolve(root, "Local"),
    },
    now: () => ++now,
  };

  return {root, cacheRoot, context, run, responses};
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

describe("diagnoseNpmIntegrity", () => {
  it("passes a successful npm tree", () => {
    const result = diagnoseNpmIntegrity(commandResult({stdout: '{"problems":[]}\n'}), "root workspace");

    expect(result.status).toBe("pass");
    expect(result.id).toBe("workspace.root-dependencies");
  });

  it.each([
    ["missing dependency", '{"problems":["missing: react@19.2.8, required by app@1.0.0"]}', "missing"],
    ["invalid version", '{"problems":["invalid: react@18.0.0 C:\\\\repo\\\\node_modules\\\\react"]}', "invalid"],
    ["extraneous package", '{"problems":["extraneous: left-pad@1.3.0 C:\\\\repo\\\\node_modules\\\\left-pad"]}', "extraneous"],
    ["peer dependency", '{"problems":["peer dep missing: vite@^8, required by plugin@1.0.0"]}', "peer"],
    ["lockfile mismatch", '{"error":{"code":"ELSPROBLEMS","summary":"package-lock.json is out of sync"}}', "lockfile"],
  ])("classifies %s without claiming a unique root cause", (_title, stdout, expectedCause) => {
    const result = diagnoseNpmIntegrity(commandResult({code: 1, stdout}), "root workspace");

    expect(result.status).toBe("fail");
    expect(result.rootCause).toBeUndefined();
    expect(result.potentialCauses.map(({cause}) => cause.toLowerCase()).join(" ")).toContain(expectedCause);
    expect(result.evidence).not.toEqual([]);
    expect(result.fixes).not.toEqual([]);
  });

  it("uses a unique root cause only for permission-specific evidence", () => {
    const result = diagnoseNpmIntegrity(
      commandResult({code: 1, stderr: "npm error code EACCES\nnpm error permission denied"}),
      ".github scripts",
    );

    expect(result.id).toBe("workspace.github-scripts-dependencies");
    expect(result.status).toBe("fail");
    expect(result.rootCause?.toLowerCase()).toContain("permission");
    expect(result.potentialCauses).toEqual([]);
  });

  it.each([
    ["malformed JSON", commandResult({code: 1, stdout: "{not-json"})],
    ["timeout", commandResult({code: 1, timedOut: true})],
    ["missing command", commandResult({code: 1, spawnError: "ENOENT"})],
  ])("preserves %s evidence as an explicit failure", (_title, result) => {
    const diagnostic = diagnoseNpmIntegrity(result, "root workspace");

    expect(diagnostic.status).toBe("fail");
    expect(diagnostic.evidence.join("\n")).not.toBe("");
    expect(diagnostic.fixes).not.toEqual([]);
  });

  it("returns ranked potential causes for mixed npm problems", () => {
    const result = diagnoseNpmIntegrity(
      commandResult({
        code: 1,
        stdout: '{"problems":["missing: react@19","invalid: vite@7","extraneous: left-pad@1"]}',
      }),
      "root workspace",
    );

    expect(result.rootCause).toBeUndefined();
    expect(result.potentialCauses.map(({confidence}) => confidence)).toEqual(["high", "medium", "low"]);
  });
});

describe("parseNxGraph", () => {
  it("parses projects, dependencies, and no cycles from a healthy graph", () => {
    const parsed = parseNxGraph(healthyNxGraph());

    expect(parsed.projects).toEqual(["@arolariu/components", "@arolariu/website"]);
    expect(parsed.dependencies.get("@arolariu/website")).toEqual(["@arolariu/components"]);
    expect(parsed.cycles).toEqual([]);
  });

  it("detects dependency cycles", () => {
    const parsed = parseNxGraph(
      JSON.stringify({
        graph: {
          nodes: {a: {}, b: {}},
          dependencies: {
            a: [{source: "a", target: "b", type: "static"}],
            b: [{source: "b", target: "a", type: "static"}],
          },
        },
      }),
    );

    expect(parsed.cycles).toEqual(["a -> b -> a"]);
  });

  it("preserves a valid zero-project graph for the diagnostic layer to classify", () => {
    expect(parseNxGraph(JSON.stringify({graph: {nodes: {}, dependencies: {}}}))).toEqual({
      projects: [],
      dependencies: new Map(),
      cycles: [],
    });
  });

  it.each(["not-json", "[]", '{"graph":{"nodes":[],"dependencies":{}}}', '{"graph":{"nodes":{},"dependencies":[]}}'])(
    "rejects malformed graph payload %s",
    (stdout) => {
      expect(() => parseNxGraph(stdout)).toThrow();
    },
  );
});

describe("workspaceDoctorModule", () => {
  it("returns every stable workspace check in order for a healthy local baseline", async () => {
    const fixture = await createWorkspaceFixture();

    const results = await workspaceDoctorModule.run(fixture.context);

    expect(results.map(({id}) => id)).toEqual([
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
    expect(results.every(({status}) => status === "pass")).toBe(true);
    expect(results.find(({id}) => id === "workspace.git")?.evidence.join("\n")).toContain("preview");
    expect(results.find(({id}) => id === "workspace.git")?.evidence.join("\n")).toContain("1 changed path");
    expect(results.find(({id}) => id === "workspace.host-capacity")?.evidence.join("\n")).toMatch(/disk|memory/iu);
    expect(
      fixture.run.mock.calls.some(
        ([command]) => command.command === "npm" && command.args.join(" ") === "ls --all --json",
      ),
    ).toBe(true);
  });

  it("reports requirement-source drift while still probing independent workspace checks", async () => {
    const fixture = await createWorkspaceFixture({requirementsValid: false});

    const results = await workspaceDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "workspace.node-sources")).toMatchObject({
      status: "fail",
      rootCause: "Repository runtime requirement sources disagree.",
    });
    expect(results.find(({id}) => id === "workspace.node-runtime")?.status).toBe("skipped");
    expect(results.find(({id}) => id === "workspace.npm-runtime")?.status).toBe("skipped");
    expect(results.find(({id}) => id === "workspace.nx-projects")?.status).toBe("pass");
  });

  it("runs executable follow-ups only after a failed probe and outside quick mode", async () => {
    const normal = await createWorkspaceFixture();
    normal.responses.set(
      commandKey({command: "node", args: ["--version"]}, normal.root),
      commandResult({code: 1, spawnError: "ENOENT"}),
    );
    normal.responses.set(
      commandKey({command: "where.exe", args: ["node.exe"]}, normal.root),
      commandResult({code: 1, stderr: "INFO: Could not find files"}),
    );

    const normalResults = await workspaceDoctorModule.run(normal.context);

    expect(normalResults.find(({id}) => id === "workspace.node-runtime")?.status).toBe("fail");
    expect(normal.run).toHaveBeenCalledWith({command: "where.exe", args: ["node.exe"]}, expect.any(Object));

    const quick = await createWorkspaceFixture({options: {quick: true}});
    quick.responses.set(
      commandKey({command: "node", args: ["--version"]}, quick.root),
      commandResult({code: 1, spawnError: "ENOENT"}),
    );

    await workspaceDoctorModule.run(quick.context);

    expect(
      quick.run.mock.calls.some(
        ([command]) => command.command === "where.exe" && command.args[0] === "node.exe",
      ),
    ).toBe(false);
  });

  it("does not run executable follow-ups when an installed command returns an invalid version", async () => {
    const fixture = await createWorkspaceFixture();
    fixture.responses.set(
      commandKey({command: "node", args: ["--version"]}, fixture.root),
      commandResult({stdout: "nightly\n"}),
    );

    const results = await workspaceDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "workspace.node-runtime")?.status).toBe("fail");
    expect(
      fixture.run.mock.calls.some(
        ([command]) => command.command === "where.exe" && command.args[0] === "node.exe",
      ),
    ).toBe(false);
  });

  it("reports missing config and mismatched or stale mirrored taxonomy artifacts without regenerating", async () => {
    const fixture = await createWorkspaceFixture();
    await rm(resolve(fixture.root, "nx.json"));
    const artifacts = getExpectedTaxonomyArtifactPaths(fixture.root);
    await writeFile(artifacts[1]!, "different mirror\n", "utf8");
    const staleAt = new Date("2026-08-27T00:00:00.000Z");
    await utimes(artifacts[2]!, staleAt, staleAt);

    const results = await workspaceDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "workspace.config-files")?.status).toBe("fail");
    const artifactsResult = results.find(({id}) => id === "workspace.generated-artifacts");
    expect(artifactsResult?.status).toBe("fail");
    expect(artifactsResult?.evidence.join("\n")).toMatch(/mirror|stale/iu);
    expect(
      fixture.run.mock.calls.some(
        ([command]) => command.command === process.execPath && command.args.some((argument) => argument.includes("generate")),
      ),
    ).toBe(false);
  });

  it("reclassifies a missing dependency directory with exactly one diagnosis form", async () => {
    const fixture = await createWorkspaceFixture();
    await rm(resolve(fixture.root, "node_modules"), {recursive: true});
    fixture.responses.set(
      commandKey({command: "npm", args: ["ls", "--all", "--json"]}, fixture.root),
      commandResult({code: 1, stderr: "npm error EACCES", stdout: '{"problems":[]}'}),
    );

    const results = await workspaceDoctorModule.run(fixture.context);
    const dependencies = results.find(({id}) => id === "workspace.root-dependencies");

    expect(dependencies).toMatchObject({
      status: "fail",
      potentialCauses: [
        {
          cause: "The dependency tree has not been restored for this checkout.",
          confidence: "high",
        },
      ],
    });
    expect(dependencies?.rootCause).toBeUndefined();
  });

  it.each([
    [
      "zero projects",
      commandResult({stdout: "[]"}),
      commandResult({stdout: healthyNxGraph()}),
      "workspace.nx-projects",
    ],
    [
      "malformed graph",
      commandResult({stdout: '["@arolariu/website","@arolariu/components"]'}),
      commandResult({stdout: "not-json"}),
      "workspace.nx-graph",
    ],
    [
      "dependency cycle",
      commandResult({stdout: '["@arolariu/website","@arolariu/components"]'}),
      commandResult({
        stdout: JSON.stringify({
          graph: {
            nodes: {"@arolariu/website": {}, "@arolariu/components": {}},
            dependencies: {
              "@arolariu/website": [{target: "@arolariu/components"}],
              "@arolariu/components": [{target: "@arolariu/website"}],
            },
          },
        }),
      }),
      "workspace.nx-graph",
    ],
    [
      "missing website-components edge",
      commandResult({stdout: '["@arolariu/website","@arolariu/components"]'}),
      commandResult({
        stdout: JSON.stringify({
          graph: {
            nodes: {"@arolariu/website": {}, "@arolariu/components": {}},
            dependencies: {"@arolariu/website": [], "@arolariu/components": []},
          },
        }),
      }),
      "workspace.nx-graph",
    ],
  ])("classifies %s as an explicit Nx failure", async (_title, projects, graph, failedId) => {
    const fixture = await createWorkspaceFixture();
    fixture.responses.set(
      commandKey({command: "npx", args: ["--no-install", "nx", "show", "projects", "--json"]}, fixture.root),
      projects,
    );
    fixture.responses.set(
      commandKey(
        {command: "npx", args: ["--no-install", "nx", "graph", "--print", "--open=false", "--watch=false"]},
        fixture.root,
      ),
      graph,
    );

    const results = await workspaceDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === failedId)?.status).toBe("fail");
  });

  it.each([
    [
      "critical vulnerabilities",
      commandResult({
        code: 1,
        stdout: JSON.stringify({
          metadata: {vulnerabilities: {info: 0, low: 0, moderate: 0, high: 1, critical: 1, total: 2}},
        }),
      }),
      "fail",
    ],
    [
      "moderate vulnerabilities",
      commandResult({
        code: 1,
        stdout: JSON.stringify({
          metadata: {vulnerabilities: {info: 0, low: 1, moderate: 1, high: 0, critical: 0, total: 2}},
        }),
      }),
      "warn",
    ],
    [
      "clean audit",
      commandResult({
        stdout: JSON.stringify({
          metadata: {vulnerabilities: {info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0}},
        }),
      }),
      "pass",
    ],
    ["offline audit", commandResult({code: 1, stderr: "npm error code ENOTFOUND"}), "skipped"],
    ["timed out audit", commandResult({code: 1, timedOut: true}), "skipped"],
    ["malformed audit", commandResult({code: 1, stdout: "not-json", stderr: "npm failed"}), "warn"],
  ])("classifies %s without discarding nonzero stdout", async (_title, audit, expectedStatus) => {
    const fixture = await createWorkspaceFixture();
    fixture.responses.set(commandKey({command: "npm", args: ["audit", "--json"]}, fixture.root), audit);

    const results = await workspaceDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "workspace.npm-audit")?.status).toBe(expectedStatus);
  });

  it("warns for available updates and passes a clean outdated payload", async () => {
    const outdated = await createWorkspaceFixture();
    outdated.responses.set(
      commandKey({command: "npm", args: ["outdated", "--json"]}, outdated.root),
      commandResult({
        code: 1,
        stdout: JSON.stringify({react: {current: "19.2.7", wanted: "19.2.8", latest: "19.2.8"}}),
      }),
    );

    const warningResults = await workspaceDoctorModule.run(outdated.context);
    expect(warningResults.find(({id}) => id === "workspace.npm-outdated")?.status).toBe("warn");

    const clean = await createWorkspaceFixture();
    const cleanResults = await workspaceDoctorModule.run(clean.context);
    expect(cleanResults.find(({id}) => id === "workspace.npm-outdated")?.status).toBe("pass");
  });

  it("returns explicit skipped online checks in quick mode without dispatching them", async () => {
    const fixture = await createWorkspaceFixture({options: {quick: true}});

    const results = await workspaceDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "workspace.npm-audit")?.status).toBe("skipped");
    expect(results.find(({id}) => id === "workspace.npm-outdated")?.status).toBe("skipped");
    expect(
      fixture.run.mock.calls.some(
        ([command]) => command.command === "npm" && (command.args[0] === "audit" || command.args[0] === "outdated"),
      ),
    ).toBe(false);
  });
});
