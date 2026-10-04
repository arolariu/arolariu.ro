// @vitest-environment node
/**
 * @fileoverview Contract tests for bounded npm-tree and installed-package inspection facts.
 * @module scripts/inspection/packages.test
 */

import {mkdir, mkdtemp, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";

import {Effect} from "effect";
import {TestClock} from "effect/testing";
import {afterEach, describe, expect, it, vi} from "vitest";

import {makeTestLayer, runScoped, scriptedOutcomes, type ProbeOutcomeResponder} from "../platform/testing.ts";
import {inspectionProbeRunner, type ProbeOutcome} from "./probes.ts";
import type {InspectionOutcome, InspectionProvider} from "./types.ts";
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

/** Output fields every scripted probe outcome carries. */
type ProbeOutput = Pick<ProbeOutcome, "stdout" | "stderr" | "durationMs">;

function succeeded(patch: Partial<ProbeOutput> = {}): ProbeOutcome {
  return {kind: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 1, ...patch};
}

function exited(exitCode: number, patch: Partial<ProbeOutput> = {}): ProbeOutcome {
  return {kind: "exited", exitCode, stdout: "", stderr: "", durationMs: 1, ...patch};
}

function spawnFailed(message: string, patch: Partial<ProbeOutput> = {}): ProbeOutcome {
  return {kind: "spawn-failed", message, stdout: "", stderr: "", durationMs: 1, ...patch};
}

function timedOut(patch: Partial<ProbeOutput> = {}): ProbeOutcome {
  return {kind: "timed-out", stdout: "", stderr: "", durationMs: 1, ...patch};
}

function signalled(signal: NodeJS.Signals, patch: Partial<ProbeOutput> = {}): ProbeOutcome {
  return {kind: "signalled", signal, stdout: "", stderr: "", durationMs: 1, ...patch};
}

/**
 * Runs a provider over the real filesystem (fixtures live in real temporary directories), the test
 * clock, and the scripted processes.
 *
 * @param provider - The provider under test.
 * @param respond - Answers every process request; unscripted by default.
 * @returns The provider outcome.
 */
async function invokeProvider<T>(provider: InspectionProvider<T>, respond?: ProbeOutcomeResponder): Promise<InspectionOutcome<T>> {
  const harness = makeTestLayer({fileSystem: "node", processes: respond === undefined ? [] : [scriptedOutcomes(respond)]});
  return runScoped(provider, harness.layer);
}

function npmHarness(outcome: ProbeOutcome): Readonly<{
  probes: typeof inspectionProbeRunner;
  run: ReturnType<typeof vi.fn<ProbeOutcomeResponder>>;
  invoke: <T>(provider: InspectionProvider<T>) => Promise<InspectionOutcome<T>>;
}> {
  const run = vi.fn<ProbeOutcomeResponder>(async () => outcome);
  return {probes: inspectionProbeRunner, run, invoke: async (provider) => invokeProvider(provider, run)};
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
      exited(1, {
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
    const provider = createNpmTreeProvider({scope: "root", root, probes: harness.probes});

    const outcome = await harness.invoke(provider);

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
      succeeded({
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
    });

    await expect(harness.invoke(provider)).resolves.toEqual({
      kind: "available",
      value: {
        scope: "github-scripts",
        valid: true,
        packageCount: 3,
        problemCount: 0,
        problems: [],
      },
      durationMs: 0,
    });
  });

  it("executes a fresh named probe for each provider invocation", async () => {
    const harness = npmHarness(succeeded({stdout: JSON.stringify({dependencies: {}})}));
    const provider = createNpmTreeProvider({
      scope: "root",
      root: resolve(tmpdir(), "npm-provider-reuse-fixture"),
      probes: harness.probes,
    });

    await expect(harness.invoke(provider)).resolves.toMatchObject({kind: "available"});
    await expect(harness.invoke(provider)).resolves.toMatchObject({kind: "available"});

    expect(harness.run).toHaveBeenCalledTimes(2);
  });

  it("measures duration across the npm probe and its JSON projection", async () => {
    const harness = makeTestLayer({
      fileSystem: "node",
      processes: [
        {
          match: () => true,
          respond: () =>
            TestClock.adjust("5 millis").pipe(
              Effect.as({stdout: JSON.stringify({dependencies: {react: {version: "19.2.8"}}}), stderr: "", durationMs: 5}),
            ),
        },
      ],
    });
    const provider = createNpmTreeProvider({
      scope: "root",
      root: resolve(tmpdir(), "npm-duration-fixture"),
      probes: inspectionProbeRunner,
    });

    const outcome = await runScoped(provider, harness.layer);

    expect(outcome).toMatchObject({kind: "available", value: {packageCount: 1}, durationMs: 5});
  });

  it("keeps valid nonzero npm JSON as bounded dependency-problem facts", async () => {
    const rawPath = String.raw`C:\Users\secret-user\repository\node_modules\react`;
    const harness = npmHarness(
      exited(1, {
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
    });

    const outcome = await harness.invoke(provider);

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

  it("uses a top-level npm error only when no concrete problem entry exists", async () => {
    const harness = npmHarness(
      exited(1, {
        stdout: JSON.stringify({
          error: {code: "EJSONPARSE", summary: "raw-summary-marker", detail: "raw-detail-marker"},
        }),
      }),
    );
    const provider = createNpmTreeProvider({
      scope: "root",
      root: resolve(tmpdir(), "npm-error-fallback-fixture"),
      probes: harness.probes,
    });

    const outcome = await harness.invoke(provider);

    expect(outcome).toMatchObject({
      kind: "available",
      value: {
        valid: false,
        problemCount: 1,
        problems: [{code: "EJSONPARSE", detail: "npm reported EJSONPARSE."}],
      },
    });
    expect(JSON.stringify(outcome)).not.toMatch(/raw-(?:summary|detail)-marker/iu);
  });

  it.each([
    ["empty output", ""],
    ["malformed JSON", '{"raw":"raw-output-marker"'],
    ["a non-object document", JSON.stringify(["raw-output-marker"])],
    ["malformed dependency data", JSON.stringify({raw: "raw-output-marker", dependencies: []})],
    ["malformed problem data", JSON.stringify({raw: "raw-output-marker", problems: [42]})],
  ])("returns invalid without retaining raw output for %s", async (_case, stdout) => {
    const harness = npmHarness(succeeded({stdout}));
    const provider = createNpmTreeProvider({
      scope: "root",
      root: resolve(tmpdir(), "npm-invalid-fixture"),
      probes: harness.probes,
    });

    const outcome = await harness.invoke(provider);

    expect(outcome.kind).toBe("invalid");
    expect(JSON.stringify(outcome)).not.toContain("raw-output-marker");
  });

  it.each([
    ["missing executable", spawnFailed("spawn raw-spawn-marker")],
    ["timeout", timedOut({stderr: "raw-timeout-marker"})],
    ["signal", signalled("SIGTERM", {stderr: "raw-signal-marker"})],
  ])("returns unavailable without retaining native output after %s", async (_case, result) => {
    const harness = npmHarness(result);
    const provider = createNpmTreeProvider({
      scope: "root",
      root: resolve(tmpdir(), "npm-unavailable-fixture"),
      probes: harness.probes,
    });

    const outcome = await harness.invoke(provider);

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
    const unrequestedRoot = join(root, "node_modules", "unrequested-broken-package", "package.json");
    await mkdir(unrequestedRoot, {recursive: true});

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
    });

    await expect(invokeProvider(provider)).resolves.toEqual({
      kind: "available",
      value: {
        installed: {
          "@arolariu/components": {version: "2.2.0", workspaceRoot: "packages/components"},
          react: {version: "19.2.8"},
        },
        malformed: [],
      },
      durationMs: 0,
    });
  });

  it("does not expose an absolute root for a package link outside the repository", async () => {
    const root = await createTemporaryRoot("arolariu-packages-external-link-");
    const externalRoot = await createTemporaryRoot("arolariu-packages-external-target-");
    await writeFile(
      join(externalRoot, "package.json"),
      JSON.stringify({name: "linked-package", version: "1.2.3"}),
      "utf8",
    );
    const linkRoot = join(root, "node_modules", "linked-package");
    await mkdir(dirname(linkRoot), {recursive: true});
    await symlink(externalRoot, linkRoot, "junction");
    const provider = createInstalledPackageProvider({
      root,
      packageNames: ["linked-package"],
    });

    const outcome = await invokeProvider(provider);

    expect(outcome).toEqual({
      kind: "available",
      value: {installed: {"linked-package": {version: "1.2.3"}}, malformed: []},
      durationMs: 0,
    });
    expect(JSON.stringify(outcome)).not.toContain(externalRoot);
  });

  it.each([
    ["invalid JSON", "{ package-json-raw-marker"],
    ["a non-object document", "[]"],
    ["a mismatched package name", JSON.stringify({name: "not-react", version: "19.2.8"})],
    ["a missing version", JSON.stringify({name: "react"})],
    ["a blank version", JSON.stringify({name: "react", version: "  "})],
    ["a control-character version", JSON.stringify({name: "react", version: "19.2.8\nraw-version-marker"})],
    ["an overlong version", JSON.stringify({name: "react", version: "1".repeat(257)})],
  ])("returns an invalid outcome for requested metadata with %s", async (_case, contents) => {
    const root = await createTemporaryRoot("arolariu-packages-malformed-");
    await writePackageManifest(root, "react", contents);
    await writePackageManifest(root, "next", {name: "next", version: "16.3.0"});
    const provider = createInstalledPackageProvider({
      root,
      packageNames: ["react", "next"],
    });

    const outcome = await invokeProvider(provider);

    expect(outcome.kind).toBe("invalid");
    if (outcome.kind !== "invalid") {
      return;
    }
    expect(outcome.issues).toEqual(["Installed package metadata is malformed for 'react'."]);
    expect("partial" in outcome).toBe(false);
    expect(JSON.stringify(outcome)).not.toMatch(/package-json-raw-marker|raw-version-marker/u);
  });

  it("rejects a traversing requested package name before inspecting the repository root", async () => {
    const rawRoot = resolve(tmpdir(), "nonexistent-package-inventory-root");
    const provider = createInstalledPackageProvider({
      root: rawRoot,
      packageNames: ["../secret-package"],
    });

    const outcome = await invokeProvider(provider);

    expect(outcome).toEqual({
      kind: "invalid",
      issues: ["Installed package inventory contains an invalid requested package name."],
      durationMs: 0,
    });
    expect(JSON.stringify(outcome)).not.toContain("secret-package");
  });

  it("redacts native filesystem details when requested metadata cannot be read", async () => {
    const root = await createTemporaryRoot("arolariu-packages-unreadable-");
    await mkdir(join(root, "node_modules", "react", "package.json"), {recursive: true});
    const provider = createInstalledPackageProvider({
      root,
      packageNames: ["react"],
    });

    const outcome = await invokeProvider(provider);

    expect(outcome).toEqual({
      kind: "unavailable",
      reason: "One or more requested installed package manifests could not be inspected.",
      durationMs: 0,
    });
    expect(JSON.stringify(outcome)).not.toContain(root);
  });

  it("represents a missing requested package as an available empty inventory", async () => {
    const root = await createTemporaryRoot("arolariu-packages-missing-");
    const provider = createInstalledPackageProvider({
      root,
      packageNames: ["react"],
    });

    await expect(invokeProvider(provider)).resolves.toEqual({
      kind: "available",
      value: {installed: {}, malformed: []},
      durationMs: 0,
    });
  });
});
