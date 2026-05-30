import {describe, it, expect, vi, beforeEach} from "vitest";
import {computeTopExtensions, computeTopDirectories, type FolderSize, foldersToComparisons} from "./statsProvider.ts";

describe("computeTopExtensions", () => {
  it("returns extensions sorted by count desc, top 5", () => {
    const files = ["a.ts", "b.ts", "c.tsx", "d.md", "e.md", "f.yaml", "g.json", "h.ts"];
    const result = computeTopExtensions(files, 5);
    expect(result[0]).toEqual({extension: "ts", count: 3});
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("classifies files with no extension as '(no extension)'", () => {
    const result = computeTopExtensions(["LICENSE"], 5);
    expect(result[0]?.extension).toBe("(no extension)");
  });
});

describe("computeTopDirectories", () => {
  it("groups by first path segment", () => {
    const files = ["sites/a/x.ts", "sites/a/y.ts", "sites/b/z.ts", "infra/main.bicep"];
    const result = computeTopDirectories(files, 5);
    expect(result[0]).toEqual({directory: "sites", count: 3});
  });

  it("handles root-level files", () => {
    const result = computeTopDirectories(["README.md"], 5);
    expect(result[0]?.directory).toBe("(root)");
  });
});

describe("foldersToComparisons", () => {
  it("creates a ComparisonFinding per folder with non-zero diff", () => {
    const folders: FolderSize[] = [
      {folder: "sites/arolariu.ro", mainTotal: 1000, headTotal: 1500},
      {folder: "sites/docs.arolariu.ro", mainTotal: 200, headTotal: 100},
    ];
    const findings = foldersToComparisons(folders);
    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      kind: "comparison",
      severity: "info",
      name: "bundle.sites/arolariu.ro",
      baseValue: 1000,
      headValue: 1500,
      diff: 500,
      unit: "B",
    });
    expect(findings[1]?.diff).toBe(-100);
  });

  it("suppresses folders where the bundle size did not change (diff = 0)", () => {
    const folders: FolderSize[] = [
      {folder: "sites/arolariu.ro", mainTotal: 1000, headTotal: 1500},
      {folder: "sites/api.arolariu.ro", mainTotal: 500, headTotal: 500},   // unchanged → suppressed
      {folder: "sites/docs.arolariu.ro", mainTotal: 200, headTotal: 200},  // unchanged → suppressed
    ];
    const findings = foldersToComparisons(folders);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.name).toBe("bundle.sites/arolariu.ro");
  });

  it("returns [] when every folder has zero diff", () => {
    const folders: FolderSize[] = [
      {folder: "a", mainTotal: 100, headTotal: 100},
      {folder: "b", mainTotal: 200, headTotal: 200},
    ];
    expect(foldersToComparisons(folders)).toEqual([]);
  });
});

describe("statsProvider metadata", () => {
  beforeEach(() => vi.resetModules());
  it("informational gate -- never fails", async () => {
    const {statsProvider} = await import("./statsProvider.ts");
    expect(statsProvider.id).toBe("stats");
    expect(statsProvider.defaultGate).toEqual({kind: "informational"});
  });
});
