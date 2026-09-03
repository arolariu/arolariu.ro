// @vitest-environment node

import {describe, expect, it} from "vitest";

import knipConfiguration from "../../../knip.config.ts";
import {
  additionalScriptSourceRootPaths,
  scriptEntrypointDefinitions,
} from "./script-entrypoint-definitions.ts";
import {collectKnipIgnoredDependencyNames} from "./workspace-dependency-ownership.ts";

describe("Knip configuration", () => {
  it("uses exact script roots without broad source ignores", () => {
    if (typeof knipConfiguration === "function") {
      throw new Error("Expected the Knip configuration to be a typed object.");
    }

    const rootWorkspace = knipConfiguration.workspaces?.["."];
    const configuredEntries =
      rootWorkspace !== undefined && Array.isArray(rootWorkspace.entry)
        ? rootWorkspace.entry
        : [];
    for (const {sourcePath} of scriptEntrypointDefinitions) {
      expect(configuredEntries).toContain(sourcePath);
    }
    for (const sourcePath of additionalScriptSourceRootPaths) {
      expect(configuredEntries).toContain(sourcePath);
    }

    expect(rootWorkspace?.project).toEqual(["scripts/**/*.{ts,tsx,js,mjs,cjs}"]);
    expect(knipConfiguration.ignore).toBeUndefined();
    expect(knipConfiguration.ignoreFiles).toBeUndefined();
    expect(rootWorkspace?.ignore).toEqual([".github/scripts/**"]);
    expect(rootWorkspace?.ignoreFiles).toBeUndefined();
    expect(knipConfiguration.ignoreWorkspaces).toBeUndefined();
    expect(rootWorkspace?.includeEntryExports).toBe(false);
    expect(rootWorkspace?.ignoreDependencies).toEqual(collectKnipIgnoredDependencyNames(process.cwd()));
    expect(rootWorkspace?.ignoreDependencies).not.toContain("knip");
  });
});
