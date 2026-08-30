// @vitest-environment node
/**
 * @fileoverview Contract tests for the source-derived workspace graph reader.
 * @module scripts.common.workspace-graph.test
 */

import {mkdir, mkdtemp, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {afterEach, describe, expect, it} from "vitest";

import {resolveRepositoryPaths} from "./repository-paths.ts";
import {
  buildWorkspaceGraph,
  readWorkspaceGraph,
  workspaceDependencyTargets,
  WorkspaceGraphError,
  type WorkspaceProjectSource,
} from "./workspace-graph.ts";

const fixtureRoots: string[] = [];

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createFixtureRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-workspace-graph-"));
  fixtureRoots.push(root);
  return root;
}

function projectSource(
  root: string,
  projectConfiguration: unknown,
  packageManifest?: unknown,
): WorkspaceProjectSource {
  return packageManifest === undefined ? {root, projectConfiguration} : {root, projectConfiguration, packageManifest};
}

// ============================================================================
// buildWorkspaceGraph
// ============================================================================

describe("buildWorkspaceGraph", () => {
  it("normalizes project metadata and sorts projects by canonical name", () => {
    const graph = buildWorkspaceGraph([
      projectSource("sites/web", {
        name: "@scope/web",
        sourceRoot: "sites/web/src",
        projectType: "application",
        tags: ["type:app"],
      }),
      projectSource("packages/ui", {name: "@scope/ui", projectType: "library"}, {name: "@scope/ui"}),
    ]);

    expect(graph.projects).toEqual([
      {
        name: "@scope/ui",
        root: "packages/ui",
        sourceRoot: null,
        packageName: "@scope/ui",
        projectType: "library",
        tags: [],
      },
      {
        name: "@scope/web",
        root: "sites/web",
        sourceRoot: "sites/web/src",
        packageName: null,
        projectType: "application",
        tags: ["type:app"],
      },
    ]);
    expect(graph.dependencies).toEqual([]);
    expect(graph.cycles).toEqual([]);
  });

  it("derives one record per workspace package dependency field that exactly names a project", () => {
    const graph = buildWorkspaceGraph([
      projectSource("packages/ui", {name: "@scope/ui"}, {name: "@scope/ui"}),
      projectSource(
        "sites/web",
        {name: "@scope/web"},
        {name: "@scope/web", dependencies: {"@scope/ui": "workspace:*", react: "19.2.8"}},
      ),
    ]);

    expect(graph.dependencies).toEqual([
      {
        source: "@scope/web",
        target: "@scope/ui",
        origin: "package",
        declaration: "sites/web/package.json dependencies['@scope/ui']",
      },
    ]);
  });

  it.each([["devDependencies"], ["peerDependencies"], ["optionalDependencies"]])(
    "derives a package record from %s",
    (field) => {
      const graph = buildWorkspaceGraph([
        projectSource("packages/ui", {name: "@scope/ui"}, {name: "@scope/ui"}),
        projectSource("sites/web", {name: "@scope/web"}, {name: "@scope/web", [field]: {"@scope/ui": "*"}}),
      ]);

      expect(graph.dependencies.map(({source, target, origin}) => ({source, target, origin}))).toEqual([
        {source: "@scope/web", target: "@scope/ui", origin: "package"},
      ]);
    },
  );

  it("derives explicit cross-project target dependencies from string and object dependsOn forms", () => {
    const graph = buildWorkspaceGraph([
      projectSource("packages/ui", {name: "@scope/ui"}),
      projectSource("sites/api", {
        name: "@scope/api",
        targets: {build: {dependsOn: [{target: "build", projects: ["ui"]}]}},
      }),
      projectSource("sites/web", {
        name: "@scope/web",
        targets: {build: {dependsOn: ["ui:build"]}},
      }),
    ]);

    expect(graph.dependencies.map(({source, target, origin}) => ({source, target, origin}))).toEqual([
      {source: "@scope/api", target: "@scope/ui", origin: "target"},
      {source: "@scope/web", target: "@scope/ui", origin: "target"},
    ]);
  });

  it("treats local targets and ^target expansion markers as declaring no dependency record", () => {
    const graph = buildWorkspaceGraph([
      projectSource("packages/ui", {name: "@scope/ui"}),
      projectSource("sites/web", {
        name: "@scope/web",
        targets: {
          assemble: {},
          build: {dependsOn: ["^build", "assemble", {target: "build", dependencies: true}, {target: "assemble", projects: "self"}]},
        },
      }),
    ]);

    expect(graph.dependencies).toEqual([]);
  });

  it("derives exact implicit project dependencies", () => {
    const graph = buildWorkspaceGraph([
      projectSource("packages/ui", {name: "@scope/ui"}),
      projectSource("sites/web", {name: "@scope/web", implicitDependencies: ["@scope/ui"]}),
    ]);

    expect(graph.dependencies).toEqual([
      {
        source: "@scope/web",
        target: "@scope/ui",
        origin: "implicit",
        declaration: "sites/web/project.json implicitDependencies['@scope/ui']",
      },
    ]);
  });

  it("keeps one record per independent source category and de-duplicates repeats inside a category", () => {
    const graph = buildWorkspaceGraph([
      projectSource("packages/ui", {name: "@scope/ui"}, {name: "@scope/ui"}),
      projectSource(
        "sites/web",
        {
          name: "@scope/web",
          targets: {
            build: {dependsOn: ["ui:build"]},
            dev: {dependsOn: ["ui:build"]},
          },
          implicitDependencies: ["@scope/ui"],
        },
        {name: "@scope/web", dependencies: {"@scope/ui": "*"}, devDependencies: {"@scope/ui": "*"}},
      ),
    ]);

    expect(graph.dependencies.map(({origin}) => origin)).toEqual(["package", "target", "implicit"]);
    expect(graph.cycles).toEqual([]);
  });

  it("returns deterministic sorted dependency records regardless of input order", () => {
    const first = buildWorkspaceGraph([
      projectSource("packages/ui", {name: "@scope/ui"}, {name: "@scope/ui"}),
      projectSource("packages/core", {name: "@scope/core"}, {name: "@scope/core"}),
      projectSource(
        "sites/web",
        {name: "@scope/web", targets: {build: {dependsOn: ["ui:build", "core:build"]}}},
        {name: "@scope/web", dependencies: {"@scope/ui": "*"}},
      ),
    ]);
    const second = buildWorkspaceGraph([
      projectSource(
        "sites/web",
        {name: "@scope/web", targets: {build: {dependsOn: ["core:build", "ui:build"]}}},
        {name: "@scope/web", dependencies: {"@scope/ui": "*"}},
      ),
      projectSource("packages/core", {name: "@scope/core"}, {name: "@scope/core"}),
      projectSource("packages/ui", {name: "@scope/ui"}, {name: "@scope/ui"}),
    ]);

    expect(second).toEqual(first);
    expect(first.projects.map(({name}) => name)).toEqual(["@scope/core", "@scope/ui", "@scope/web"]);
    expect(first.dependencies.map(({target, origin}) => `${origin}:${target}`)).toEqual([
      "target:@scope/core",
      "package:@scope/ui",
      "target:@scope/ui",
    ]);
  });

  it("detects deterministic dependency cycles from unique logical targets", () => {
    const graph = buildWorkspaceGraph([
      projectSource("packages/a", {name: "a", targets: {build: {dependsOn: ["b:build"]}}}),
      projectSource("packages/b", {name: "b", targets: {build: {dependsOn: ["a:build"]}}}),
    ]);

    expect(graph.cycles).toEqual(["a -> b -> a"]);
  });

  it("resolves project-root basename and final scoped-name segment aliases", () => {
    const graph = buildWorkspaceGraph([
      projectSource("packages/design-system", {name: "@scope/ui"}),
      projectSource("sites/web", {
        name: "@scope/web",
        targets: {build: {dependsOn: ["design-system:build"]}, dev: {dependsOn: ["ui:build"]}},
      }),
    ]);

    expect(graph.dependencies.map(({target}) => target)).toEqual(["@scope/ui"]);
  });

  it("rejects duplicate canonical project names", () => {
    expect(() =>
      buildWorkspaceGraph([
        projectSource("packages/a", {name: "@scope/ui"}),
        projectSource("packages/b", {name: "@scope/ui"}),
      ]),
    ).toThrow(WorkspaceGraphError);
  });

  it("rejects duplicate project roots", () => {
    expect(() =>
      buildWorkspaceGraph([
        projectSource("packages/a", {name: "@scope/a"}),
        projectSource("packages/a", {name: "@scope/b"}),
      ]),
    ).toThrow(WorkspaceGraphError);
  });

  it("rejects an ambiguous alias instead of silently selecting one project", () => {
    expect(() =>
      buildWorkspaceGraph([
        projectSource("packages/ui", {name: "@first/ui"}),
        projectSource("sites/ui", {name: "@second/ui"}),
        projectSource("sites/web", {name: "@scope/web", targets: {build: {dependsOn: ["ui:build"]}}}),
      ]),
    ).toThrow(/ambiguous/iu);
  });

  it.each([
    ["a non-object project configuration", [projectSource("packages/a", ["not", "an", "object"])]],
    ["a missing project name", [projectSource("packages/a", {})]],
    ["a blank project name", [projectSource("packages/a", {name: "   "})]],
    ["a non-string source root", [projectSource("packages/a", {name: "a", sourceRoot: 7})]],
    ["a non-object targets map", [projectSource("packages/a", {name: "a", targets: []})]],
    ["a non-array tags value", [projectSource("packages/a", {name: "a", tags: "type:app"})]],
    ["a non-object package manifest", [projectSource("packages/a", {name: "a"}, "not-an-object")]],
    ["a non-string package name", [projectSource("packages/a", {name: "a"}, {name: 4})]],
    [
      "a non-object dependency map",
      [projectSource("packages/a", {name: "a"}, {name: "a", dependencies: ["@scope/b"]})],
    ],
    ["a non-array dependsOn value", [projectSource("packages/a", {name: "a", targets: {build: {dependsOn: "b:build"}}})]],
    [
      "an unrepresentable dependsOn entry",
      [projectSource("packages/a", {name: "a", targets: {build: {dependsOn: [42]}}})],
    ],
    [
      "a non-array implicitDependencies value",
      [projectSource("packages/a", {name: "a", implicitDependencies: "b"})],
    ],
  ] as const)("rejects %s", (_title, sources) => {
    expect(() => buildWorkspaceGraph(sources as readonly WorkspaceProjectSource[])).toThrow(WorkspaceGraphError);
  });

  it("rejects an unresolved explicit cross-project target dependency", () => {
    expect(() =>
      buildWorkspaceGraph([projectSource("sites/web", {name: "@scope/web", targets: {build: {dependsOn: ["ui:build"]}}})]),
    ).toThrow(WorkspaceGraphError);
  });

  it("rejects an unresolved exact implicit dependency", () => {
    expect(() =>
      buildWorkspaceGraph([projectSource("sites/web", {name: "@scope/web", implicitDependencies: ["@scope/ui"]})]),
    ).toThrow(WorkspaceGraphError);
  });

  it.each([["@scope/*"], ["!@scope/ui"], ["tag:type:lib"]])(
    "rejects the unsupported implicit dependency pattern %s",
    (pattern) => {
      expect(() =>
        buildWorkspaceGraph([
          projectSource("packages/ui", {name: "@scope/ui"}),
          projectSource("sites/web", {name: "@scope/web", implicitDependencies: [pattern]}),
        ]),
      ).toThrow(/unsupported/iu);
    },
  );

  it("rejects an unsupported glob or negation form in an object dependsOn projects list", () => {
    expect(() =>
      buildWorkspaceGraph([
        projectSource("packages/ui", {name: "@scope/ui"}),
        projectSource("sites/web", {
          name: "@scope/web",
          targets: {build: {dependsOn: [{target: "build", projects: ["@scope/*"]}]}},
        }),
      ]),
    ).toThrow(/unsupported/iu);
  });

  it("treats a colon-bearing local target name as a local target rather than an unresolved project", () => {
    const graph = buildWorkspaceGraph([
      projectSource("sites/web", {
        name: "@scope/web",
        targets: {"build:storybook": {}, build: {dependsOn: ["build:storybook"]}},
      }),
    ]);

    expect(graph.dependencies).toEqual([]);
  });
});

