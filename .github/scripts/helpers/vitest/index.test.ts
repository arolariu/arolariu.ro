/**
 * @fileoverview Comprehensive test suite for Vitest helper
 * @module github/scripts/helpers/vitest/tests
 *
 * @remarks
 * Covers coverage parsing and markdown generation for reporting.
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import type {IFileSystemHelper} from "../filesystem/index.ts";
import {
  checkVitestThresholds,
  createVitestHelper,
  generateVitestMarkdownSection,
  parseVitestCoverage,
  vitest,
  type CoverageFileSummary,
  type IVitestHelper,
  type ParsedCoverageData,
  type VitestCoverageSummary,
  type VitestMarkdownOptions,
} from "./index.ts";

/**
 * Creates a mock CoverageFileSummary with realistic data
 */
function createMockCoverageFileSummary(
  options: {
    statementsPct?: number;
    branchesPct?: number;
    functionsPct?: number;
    linesPct?: number;
  } = {},
): CoverageFileSummary {
  const {statementsPct = 85.5, branchesPct = 75.2, functionsPct = 90.0, linesPct = 86.3} = options;

  return {
    lines: {
      total: 1000,
      covered: Math.floor((linesPct / 100) * 1000),
      skipped: 0,
      pct: linesPct,
    },
    statements: {
      total: 1200,
      covered: Math.floor((statementsPct / 100) * 1200),
      skipped: 0,
      pct: statementsPct,
    },
    functions: {
      total: 150,
      covered: Math.floor((functionsPct / 100) * 150),
      skipped: 0,
      pct: functionsPct,
    },
    branches: {
      total: 400,
      covered: Math.floor((branchesPct / 100) * 400),
      skipped: 0,
      pct: branchesPct,
    },
  };
}

/**
 * Creates a mock VitestCoverageSummary for testing
 */
function createMockVitestCoverageSummary(): VitestCoverageSummary {
  return {
    total: createMockCoverageFileSummary(),
    "/workspace/src/utils/helper.ts": createMockCoverageFileSummary({
      statementsPct: 95.0,
      branchesPct: 88.0,
      functionsPct: 100.0,
      linesPct: 94.5,
    }),
    "/workspace/src/components/Button.tsx": createMockCoverageFileSummary({
      statementsPct: 78.0,
      branchesPct: 65.0,
      functionsPct: 85.0,
      linesPct: 79.0,
    }),
    "/workspace/src/lib/parser.ts": createMockCoverageFileSummary({
      statementsPct: 92.0,
      branchesPct: 82.0,
      functionsPct: 95.0,
      linesPct: 91.5,
    }),
  };
}

/**
 * Creates a mock file system helper for testing
 */
function createMockFileSystemHelper(mockData: VitestCoverageSummary): IFileSystemHelper {
  return {
    exists: vi.fn().mockResolvedValue(true),
    readJson: vi.fn().mockResolvedValue(mockData),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    createDirectory: vi.fn(),
    listFiles: vi.fn(),
    getFileStats: vi.fn(),
  } as unknown as IFileSystemHelper;
}

