// @vitest-environment node
/**
 * @fileoverview Contract tests for bounded npm-tree and installed-package inspection facts.
 * @module scripts/inspection/packages.test
 */

import {mkdir, mkdtemp, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {CommandResult, CommandRunner} from "../common/process.ts";
import {createInspectionProbeRunner} from "./probes.ts";
import {
  INSPECTED_PACKAGE_NAMES,
  NPM_PROBLEM_FACT_LIMIT,
  REACT_INSPECTED_PACKAGE_NAMES,
  SVELTE_INSPECTED_PACKAGE_NAMES,
  createInstalledPackageProvider,
  createNpmTreeProvider,
} from "./packages.ts";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(async (root) => rm(root, {recursive: true, force: true})));
});

function commandResult(patch: Partial<CommandResult> = {}): CommandResult {
  return {
    code: 0,
    stdout: "",
    stderr: "",
    durationMs: 1,
    timedOut: false,
    ...patch,
  };
}

function clock(): () => number {
  let current = 100;
  return () => {
    current += 5;
    return current;
  };
}

function npmHarness(result: CommandResult): Readonly<{
  probes: ReturnType<typeof createInspectionProbeRunner>;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
}> {
  const run = vi.fn<CommandRunner["run"]>(async () => result);
  return {probes: createInspectionProbeRunner({run}), run};
}

async function createTemporaryRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

async function writePackageManifest(
  root: string,
  packageName: string,
  contents: string | Readonly<Record<string, unknown>>,
): Promise<string> {
  const packageRoot = join(root, "node_modules", ...packageName.split("/"));
  await mkdir(packageRoot, {recursive: true});
  await writeFile(
    join(packageRoot, "package.json"),
    typeof contents === "string" ? contents : JSON.stringify(contents),
    "utf8",
  );
  return packageRoot;
}

describe("createNpmTreeProvider", () => {
  it("counts 10,000 problems but retains only the bounded first facts", async () => {
    const problems = Array.from(
      {length: 10_000},
      (_, index) =>
        `missing: broken-package-${index.toString().padStart(4, "0")}@1.0.0, required by @arolariu/monorepo@0.0.0`,
    );
    const harness = npmHarness(
      commandResult({
        code: 1,
        stdout: JSON.stringify({
          name: "@arolariu/monorepo",
          dependencies: {
            alpha: {version: "1.0.0", dependencies: {beta: {version: "2.0.0"}}},
            gamma: {version: "3.0.0"},
          },
          problems,
        }),
      }),
    );
    const root = resolve(tmpdir(), "npm-tree-large-fixture");
    const provider = createNpmTreeProvider({scope: "root", root, probes: harness.probes, now: clock()});

    const outcome = await provider();

    expect(outcome.kind).toBe("available");
    if (outcome.kind !== "available") {
      return;
    }
    expect(outcome.value).toMatchObject({
      scope: "root",
      valid: false,
      packageCount: 3,
      problemCount: 10_000,
    });
    expect(outcome.value.problems).toHaveLength(NPM_PROBLEM_FACT_LIMIT);
    expect(outcome.value.problems[0]).toEqual({
      name: "broken-package-0000",
      code: "missing",
      detail: "npm reported missing for 'broken-package-0000'.",
    });
    expect(JSON.stringify(outcome.value)).not.toContain("broken-package-9999");
    expect(harness.run).toHaveBeenCalledOnce();
    expect(harness.run).toHaveBeenCalledWith(
      {command: "npm", args: ["ls", "--all", "--json"]},
      {cwd: root, timeoutMs: 15_000, output: "capture"},
    );
  });

  it("returns healthy facts for a successful valid dependency tree", async () => {
    const harness = npmHarness(
      commandResult({
        stdout: JSON.stringify({
          dependencies: {
            react: {version: "19.2.8"},
            next: {version: "16.3.0", dependencies: {"styled-jsx": {version: "5.1.6"}}},
          },
        }),
      }),
    );
    const provider = createNpmTreeProvider({
      scope: "github-scripts",
      root: resolve(tmpdir(), "github-scripts-fixture"),
      probes: harness.probes,
      now: clock(),
    });

    await expect(provider()).resolves.toEqual({
      kind: "available",
      value: {
        scope: "github-scripts",
        valid: true,
        packageCount: 3,
        problemCount: 0,
        problems: [],
      },
      durationMs: 5,
    });
  });

  it("keeps valid nonzero npm JSON as bounded dependency-problem facts", async () => {
    const rawPath = String.raw`C:\Users\secret-user\repository\node_modules\react`;
    const harness = npmHarness(
      commandResult({
        code: 1,
        stdout: JSON.stringify({
          dependencies: {react: {version: "0.0.0"}},
          problems: [`invalid: react@0.0.0 ${rawPath}`],
          error: {
            code: "ELSPROBLEMS",
            summary: "dependency summary raw-marker",
            detail: "full dependency list raw-detail-marker",
          },
        }),
        stderr: "native npm stderr raw-stderr-marker",
      }),
    );
    const provider = createNpmTreeProvider({
      scope: "root",
      root: resolve(tmpdir(), "npm-nonzero-fixture"),
      probes: harness.probes,
      now: clock(),
    });

    const outcome = await provider();

    expect(outcome.kind).toBe("available");
    if (outcome.kind !== "available") {
      return;
    }
    expect(outcome.value).toEqual({
      scope: "root",
      valid: false,
      packageCount: 1,
      problemCount: 1,
      problems: [{name: "react", code: "invalid", detail: "npm reported invalid for 'react'."}],
    });
    expect(JSON.stringify(outcome)).not.toMatch(/secret-user|raw-marker|raw-detail-marker|raw-stderr-marker/iu);
  });

  it.each([
    ["empty output", ""],
    ["malformed JSON", '{"raw":"raw-output-marker"'],
    ["a non-object document", JSON.stringify(["raw-output-marker"])],
    ["malformed dependency data", JSON.stringify({raw: "raw-output-marker", dependencies: []})],
    ["malformed problem data", JSON.stringify({raw: "raw-output-marker", problems: [42]})],
  ])("returns invalid without retaining raw output for %s", async (_case, stdout) => {
    const harness = npmHarness(commandResult({stdout}));
    const provider = createNpmTreeProvider({
      scope: "root",
      root: resolve(tmpdir(), "npm-invalid-fixture"),
      probes: harness.probes,
      now: clock(),
    });

    const outcome = await provider();

    expect(outcome.kind).toBe("invalid");
    expect(JSON.stringify(outcome)).not.toContain("raw-output-marker");
  });

  it.each([
    ["missing executable", commandResult({code: 1, spawnError: "spawn raw-spawn-marker"})],
    ["timeout", commandResult({code: 1, timedOut: true, stderr: "raw-timeout-marker"})],
    ["signal", commandResult({code: 1, signal: "SIGTERM", stderr: "raw-signal-marker"})],
  ])("returns unavailable without retaining native output after %s", async (_case, result) => {
    const harness = npmHarness(result);
    const provider = createNpmTreeProvider({
      scope: "root",
      root: resolve(tmpdir(), "npm-unavailable-fixture"),
      probes: harness.probes,
      now: clock(),
    });

    const outcome = await provider();

    expect(outcome.kind).toBe("unavailable");
    expect(JSON.stringify(outcome)).not.toMatch(/raw-(?:spawn|timeout|signal)-marker/iu);
  });
});

