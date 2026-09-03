// @vitest-environment node
/**
 * @fileoverview Tests for the authoritative script entrypoint inventory.
 * @module scripts/testing/architecture/script-entrypoint-definitions.test
 */

import {existsSync, readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

import {
  commanderEntrypointSourcePaths,
  piscinaRuntimeBoundaryExclusionSourcePaths,
  scriptEntrypointDefinitions,
} from "./script-entrypoint-definitions.ts";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRootScripts(): Readonly<Record<string, string>> {
  const document: unknown = JSON.parse(readFileSync("package.json", "utf8"));
  if (!isRecord(document) || !isRecord(document["scripts"])) {
    throw new Error("Expected package.json to contain a scripts object.");
  }

  return Object.fromEntries(
    Object.entries(document["scripts"]).map(([name, value]) => {
      if (typeof value !== "string") {
        throw new Error(`Expected package script "${name}" to be a string.`);
      }
      return [name, value];
    }),
  );
}

describe("script entrypoint definitions", () => {
  it("uses unique source paths and package-script names", () => {
    const sourcePaths = scriptEntrypointDefinitions.map(({sourcePath}) => sourcePath);
    const packageScriptNames = scriptEntrypointDefinitions.flatMap(({packageScriptNames}) => packageScriptNames);

    expect(new Set(sourcePaths).size).toBe(sourcePaths.length);
    expect(new Set(packageScriptNames).size).toBe(packageScriptNames.length);
    expect(sourcePaths.filter((sourcePath) => !existsSync(sourcePath))).toEqual([]);
  });

  it("owns every root package script that starts node under scripts", () => {
    const packageScripts = readRootScripts();
    const actualNames = Object.entries(packageScripts)
      .filter(([, command]) => /^node scripts[\\/]/u.test(command) && !/^node scripts[\\/]testing[\\/]/u.test(command))
      .map(([name]) => name)
      .toSorted();
    const definedNames = scriptEntrypointDefinitions.flatMap(({packageScriptNames}) => packageScriptNames).toSorted();

    expect(definedNames).toEqual(actualNames);
  });

  it("keeps Commander and Piscina entrypoint groups exact", () => {
    expect(commanderEntrypointSourcePaths).toHaveLength(17);
    expect(piscinaRuntimeBoundaryExclusionSourcePaths).toEqual([
      "scripts/format.ts",
      "scripts/lint.ts",
      "scripts/workers/format.worker.ts",
      "scripts/workers/lint.worker.ts",
    ]);
  });
});
