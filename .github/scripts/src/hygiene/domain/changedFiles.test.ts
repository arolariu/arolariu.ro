import {describe, expect, it} from "vitest";
import {
  classifyChangedFiles,
  filesForEslint,
  filesForPrettier,
  normalizeChangedFile,
  shouldRunBroadly,
  suitesForTypeScriptChanges,
  touchedBundleFolders,
  touchesBackend,
  touchesPython,
  type ChangeSet,
} from "./changedFiles.ts";

const known = (files: readonly string[]): ChangeSet => ({scope: "known", files});
const unknown = (): ChangeSet => ({scope: "unknown", files: []});

describe("normalizeChangedFile", () => {
  it("normalizes Windows separators and removes leading ./", () => {
    expect(normalizeChangedFile(".\\sites\\arolariu.ro\\src\\page.tsx")).toBe("sites/arolariu.ro/src/page.tsx");
  });

  it("returns repo-relative POSIX paths unchanged", () => {
    expect(normalizeChangedFile("packages/components/src/Button.tsx")).toBe("packages/components/src/Button.tsx");
  });
});

describe("classifyChangedFiles", () => {
  it("classifies website-only changes", () => {
    const c = classifyChangedFiles(["sites/arolariu.ro/src/app/page.tsx"]);
    expect(c.buckets).toEqual(["website"]);
    expect(c.hasRootSharedChange).toBe(false);
  });

  it("classifies components-only changes", () => {
    expect(classifyChangedFiles(["packages/components/src/Button.tsx"]).buckets).toEqual(["components"]);
  });

  it("classifies cv/status/api/exp/docs/hygiene buckets", () => {
    expect(classifyChangedFiles(["sites/cv.arolariu.ro/src/routes/+page.svelte"]).buckets).toContain("cv");
    expect(classifyChangedFiles(["sites/status.arolariu.ro/src/App.svelte"]).buckets).toContain("status");
    expect(classifyChangedFiles(["sites/api.arolariu.ro/src/Core/Program.cs"]).buckets).toContain("api");
    expect(classifyChangedFiles(["sites/exp.arolariu.ro/main.py"]).buckets).toContain("exp");
    expect(classifyChangedFiles(["docs/rfc/1002.md"]).buckets).toContain("docs");
    expect(classifyChangedFiles([".github/scripts/src/hygiene/index.ts"]).buckets).toContain("hygieneScripts");
  });

  it("marks root shared config as broad impact", () => {
    const c = classifyChangedFiles(["package-lock.json", "eslint.config.ts", "vitest.config.ts", "nx.json"]);
    expect(c.hasRootSharedChange).toBe(true);
    expect(c.hasJavaScriptSharedChange).toBe(true);
  });

  it("marks backend and python shared files", () => {
    expect(classifyChangedFiles(["arolariu.slnx"]).hasBackendSharedChange).toBe(true);
    expect(classifyChangedFiles(["sites/exp.arolariu.ro/requirements-dev.txt"]).hasPythonSharedChange).toBe(true);
  });
});

describe("scope helpers", () => {
  it("runs broadly for unknown scope and root shared changes", () => {
    expect(shouldRunBroadly(unknown())).toBe(true);
    expect(shouldRunBroadly(known(["package.json"]))).toBe(true);
  });

  it("does not run broadly for isolated project changes", () => {
    expect(shouldRunBroadly(known(["sites/arolariu.ro/src/app/page.tsx"]))).toBe(false);
  });

  it("detects backend and python relevance", () => {
    expect(touchesBackend(known(["sites/api.arolariu.ro/src/Core/Program.cs"]))).toBe(true);
    expect(touchesBackend(known(["sites/arolariu.ro/src/app/page.tsx"]))).toBe(false);
    expect(touchesPython(known(["sites/exp.arolariu.ro/app/main.py"]))).toBe(true);
    expect(touchesPython(known(["sites/api.arolariu.ro/src/Core/Program.cs"]))).toBe(false);
  });
});

describe("file filters", () => {
  it("filters Prettier-supported changed files", () => {
    expect(filesForPrettier(known(["src/a.ts", "image.png", "README.md", "sites/cv.arolariu.ro/src/+page.svelte"]))).toEqual([
      "src/a.ts",
      "README.md",
      "sites/cv.arolariu.ro/src/+page.svelte",
    ]);
  });

  it("filters ESLint-supported changed files", () => {
    expect(filesForEslint(known(["src/a.ts", "src/b.tsx", "README.md", "sites/cv.arolariu.ro/src/+page.svelte"]))).toEqual([
      "src/a.ts",
      "src/b.tsx",
      "sites/cv.arolariu.ro/src/+page.svelte",
    ]);
  });

  it("returns null filters for unknown or broad scope", () => {
    expect(filesForPrettier(unknown())).toBeNull();
    expect(filesForEslint(known(["package.json"]))).toBeNull();
  });
});

describe("suitesForTypeScriptChanges", () => {
  it("selects only website for website-only changes", () => {
    expect(suitesForTypeScriptChanges(known(["sites/arolariu.ro/src/app/page.tsx"]))).toEqual(["website"]);
  });

  it("selects components/cv/status/scripts by path", () => {
    expect(suitesForTypeScriptChanges(known(["packages/components/src/Button.tsx"]))).toEqual(["components"]);
    expect(suitesForTypeScriptChanges(known(["sites/cv.arolariu.ro/src/routes/+page.svelte"]))).toEqual(["cv"]);
    expect(suitesForTypeScriptChanges(known(["sites/status.arolariu.ro/src/App.svelte"]))).toEqual(["status"]);
    expect(suitesForTypeScriptChanges(known([".github/scripts/src/hygiene/pipeline/runProvider.ts"]))).toEqual(["scripts"]);
  });

  it("returns null for broad TypeScript scope", () => {
    expect(suitesForTypeScriptChanges(unknown())).toBeNull();
    expect(suitesForTypeScriptChanges(known(["tsconfig.json"]))).toBeNull();
  });
});

describe("touchedBundleFolders", () => {
  const bundleFolders = ["sites/arolariu.ro", "sites/api.arolariu.ro", "sites/docs.arolariu.ro"];

  it("returns only bundle folders touched by known changes", () => {
    expect(touchedBundleFolders(known(["sites/arolariu.ro/src/app/page.tsx", "README.md"]), bundleFolders)).toEqual(["sites/arolariu.ro"]);
  });

  it("returns null for unknown or broad scope", () => {
    expect(touchedBundleFolders(unknown(), bundleFolders)).toBeNull();
    expect(touchedBundleFolders(known(["package.json"]), bundleFolders)).toBeNull();
  });
});