describe("package-name inventory", () => {
  it("exports the exhaustive deterministic React and Svelte package union", () => {
    expect(REACT_INSPECTED_PACKAGE_NAMES).toEqual([
      "react",
      "react-dom",
      "next",
      "@clerk/nextjs",
      "@docusaurus/core",
      "@playwright/test",
      "playwright",
      "@arolariu/components",
    ]);
    expect(SVELTE_INSPECTED_PACKAGE_NAMES).toEqual([
      "@sveltejs/kit",
      "@sveltejs/vite-plugin-svelte",
      "svelte",
      "svelte-adapter-azure-swa",
      "vite",
      "vitest",
      "typescript",
    ]);
    expect(INSPECTED_PACKAGE_NAMES).toEqual([
      "react",
      "react-dom",
      "next",
      "@clerk/nextjs",
      "@docusaurus/core",
      "@playwright/test",
      "playwright",
      "@arolariu/components",
      "@sveltejs/kit",
      "@sveltejs/vite-plugin-svelte",
      "svelte",
      "svelte-adapter-azure-swa",
      "vite",
      "vitest",
      "typescript",
    ]);
    expect(new Set(INSPECTED_PACKAGE_NAMES).size).toBe(INSPECTED_PACKAGE_NAMES.length);
  });
});

describe("createInstalledPackageProvider", () => {
  it("reads only requested metadata and normalizes a workspace-link root", async () => {
    const root = await createTemporaryRoot("arolariu-packages-");
    await writePackageManifest(root, "react", {name: "react", version: "19.2.8"});
    await writePackageManifest(root, "unrequested-broken-package", "{ definitely-not-json");

    const workspaceRoot = join(root, "packages", "components");
    await mkdir(workspaceRoot, {recursive: true});
    await writeFile(
      join(workspaceRoot, "package.json"),
      JSON.stringify({name: "@arolariu/components", version: "2.2.0"}),
      "utf8",
    );
    const linkRoot = join(root, "node_modules", "@arolariu", "components");
    await mkdir(dirname(linkRoot), {recursive: true});
    await symlink(workspaceRoot, linkRoot, "junction");

    const provider = createInstalledPackageProvider({
      root,
      packageNames: ["react", "@arolariu/components"],
      now: clock(),
    });

    await expect(provider()).resolves.toEqual({
      kind: "available",
      value: {
        installed: {
          "@arolariu/components": {version: "2.2.0", workspaceRoot: "packages/components"},
          react: {version: "19.2.8"},
        },
        malformed: [],
      },
      durationMs: 5,
    });
  });

  it.each([
    ["invalid JSON", "{ package-json-raw-marker"],
    ["a non-object document", "[]"],
    ["a mismatched package name", JSON.stringify({name: "not-react", version: "19.2.8"})],
    ["a missing version", JSON.stringify({name: "react"})],
    ["a blank version", JSON.stringify({name: "react", version: "  "})],
  ])("returns invalid partial inventory for requested metadata with %s", async (_case, contents) => {
    const root = await createTemporaryRoot("arolariu-packages-malformed-");
    await writePackageManifest(root, "react", contents);
    await writePackageManifest(root, "next", {name: "next", version: "16.3.0"});
    const provider = createInstalledPackageProvider({
      root,
      packageNames: ["react", "next"],
      now: clock(),
    });

    const outcome = await provider();

    expect(outcome.kind).toBe("invalid");
    if (outcome.kind !== "invalid") {
      return;
    }
    expect(outcome.issues).toEqual(["Installed package metadata is malformed for 'react'."]);
    expect("partial" in outcome).toBe(false);
    expect(JSON.stringify(outcome)).not.toContain("package-json-raw-marker");
  });

  it("represents a missing requested package as an available empty inventory", async () => {
    const root = await createTemporaryRoot("arolariu-packages-missing-");
    const provider = createInstalledPackageProvider({
      root,
      packageNames: ["react"],
      now: clock(),
    });

    await expect(provider()).resolves.toEqual({
      kind: "available",
      value: {installed: {}, malformed: []},
      durationMs: 5,
    });
  });
});
