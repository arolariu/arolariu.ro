// @vitest-environment node
/**
 * @fileoverview Tests for the maintained scripts line-accounting metric and its Git parsers.
 * @module scripts/testing/architecture/maintained-source-lines.test
 */

import {describe, expect, it} from "vitest";

import {approvedScriptsArchitectureBaseline, cohortZeroMaximumMaintainedLineCount} from "./scripts-architecture-baseline.ts";
import {
  calculateMaintainedSourceLineReport,
  calculateMaintainedSourceHistoryReport,
  countMaintainedSourceLineRecords,
  parseGitNameStatus,
  parseGitNumstat,
  parseGitScriptSourcePaths,
} from "./maintained-source-lines.ts";

describe("maintained scripts line accounting", () => {
  it("preserves the baseline newline-split algorithm", () => {
    expect(countMaintainedSourceLineRecords("")).toBe(1);
    expect(countMaintainedSourceLineRecords("one\n")).toBe(2);
    expect(countMaintainedSourceLineRecords("one\r\ntwo\r\n")).toBe(3);
  });

  it("filters candidate paths to the approved source scope", () => {
    expect(
      parseGitScriptSourcePaths(
        ["scripts/doctor.ts", "scripts/doctor.test.ts", "scripts/vitest.config.ts", "scripts/README.md", "sites/arolariu.ro/page.tsx"].join(
          "\n",
        ),
      ),
    ).toEqual(["scripts/doctor.test.ts", "scripts/doctor.ts"]);
  });

  it("parses Git numstat additions and deletions without counting excluded source", () => {
    expect(
      parseGitNumstat(
        [
          "12\t3\tscripts/doctor.ts",
          "5\t0\tscripts/new-command.ts",
          "0\t4\tscripts/old-command.ts",
          "0\t0\tscripts/{common/old.ts => core/new.ts}",
          "1\t1\tscripts/vitest.config.ts",
          "8\t2\tscripts/README.md",
        ].join("\n"),
      ),
    ).toEqual({
      addedLineCount: 17,
      deletedLineCount: 7,
      netLineCount: 10,
    });
  });

  it("parses added, deleted, modified, and renamed or relocated source paths", () => {
    expect(
      parseGitNameStatus(
        [
          "M\tscripts/doctor.ts",
          "A\tscripts/new-command.ts",
          "D\tscripts/old-command.ts",
          "R094\tscripts/common/old.ts\tscripts/core/new.ts",
          "M\tscripts/vitest.config.ts",
          "M\tscripts/README.md",
        ].join("\n"),
      ),
    ).toEqual({
      addedSourcePaths: ["scripts/new-command.ts"],
      deletedSourcePaths: ["scripts/old-command.ts"],
      modifiedSourcePaths: ["scripts/doctor.ts"],
      renamedOrRelocatedSourcePaths: [
        {
          previousSourcePath: "scripts/common/old.ts",
          currentSourcePath: "scripts/core/new.ts",
          similarityPercentage: 94,
        },
      ],
    });
  });

  it("keeps the approved baseline immutable and the current tree inside the temporary ceiling", () => {
    expect(approvedScriptsArchitectureBaseline.commit).toBe("11773ff3d");
    expect(approvedScriptsArchitectureBaseline.maintainedLineCount).toBe(73_377);
    expect(approvedScriptsArchitectureBaseline.productionMaintainedLineCount).toBe(37_126);
    expect(approvedScriptsArchitectureBaseline.testSupportMaintainedLineCount).toBe(36_251);
    expect(
      approvedScriptsArchitectureBaseline.productionMaintainedLineCount
        + approvedScriptsArchitectureBaseline.testSupportMaintainedLineCount,
    ).toBe(approvedScriptsArchitectureBaseline.maintainedLineCount);
    expect(approvedScriptsArchitectureBaseline.finalMaximumMaintainedLineCount).toBe(55_032);
    expect(approvedScriptsArchitectureBaseline.sourceFileCount).toBe(142);

    const report = calculateMaintainedSourceLineReport(process.cwd());
    expect(report.totalMaintainedLineCount, JSON.stringify(report, null, 2)).toBeLessThanOrEqual(cohortZeroMaximumMaintainedLineCount);
    expect(report.excludedSourcePaths).toEqual(["scripts/vitest.config.ts"]);

    const history = calculateMaintainedSourceHistoryReport(process.cwd());
    expect(history.baselineCommit).toBe(approvedScriptsArchitectureBaseline.commit);
    expect(history.comparedCommit).toBe("HEAD");
    expect(history.netLineCount).toBe(history.addedLineCount - history.deletedLineCount);
  });
});
