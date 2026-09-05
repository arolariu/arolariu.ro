// @vitest-environment node

import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJsonObject(path: string): Readonly<Record<string, unknown>> {
  const document: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isRecord(document)) {
    throw new Error(`Expected ${path} to contain one JSON object.`);
  }
  return document;
}

describe("scripts TypeScript project", () => {
  it("checks production and non-test support with one Cohort 7 exclusion", () => {
    const configuration = readJsonObject("scripts/tsconfig.json");
    const compilerOptions = configuration["compilerOptions"];
    if (!isRecord(compilerOptions)) {
      throw new Error("Expected scripts/tsconfig.json#compilerOptions to be an object.");
    }

    expect(configuration["extends"]).toBe("../tsconfig.json");
    expect(configuration["include"]).toEqual(["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs", "**/*.cjs", "../knip.config.ts"]);
    expect(configuration["exclude"]).toEqual(["**/*.test.*", "**/*.spec.*", "vitest.config.ts", "workers/lint.worker.ts"]);
    expect(compilerOptions).toMatchObject({incremental: false, pretty: false, types: ["node"]});
  });

  it("exposes the focused type-check through the root package", () => {
    const rootPackage = readJsonObject("package.json");
    const scripts = rootPackage["scripts"];
    if (!isRecord(scripts)) {
      throw new Error("Expected package.json#scripts to be an object.");
    }

    expect(scripts["typecheck:scripts"]).toBe("tsc --project scripts/tsconfig.json --pretty false");
  });
});
