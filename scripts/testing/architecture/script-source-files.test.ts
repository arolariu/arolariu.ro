// @vitest-environment node
/**
 * @fileoverview Tests for the shared script source-file classifier and discovery helpers.
 * @module scripts/testing/architecture/script-source-files.test
 */

import {describe, expect, it} from "vitest";

import {
  discoverProductionScriptFiles,
  discoverScriptSourceFiles,
  isScriptConfigurationFile,
  isScriptTestFile,
  isScriptTestSupportFile,
} from "./script-source-files.ts";

describe("script source discovery", () => {
  it("classifies tests, configurations, and test support explicitly", () => {
    expect(isScriptTestFile("scripts/doctor.test.ts")).toBe(true);
    expect(isScriptTestFile("scripts/doctor.ts")).toBe(false);
    expect(isScriptConfigurationFile("scripts/vitest.config.ts")).toBe(true);
    expect(isScriptTestSupportFile("scripts/testing/fixtures/memory-filesystem.fixture.ts")).toBe(true);
    expect(isScriptTestSupportFile("scripts/testing/architecture/source.ts")).toBe(true);
  });

  it("discovers all source while returning production without test support", () => {
    const allSource = discoverScriptSourceFiles();
    const production = discoverProductionScriptFiles();

    expect(allSource).toContain("scripts/doctor.ts");
    expect(allSource).toContain("scripts/testing/architecture/script-source-files.test.ts");
    expect(production).toContain("scripts/doctor.ts");
    expect(production).not.toContain("scripts/vitest.config.ts");
    expect(production).not.toContain("scripts/testing/builders/runtime-context.builder.ts");
    expect(production.some((path) => path.startsWith("scripts/testing/"))).toBe(false);
  });
});
