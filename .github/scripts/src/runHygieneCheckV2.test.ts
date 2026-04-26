/**
 * @fileoverview Unit tests for artifact-driven hygiene summary failure logic.
 * @module github/scripts/src/runHygieneCheckV2.test
 */

import {describe, expect, it} from "vitest";

import {getBlockingHygieneFailures} from "./runHygieneCheckV2.ts";
import type {HygieneCheckResult} from "./hygiene/index.ts";

function result(check: HygieneCheckResult["check"], status: HygieneCheckResult["status"], summary: string): HygieneCheckResult {
  return {
    check,
    duration: 100,
    status,
    summary,
    timestamp: "2026-01-01T00:00:00.000Z",
  };
}

describe("getBlockingHygieneFailures", () => {
  it("returns no failures when blocking checks succeed", () => {
    const failures = getBlockingHygieneFailures({
      format: result("format", "success", "Format passed"),
      lint: result("lint", "success", "Lint passed"),
      test: result("test", "success", "Tests passed"),
    });

    expect(failures).toStrictEqual([]);
  });

  it("reports failed or errored blocking checks", () => {
    const failures = getBlockingHygieneFailures({
      format: result("format", "failure", "2 files need formatting"),
      lint: result("lint", "error", "ESLint crashed"),
      test: result("test", "success", "Tests passed"),
    });

    expect(failures).toStrictEqual(["format: 2 files need formatting", "lint: ESLint crashed"]);
  });

  it("treats missing blocking artifacts as failures", () => {
    const failures = getBlockingHygieneFailures({
      format: result("format", "success", "Format passed"),
      test: result("test", "success", "Tests passed"),
    });

    expect(failures).toStrictEqual(["lint: missing result artifact"]);
  });
});
