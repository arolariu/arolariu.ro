/**
 * @fileoverview Unit tests for the CI script dispatcher.
 * @module github/scripts/src/runCiScript.test
 */

import {describe, expect, it} from "vitest";

import {resolveCiScriptMode} from "./runCiScript.ts";

describe("resolveCiScriptMode", () => {
  it("returns supported CI script modes", () => {
    expect(resolveCiScriptMode("workflow-policy")).toBe("workflow-policy");
  });

  it("rejects unsupported CI script modes with a clear error", () => {
    expect(() => resolveCiScriptMode("unsupported-mode")).toThrow(
      "Unsupported CI_SCRIPT_MODE 'unsupported-mode'. Supported modes:",
    );
  });

  it("rejects missing CI script mode values with a clear error", () => {
    expect(() => resolveCiScriptMode(undefined)).toThrow("CI_SCRIPT_MODE is required. Supported modes:");
  });
});