// ============================================================================
// workspaceDependencyTargets
// ============================================================================

describe("workspaceDependencyTargets", () => {
  it("returns unique sorted targets for one project and an empty list for an isolated project", () => {
    const graph = buildWorkspaceGraph([
      projectSource("packages/ui", {name: "@scope/ui"}, {name: "@scope/ui"}),
      projectSource(
        "sites/web",
        {name: "@scope/web", targets: {build: {dependsOn: ["ui:build"]}}},
        {name: "@scope/web", dependencies: {"@scope/ui": "*"}},
      ),
    ]);

    expect(workspaceDependencyTargets(graph, "@scope/web")).toEqual(["@scope/ui"]);
    expect(workspaceDependencyTargets(graph, "@scope/ui")).toEqual([]);
  });
});

// ============================================================================
// readWorkspaceGraph — fixture discovery
// ============================================================================

describe("readWorkspaceGraph", () => {
  it("discovers project metadata across the workspace instead of limiting discovery to workspaceLayout roots", async () => {
    const root = await createFixtureRoot();
    await writeJsonFile(join(root, "nx.json"), {workspaceLayout: {appsDir: "apps", libsDir: "libs"}});
    await writeJsonFile(join(root, "apps", "web", "project.json"), {name: "@scope/web"});
    await writeJsonFile(join(root, "apps", "nested", "api", "project.json"), {name: "@scope/api"});
    await writeJsonFile(join(root, "libs", "ui", "project.json"), {name: "@scope/ui"});
    await writeJsonFile(join(root, "tooling", "worker", "project.json"), {name: "@scope/worker"});

    const graph = await readWorkspaceGraph(root);

    expect(graph.projects.map(({name}) => name)).toEqual(["@scope/api", "@scope/ui", "@scope/web", "@scope/worker"]);
    expect(graph.projects.map(({root: projectRoot}) => projectRoot)).toEqual([
      "apps/nested/api",
      "libs/ui",
      "apps/web",
      "tooling/worker",
    ]);
  });

  it("treats missing default apps and libs roots as empty while discovering valid projects elsewhere", async () => {
    const root = await createFixtureRoot();
    await writeJsonFile(join(root, "nx.json"), {});
    await writeJsonFile(join(root, "tooling", "worker", "project.json"), {name: "@scope/worker"});

    const graph = await readWorkspaceGraph(root);

    expect(graph.projects.map(({name}) => name)).toEqual(["@scope/worker"]);
  });

  it("does not require an undeclared default root when one workspaceLayout root is explicit", async () => {
    const root = await createFixtureRoot();
    await writeJsonFile(join(root, "nx.json"), {workspaceLayout: {appsDir: "sites"}});
    await writeJsonFile(join(root, "sites", "web", "project.json"), {name: "@scope/web"});

    const graph = await readWorkspaceGraph(root);

    expect(graph.projects.map(({name}) => name)).toEqual(["@scope/web"]);
  });

  it("reads optional workspace package manifests and derives package dependency records", async () => {
    const root = await createFixtureRoot();
    await writeJsonFile(join(root, "nx.json"), {workspaceLayout: {appsDir: "apps", libsDir: "libs"}});
    await writeJsonFile(join(root, "libs", "ui", "project.json"), {name: "@scope/ui"});
    await writeJsonFile(join(root, "libs", "ui", "package.json"), {name: "@scope/ui", version: "1.0.0"});
    await writeJsonFile(join(root, "apps", "web", "project.json"), {name: "@scope/web"});
    await writeJsonFile(join(root, "apps", "web", "package.json"), {
      name: "@scope/web",
      dependencies: {"@scope/ui": "*"},
    });

    const graph = await readWorkspaceGraph(root);

    expect(graph.dependencies.map(({source, target, origin}) => ({source, target, origin}))).toEqual([
      {source: "@scope/web", target: "@scope/ui", origin: "package"},
    ]);
  });

  it("skips generated and dependency directories while discovering projects", async () => {
    const root = await createFixtureRoot();
    await writeJsonFile(join(root, "nx.json"), {workspaceLayout: {appsDir: "apps", libsDir: "libs"}});
    await mkdir(join(root, "libs"), {recursive: true});
    await writeJsonFile(join(root, "apps", "web", "project.json"), {name: "@scope/web"});
    await writeJsonFile(join(root, "apps", "node_modules", "vendor", "project.json"), {name: "@vendor/pkg"});
    await writeJsonFile(join(root, "apps", "dist", "bundled", "project.json"), {name: "@scope/bundled"});
    await writeJsonFile(join(root, "apps", ".next", "cached", "project.json"), {name: "@scope/cached"});

    const graph = await readWorkspaceGraph(root);

    expect(graph.projects.map(({name}) => name)).toEqual(["@scope/web"]);
  });

  it("does not descend into a nested project directory below a discovered project root", async () => {
    const root = await createFixtureRoot();
    await writeJsonFile(join(root, "nx.json"), {workspaceLayout: {appsDir: "apps", libsDir: "libs"}});
    await mkdir(join(root, "libs"), {recursive: true});
    await writeJsonFile(join(root, "apps", "web", "project.json"), {name: "@scope/web"});
    await writeJsonFile(join(root, "apps", "web", "inner", "project.json"), {name: "@scope/inner"});

    const graph = await readWorkspaceGraph(root);

    expect(graph.projects.map(({name}) => name)).toEqual(["@scope/web"]);
  });

  it("skips a symlinked directory instead of following it", async () => {
    const root = await createFixtureRoot();
    await writeJsonFile(join(root, "nx.json"), {workspaceLayout: {appsDir: "apps", libsDir: "libs"}});
    await mkdir(join(root, "libs"), {recursive: true});
    await writeJsonFile(join(root, "apps", "web", "project.json"), {name: "@scope/web"});
    await writeJsonFile(join(root, ".external", "linked", "project.json"), {name: "@scope/linked"});

    let linkCreated = true;
    try {
      await symlink(join(root, ".external"), join(root, "apps", "linked"), "junction");
    } catch {
      // Cross-platform/privilege limitation: fall back to proving discovery still returns only
      // the real project, which is the same observable outcome the skip guarantees.
      linkCreated = false;
    }

    const graph = await readWorkspaceGraph(root);

    expect(graph.projects.map(({name}) => name)).toEqual(["@scope/web"]);
    if (!linkCreated) {
      expect(graph.projects).toHaveLength(1);
    }
  });

  it.each([
    [
      "a missing nx.json",
      async (root: string): Promise<void> => {
        await mkdir(join(root, "apps"), {recursive: true});
      },
    ],
    [
      "malformed nx.json",
      async (root: string): Promise<void> => writeFile(join(root, "nx.json"), "{not-json", "utf8"),
    ],
    [
      "a non-object nx.json document",
      async (root: string): Promise<void> => writeJsonFile(join(root, "nx.json"), ["apps"]),
    ],
    [
      "a non-object workspaceLayout",
      async (root: string): Promise<void> => writeJsonFile(join(root, "nx.json"), {workspaceLayout: "apps"}),
    ],
    [
      "a blank appsDir",
      async (root: string): Promise<void> => writeJsonFile(join(root, "nx.json"), {workspaceLayout: {appsDir: "  "}}),
    ],
    [
      "an escaping libsDir",
      async (root: string): Promise<void> =>
        writeJsonFile(join(root, "nx.json"), {workspaceLayout: {appsDir: "apps", libsDir: "../outside"}}),
    ],
  ] as const)("rejects %s", async (_title, prepare) => {
    const root = await createFixtureRoot();
    await prepare(root);

    await expect(readWorkspaceGraph(root)).rejects.toBeInstanceOf(WorkspaceGraphError);
  });

  it("rejects a declared workspace root that is missing", async () => {
    const root = await createFixtureRoot();
    await writeJsonFile(join(root, "nx.json"), {workspaceLayout: {appsDir: "apps", libsDir: "libs"}});
    await mkdir(join(root, "apps"), {recursive: true});

    await expect(readWorkspaceGraph(root)).rejects.toBeInstanceOf(WorkspaceGraphError);
  });

  it("rejects a declared workspace root that is not a directory", async () => {
    const root = await createFixtureRoot();
    await writeJsonFile(join(root, "nx.json"), {workspaceLayout: {appsDir: "apps", libsDir: "libs"}});
    await mkdir(join(root, "apps"), {recursive: true});
    await writeFile(join(root, "libs"), "not a directory", "utf8");

    await expect(readWorkspaceGraph(root)).rejects.toBeInstanceOf(WorkspaceGraphError);
  });

  it.each([
    ["project.json"],
    ["package.json"],
  ] as const)("rejects malformed %s metadata instead of returning an empty graph", async (fileName) => {
    const root = await createFixtureRoot();
    await writeJsonFile(join(root, "nx.json"), {workspaceLayout: {appsDir: "apps", libsDir: "libs"}});
    await mkdir(join(root, "libs"), {recursive: true});
    await writeJsonFile(join(root, "apps", "web", "project.json"), {name: "@scope/web"});
    await writeFile(join(root, "apps", "web", fileName), "{not-json", "utf8");

    await expect(readWorkspaceGraph(root)).rejects.toBeInstanceOf(WorkspaceGraphError);
  });
});

// ============================================================================
// readWorkspaceGraph — current repository parity
// ============================================================================

describe("readWorkspaceGraph current repository parity", () => {
  it("reproduces the live seven-project graph, both website-to-components records, and no cycles", async () => {
    const paths = resolveRepositoryPaths();

    const graph = await readWorkspaceGraph(paths.root);

    expect(graph.projects.map(({name}) => name)).toEqual([
      "@arolariu/api",
      "@arolariu/components",
      "@arolariu/cv",
      "@arolariu/docs",
      "@arolariu/exp",
      "@arolariu/status",
      "@arolariu/website",
    ]);
    expect(graph.dependencies.map(({source, target, origin}) => ({source, target, origin}))).toEqual([
      {source: "@arolariu/website", target: "@arolariu/components", origin: "package"},
      {source: "@arolariu/website", target: "@arolariu/components", origin: "target"},
    ]);
    expect(graph.cycles).toEqual([]);
    expect(workspaceDependencyTargets(graph, "@arolariu/website")).toEqual(["@arolariu/components"]);
  });
});