describe("VitestHelper", () => {
  let helper: IVitestHelper;

  beforeEach(() => {
    helper = createVitestHelper();
  });

  describe("parseCoverage", () => {
    it("should successfully parse valid coverage data", async () => {
      const mockData = createMockVitestCoverageSummary();
      const mockFs = createMockFileSystemHelper(mockData);

      const result = await helper.parseCoverage("coverage-summary.json", mockFs);

      expect(result.total).toEqual(mockData.total);
      expect(result.files).toHaveLength(3);
      expect(result.files[0]?.filePath).toBe("/workspace/src/components/Button.tsx");
      expect(result.files[1]?.filePath).toBe("/workspace/src/lib/parser.ts");
      expect(result.files[2]?.filePath).toBe("/workspace/src/utils/helper.ts");
    });

    it("should throw error when coverage file does not exist", async () => {
      const mockFs = {
        exists: vi.fn().mockResolvedValue(false),
        readJson: vi.fn(),
      } as unknown as IFileSystemHelper;

      await expect(helper.parseCoverage("missing.json", mockFs)).rejects.toThrow("Coverage file not found");
    });

    it("should throw error when coverage data missing total property", async () => {
      const mockData = {
        "/workspace/file.ts": createMockCoverageFileSummary(),
      } as unknown as VitestCoverageSummary;

      const mockFs = createMockFileSystemHelper(mockData);

      await expect(helper.parseCoverage("invalid.json", mockFs)).rejects.toThrow("Coverage data missing 'total' property");
    });

    it("should handle coverage data with only total (no files)", async () => {
      const mockData = {
        total: createMockCoverageFileSummary(),
      } as VitestCoverageSummary;

      const mockFs = createMockFileSystemHelper(mockData);

      const result = await helper.parseCoverage("coverage-summary.json", mockFs);

      expect(result.total).toEqual(mockData.total);
      expect(result.files).toHaveLength(0);
    });

    it("should sort files alphabetically by path", async () => {
      const mockData = {
        total: createMockCoverageFileSummary(),
        "/workspace/z-file.ts": createMockCoverageFileSummary(),
        "/workspace/a-file.ts": createMockCoverageFileSummary(),
        "/workspace/m-file.ts": createMockCoverageFileSummary(),
      } as VitestCoverageSummary;

      const mockFs = createMockFileSystemHelper(mockData);

      const result = await helper.parseCoverage("coverage-summary.json", mockFs);

      expect(result.files).toHaveLength(3);
      expect(result.files[0]?.filePath).toBe("/workspace/a-file.ts");
      expect(result.files[1]?.filePath).toBe("/workspace/m-file.ts");
      expect(result.files[2]?.filePath).toBe("/workspace/z-file.ts");
    });
  });

  describe("generateMarkdownSection", () => {
    let mockCoverageData: ParsedCoverageData;

    beforeEach(() => {
      mockCoverageData = {
        total: createMockCoverageFileSummary(),
        files: [
          {
            filePath: "/workspace/src/utils/helper.ts",
            coverage: createMockCoverageFileSummary({statementsPct: 95.0, branchesPct: 88.0}),
          },
          {
            filePath: "/workspace/src/components/Button.tsx",
            coverage: createMockCoverageFileSummary({statementsPct: 78.0, branchesPct: 65.0}),
          },
        ],
      };
    });

    it("should generate markdown with default options", () => {
      const markdown = helper.generateMarkdownSection(mockCoverageData);

      expect(markdown).toContain("### 🧪 Vitest Unit Tests");
      expect(markdown).toContain("| Category    | Coverage |");
      expect(markdown).toContain("| Statements  | 85.50% |");
      expect(markdown).toContain("| Branches    | 75.20% |");
      expect(markdown).toContain("| Functions   | 90.00% |");
      expect(markdown).toContain("| Lines       | 86.30% |");
      expect(markdown).toContain("----");
      expect(markdown).not.toContain("File Coverage Breakdown");
    });

    it("should include file breakdown when requested", () => {
      const options: VitestMarkdownOptions = {
        includeFileBreakdown: true,
        workspaceRoot: "/workspace",
      };

      const markdown = helper.generateMarkdownSection(mockCoverageData, options);

      expect(markdown).toContain("#### File Coverage Breakdown");
      expect(markdown).toContain("src/utils/helper.ts");
      expect(markdown).toContain("src/components/Button.tsx");
      expect(markdown).toContain("95.0%");
      expect(markdown).toContain("78.0%");
    });

    it("should use emoji indicators when requested", () => {
      const options: VitestMarkdownOptions = {
        useEmoji: true,
      };

      const markdown = helper.generateMarkdownSection(mockCoverageData, options);

      // 90%+ should get green circle
      expect(markdown).toContain("🟢 90.00%"); // Functions at 90%

      // 75-90% should get yellow circle
      expect(markdown).toContain("🟡 85.50%"); // Statements at 85.5%
      expect(markdown).toContain("🟡 86.30%"); // Lines at 86.3%
      expect(markdown).toContain("🟡 75.20%"); // Branches at 75.2%
    });

    it("should use custom title when provided", () => {
      const options: VitestMarkdownOptions = {
        title: "📊 Custom Test Results",
      };

      const markdown = helper.generateMarkdownSection(mockCoverageData, options);

      expect(markdown).toContain("### 📊 Custom Test Results");
      expect(markdown).not.toContain("🧪 Vitest Unit Tests");
    });

    it("should truncate file list when exceeding maxFiles", () => {
      const largeFileList = Array.from({length: 30}, (_, index) => ({
        filePath: `/workspace/file${index}.ts`,
        coverage: createMockCoverageFileSummary(),
      }));

      const largeCoverageData: ParsedCoverageData = {
        total: createMockCoverageFileSummary(),
        files: largeFileList,
      };

      const options: VitestMarkdownOptions = {
        includeFileBreakdown: true,
        maxFiles: 10,
      };

      const markdown = helper.generateMarkdownSection(largeCoverageData, options);

      expect(markdown).toContain("file0.ts");
      expect(markdown).toContain("file9.ts");
      expect(markdown).not.toContain("file10.ts");
      expect(markdown).toContain("... and 20 more files");
    });

    it("should handle empty file list gracefully", () => {
      const emptyFileData: ParsedCoverageData = {
        total: createMockCoverageFileSummary(),
        files: [],
      };

      const options: VitestMarkdownOptions = {
        includeFileBreakdown: true,
      };

      const markdown = helper.generateMarkdownSection(emptyFileData, options);

      expect(markdown).toContain("### 🧪 Vitest Unit Tests");
      expect(markdown).toContain("| Statements  | 85.50% |");
      expect(markdown).not.toContain("File Coverage Breakdown");
    });

    it("should truncate long file paths in breakdown", () => {
      const longPathData: ParsedCoverageData = {
        total: createMockCoverageFileSummary(),
        files: [
          {
            filePath: "/workspace/very/long/path/to/some/deeply/nested/component/file.ts",
            coverage: createMockCoverageFileSummary(),
          },
        ],
      };

      const options: VitestMarkdownOptions = {
        includeFileBreakdown: true,
        workspaceRoot: "/workspace",
      };

      const markdown = helper.generateMarkdownSection(longPathData, options);

      // Should truncate paths longer than 40 characters
      expect(markdown).toContain("...");
    });
  });

  describe("checkThresholds", () => {
    let mockCoverageData: ParsedCoverageData;

    beforeEach(() => {
      mockCoverageData = {
        total: createMockCoverageFileSummary({
          statementsPct: 85.5,
          branchesPct: 75.2,
          functionsPct: 90.0,
          linesPct: 86.3,
        }),
        files: [],
      };
    });

    it("should return true when all thresholds are met", () => {
      const result = helper.checkThresholds(mockCoverageData, {
        statements: 80,
        branches: 70,
        functions: 85,
        lines: 80,
      });

      expect(result).toBe(true);
    });

    it("should return false when statements threshold not met", () => {
      const result = helper.checkThresholds(mockCoverageData, {
        statements: 90,
      });

      expect(result).toBe(false);
    });

    it("should return false when branches threshold not met", () => {
      const result = helper.checkThresholds(mockCoverageData, {
        branches: 80,
      });

      expect(result).toBe(false);
    });

    it("should return false when functions threshold not met", () => {
      const result = helper.checkThresholds(mockCoverageData, {
        functions: 95,
      });

      expect(result).toBe(false);
    });

    it("should return false when lines threshold not met", () => {
      const result = helper.checkThresholds(mockCoverageData, {
        lines: 90,
      });

      expect(result).toBe(false);
    });

    it("should return true when no thresholds specified", () => {
      const result = helper.checkThresholds(mockCoverageData, {});

      expect(result).toBe(true);
    });

    it("should handle exact threshold matches", () => {
      const result = helper.checkThresholds(mockCoverageData, {
        statements: 85.5,
        branches: 75.2,
        functions: 90.0,
        lines: 86.3,
      });

      expect(result).toBe(true);
    });

    it("should only check specified thresholds", () => {
      const result = helper.checkThresholds(mockCoverageData, {
        statements: 80, // Pass
        branches: 80, // Fail (actual 75.2)
      });

      expect(result).toBe(false);
    });
  });

  describe("convenience exports", () => {
    it("should export default vitest instance", () => {
      expect(vitest).toBeDefined();
      expect(vitest.parseCoverage).toBeDefined();
      expect(vitest.generateMarkdownSection).toBeDefined();
      expect(vitest.checkThresholds).toBeDefined();
    });

    it("should export createVitestHelper factory", () => {
      const instance = createVitestHelper();
      expect(instance).toBeDefined();
      expect(instance.parseCoverage).toBeDefined();
    });

    it("should export parseVitestCoverage convenience function", async () => {
      const mockData = createMockVitestCoverageSummary();
      const mockFs = createMockFileSystemHelper(mockData);

      const result = await parseVitestCoverage("coverage.json", mockFs);

      expect(result.total).toEqual(mockData.total);
      expect(result.files).toHaveLength(3);
    });

    it("should export generateVitestMarkdownSection convenience function", () => {
      const mockData: ParsedCoverageData = {
        total: createMockCoverageFileSummary(),
        files: [],
      };

      const markdown = generateVitestMarkdownSection(mockData);

      expect(markdown).toContain("### 🧪 Vitest Unit Tests");
      expect(markdown).toContain("| Statements  | 85.50% |");
    });

    it("should export checkVitestThresholds convenience function", () => {
      const mockData: ParsedCoverageData = {
        total: createMockCoverageFileSummary(),
        files: [],
      };

      const result = checkVitestThresholds(mockData, {statements: 80});

      expect(result).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle coverage with 0% values", () => {
      const zeroCoverage: ParsedCoverageData = {
        total: createMockCoverageFileSummary({
          statementsPct: 0,
          branchesPct: 0,
          functionsPct: 0,
          linesPct: 0,
        }),
        files: [],
      };

      const markdown = helper.generateMarkdownSection(zeroCoverage);

      expect(markdown).toContain("0.00%");
    });

    it("should handle coverage with 100% values", () => {
      const perfectCoverage: ParsedCoverageData = {
        total: createMockCoverageFileSummary({
          statementsPct: 100,
          branchesPct: 100,
          functionsPct: 100,
          linesPct: 100,
        }),
        files: [],
      };

      const markdown = helper.generateMarkdownSection(perfectCoverage, {useEmoji: true});

      expect(markdown).toContain("🟢 100.00%");
    });

    it("should handle very long workspace roots in file breakdown", () => {
      const mockData: ParsedCoverageData = {
        total: createMockCoverageFileSummary(),
        files: [
          {
            filePath: "/very/long/workspace/root/path/src/file.ts",
            coverage: createMockCoverageFileSummary(),
          },
        ],
      };

      const options: VitestMarkdownOptions = {
        includeFileBreakdown: true,
        workspaceRoot: "/very/long/workspace/root/path",
      };

      const markdown = helper.generateMarkdownSection(mockData, options);

      expect(markdown).toContain("src/file.ts");
    });
  });
});
