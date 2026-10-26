import {describe, expect, it} from "vitest";
import {buildHygienePlan, decodeHygienePlan, toProviderMatrix} from "./plan.ts";
import {decodeSharedInputs, decodeWorkspaceInspection} from "./workspace.ts";
import {BASE, HEAD, changes, context, workspace} from "./fixtures/plans.ts";
import type {GitChange} from "../../helpers/git/index.ts";

function plan(
  entries: readonly GitChange[],
  extra: Partial<Parameters<typeof buildHygienePlan>[0]> = {},
): ReturnType<typeof buildHygienePlan> {
  return buildHygienePlan({
    context: context(),
    mode: "affected",
    changes: changes(entries),
    workspace: workspace(),
    sharedInputs: [],
    ...extra,
  });
}

describe("dependency-aware hygiene planning", () => {
  it("uses graph roots and reverse dependencies rather than guessed project names", () => {
    const result = plan([{kind: "modified", path: "packages/components/src/Button.tsx"}]);
    expect(result.suites).toEqual(expect.arrayContaining(["components", "website"]));
    expect(result.affectedProjects).toEqual(["canonical-site", "canonical-ui"]);
    expect(result.providers.find((provider) => provider.id === "test-python")?.selected).toBe(false);
    expect(result.providers.find((provider) => provider.id === "test-dotnet")?.selected).toBe(false);
  });
  it("keeps website-only work away from unrelated toolchains", () => {
    const result = plan([{kind: "modified", path: "sites/arolariu.ro/src/page.tsx"}]);
    expect(result.suites).toEqual(["website"]);
    expect(result.providers.filter((provider) => provider.setup.dotnet || provider.setup.python)).toEqual([]);
    expect(toProviderMatrix(result).provider).toHaveLength(6);
  });
  it("retains both rename owners and deleted ownership without formatting deleted files", () => {
    const result = plan([
      {kind: "renamed", previousPath: "packages/components/old.ts", path: "sites/cv.arolariu.ro/new.ts"},
      {kind: "deleted", path: "sites/api.arolariu.ro/Deleted.cs"},
    ]);
    expect(result.suites).toEqual(expect.arrayContaining(["components", "website", "cv"]));
    expect(result.providers.find((provider) => provider.id === "test-dotnet")?.selected).toBe(true);
    const deleted = plan([{kind: "deleted", path: "sites/arolariu.ro/old.ts"}]);
    expect(deleted.providers.find((provider) => provider.id === "format")?.selected).toBe(false);
    expect(deleted.suites).toEqual(["website"]);
  });
  it("keeps CI scripts and root tooling as explicit suites", () => {
    expect(plan([{kind: "modified", path: ".github/scripts/helpers/core.ts"}]).suites).toEqual(
      expect.arrayContaining(["scripts", "tooling"]),
    );
    expect(plan([{kind: "modified", path: "scripts/inspection/workspace.ts"}]).suites).toEqual(["tooling"]);
  });
  it("produces six required explicit skips for a known-empty diff", () => {
    const result = plan([], {workspace: {kind: "unavailable", reason: "not needed", durationMs: 0}});
    expect(result.providers).toHaveLength(6);
    expect(result.providers.every((provider) => !provider.selected && provider.requiredOutcome)).toBe(true);
    expect(
      toProviderMatrix(result).provider.every(
        (provider) => !provider["root-node-deps"] && !provider["needs-dotnet"] && !provider["needs-python"],
      ),
    ).toBe(true);
  });
  it.each([
    {workspace: {kind: "unavailable" as const, reason: "failed", durationMs: 1}},
    {workspace: {kind: "invalid" as const, issues: ["invalid graph"], durationMs: 1}},
    {changes: {scope: "unknown" as const, reason: "invalid base"}},
    {mode: "full" as const},
    {sharedInputs: ["{workspaceRoot}/nx.json"], changes: changes([{kind: "modified", path: "nx.json"}])},
  ])("broadens safely with an explanation for %j", (extra) => {
    const result = plan([{kind: "modified", path: "sites/arolariu.ro/page.tsx"}], extra);
    expect(result.mode).toBe("full");
    expect(result.providers.every((provider) => provider.selected)).toBe(true);
    expect(result.suites).toHaveLength(6);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
  it("respects shared-input globs from Nx and does not broaden docs-only changes", () => {
    expect(plan([{kind: "modified", path: "scripts/a.ts"}], {sharedInputs: ["{workspaceRoot}/scripts/**/*"]}).mode).toBe("full");
    expect(plan([{kind: "modified", path: "docs/readme.md"}]).suites).toEqual([]);
  });
  it("remains stable across attempts, timestamps, graph ordering, and change ordering", () => {
    const entries: readonly GitChange[] = [
      {kind: "modified", path: "sites/arolariu.ro/with spaces.ts"},
      {kind: "modified", path: "sites/arolariu.ro/with\nnewline.ts"},
    ];
    const first = plan(entries);
    const second = plan(entries.toReversed(), {context: context({workflowRunAttempt: 2, generatedAt: "2026-02-01T00:00:00Z"})});
    expect(first.id).toBe(second.id);
    expect(first.changes).toMatchObject({scope: "known", baseSha: BASE, headSha: HEAD});
    expect(decodeHygienePlan(JSON.parse(JSON.stringify(first)))).toEqual(first);
    expect(() => decodeHygienePlan({...first, id: "0".repeat(64)})).toThrow();
  });
  it("handles dependency cycles with a visited closure", () => {
    const graph = workspace();
    if (graph.kind !== "available") throw new Error("Invalid fixture");
    const cyclic = {
      ...graph,
      value: {
        ...graph.value,
        dependencies: [...graph.value.dependencies, {source: "canonical-ui", target: "canonical-site"}],
        cycles: [["canonical-site", "canonical-ui", "canonical-site"]],
      },
    };
    expect(plan([{kind: "modified", path: "packages/components/a.ts"}], {workspace: cyclic}).affectedProjects).toEqual([
      "canonical-site",
      "canonical-ui",
    ]);
  });
});

describe("workspace wire validation", () => {
  it("accepts root projects but rejects escaping roots, duplicate ownership, and unknown edges", () => {
    const raw = workspace();
    if (raw.kind !== "available") throw new Error("Invalid fixture");
    expect(
      decodeWorkspaceInspection({...raw, value: {...raw.value, projects: [{name: "root", root: "", targets: []}], dependencies: []}}).kind,
    ).toBe("available");
    for (const root of ["../escape", "/absolute", "C:\\outside"]) {
      expect(() => decodeWorkspaceInspection({...raw, value: {...raw.value, projects: [{name: "bad", root, targets: []}]}})).toThrow();
    }
    expect(() =>
      decodeWorkspaceInspection({
        ...raw,
        value: {...raw.value, projects: [...raw.value.projects, {...raw.value.projects[0], name: "duplicate"}]},
      }),
    ).toThrow();
    expect(() =>
      decodeWorkspaceInspection({...raw, value: {...raw.value, dependencies: [{source: "missing", target: "canonical-ui"}]}}),
    ).toThrow();
  });
  it("reads the declared shared-input list rather than substituting a copied configuration list", () => {
    expect(decodeSharedInputs({namedInputs: {sharedGlobals: ["{workspaceRoot}/nx.json", "{workspaceRoot}/scripts/**/*"]}})).toEqual([
      "{workspaceRoot}/nx.json",
      "{workspaceRoot}/scripts/**/*",
    ]);
    expect(() => decodeSharedInputs({namedInputs: {sharedGlobals: [null]}})).toThrow();
  });
});
