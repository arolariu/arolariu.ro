/**
 * @fileoverview Vitest test results and coverage parser helper.
 * @module github/scripts/helpers/vitest
 *
 * @remarks
 * This module provides comprehensive utilities for parsing and formatting Vitest test results
 * and coverage data following SOLID principles and clean architecture patterns.
 *
 * **Key Features:**
 * - Parse Vitest coverage-summary.json files
 * - Generate formatted markdown sections for test results
 * - Type-safe coverage data structures
 * - Support for both total and per-file coverage metrics
 * - Flexible markdown generation options
 *
 * **Architecture:**
 * - Interface-based design (IVitestHelper) for easy testing and mocking
 * - Pure functions for parsing and formatting operations
 * - Immutable data structures
 * - Single responsibility principle throughout
 *
 * @example
 * ```typescript
 * import { vitest } from './helpers/index.ts';
 *
 * // Parse coverage data
 * const coverage = await vitest.parseCoverage('coverage-summary.json');
 *
 * // Generate markdown section
 * const markdown = vitest.generateMarkdownSection(coverage, {
 *   includeFileBreakdown: false,
 *   workspaceRoot: '/path/to/workspace'
 * });
 * ```
 */

import * as path from "node:path";
import type {IFileSystemHelper} from "../filesystem/index.ts";

/**
 * Coverage statistics for a single metric (lines, statements, functions, branches)
 */
export interface CoverageStats {
  /** Total number of items (lines, statements, etc.) */
  readonly total: number;
  /** Number of items covered by tests */
  readonly covered: number;
  /** Number of items skipped */
  readonly skipped: number;
  /** Coverage percentage (0-100) */
  readonly pct: number;
}

/**
 * Complete coverage summary for a file or total
 */
export interface CoverageFileSummary {
  /** Line coverage statistics */
  readonly lines: CoverageStats;
  /** Statement coverage statistics */
  readonly statements: CoverageStats;
  /** Function coverage statistics */
  readonly functions: CoverageStats;
  /** Branch coverage statistics */
  readonly branches: CoverageStats;
}

/**
 * Vitest coverage summary structure from coverage-summary.json
 */
export interface VitestCoverageSummary {
  /** Total coverage across all files */
  readonly total: CoverageFileSummary;
  /** Per-file coverage indexed by absolute file path */
  readonly [filePath: string]: CoverageFileSummary;
}

/**
 * Parsed and normalized coverage data ready for reporting
 */
export interface ParsedCoverageData {
  /** Total coverage metrics */
  readonly total: CoverageFileSummary;
  /** Individual file coverage entries */
  readonly files: ReadonlyArray<{
    /** Absolute file path */
    readonly filePath: string;
    /** Coverage metrics for this file */
    readonly coverage: CoverageFileSummary;
  }>;
}

/**
 * Options for markdown section generation for Vitest coverage reports
 */
export interface VitestMarkdownOptions {
  /** Include per-file coverage breakdown (default: false) */
  readonly includeFileBreakdown?: boolean;
  /** Workspace root for relative path calculation */
  readonly workspaceRoot?: string;
  /** Maximum number of files to display (default: 20) */
  readonly maxFiles?: number;
  /** Custom section title (default: "🧪 Vitest Unit Tests") */
  readonly title?: string;
  /** Show coverage as emoji indicators (default: false) */
  readonly useEmoji?: boolean;
}

/**
 * Interface for Vitest helper operations following Interface Segregation Principle
 */
export interface IVitestHelper {
  /**
   * Parses a Vitest coverage-summary.json file
   *
   * @param coverageJsonPath - Path to coverage-summary.json file
   * @param fs - File system helper for reading files
   * @returns Parsed coverage data with total and per-file metrics
   * @throws Error if file cannot be read or parsed
   *
   * @example
   * ```typescript
   * const coverage = await helper.parseCoverage('coverage/coverage-summary.json', fsHelper);
   * console.log(`Total line coverage: ${coverage.total.lines.pct}%`);
   * ```
   */
  parseCoverage(coverageJsonPath: string, fs: IFileSystemHelper): Promise<ParsedCoverageData>;

  /**
   * Generates a formatted markdown section for Vitest test results
   *
   * @param coverageData - Parsed coverage data from parseCoverage()
   * @param options - Formatting options for the markdown output
   * @returns Markdown string ready for PR comments or reports
   *
   * @example
   * ```typescript
   * const markdown = helper.generateMarkdownSection(coverage, {
   *   includeFileBreakdown: true,
   *   workspaceRoot: process.cwd(),
   *   maxFiles: 10
   * });
   * ```
   */
  generateMarkdownSection(coverageData: ParsedCoverageData, options?: VitestMarkdownOptions): string;

  /**
   * Checks if coverage meets specified thresholds
   *
   * @param coverageData - Parsed coverage data
   * @param thresholds - Minimum coverage percentages required
   * @returns True if all thresholds are met
   *
   * @example
   * ```typescript
   * const meetsThreshold = helper.checkThresholds(coverage, {
   *   lines: 80,
   *   statements: 80,
   *   functions: 80,
   *   branches: 75
   * });
   * ```
   */
  checkThresholds(
    coverageData: ParsedCoverageData,
    thresholds: {
      lines?: number;
      statements?: number;
      functions?: number;
      branches?: number;
    },
  ): boolean;
}

/**
 * Vitest helper implementation following SOLID principles
 */
export class VitestHelper implements IVitestHelper {
  /**
   * Parses coverage-summary.json into normalized structure
   */
  async parseCoverage(coverageJsonPath: string, fs: IFileSystemHelper): Promise<ParsedCoverageData> {
    const exists = await fs.exists(coverageJsonPath);
    if (!exists) {
      throw new Error(`Coverage file not found: ${coverageJsonPath}`);
    }

    const rawData = await fs.readJson<VitestCoverageSummary>(coverageJsonPath);

    // Extract total coverage
    const total = rawData.total;
    if (!total) {
      throw new Error("Coverage data missing 'total' property");
    }

    // Extract per-file coverage
    const files = Object.entries(rawData)
      .filter(([key]) => key !== "total")
      .map(([filePath, coverage]) => ({
        filePath,
        coverage,
      }))
      .sort((a, b) => a.filePath.localeCompare(b.filePath));

    return {
      total,
      files,
    };
  }

  /**
   * Generates markdown section for coverage report
   */
  generateMarkdownSection(coverageData: ParsedCoverageData, options: VitestMarkdownOptions = {}): string {
    const {includeFileBreakdown = false, workspaceRoot = "", maxFiles = 20, title = "🧪 Vitest Unit Tests", useEmoji = false} = options;

    let section = `### ${title}\n\n`;

    // Generate total coverage table
    section += this.generateTotalCoverageTable(coverageData.total, useEmoji);

    // Optionally include per-file breakdown
    if (includeFileBreakdown && coverageData.files.length > 0) {
      section += `\n#### File Coverage Breakdown\n\n`;
      section += this.generateFileBreakdownTable(coverageData.files, workspaceRoot, maxFiles, useEmoji);

      if (coverageData.files.length > maxFiles) {
        const remaining = coverageData.files.length - maxFiles;
        section += `\n_... and ${remaining} more ${remaining === 1 ? "file" : "files"}_\n`;
      }
    }

    section += `\n----\n`;
    return section;
  }

  /**
   * Checks if coverage meets specified thresholds
   */
  checkThresholds(
    coverageData: ParsedCoverageData,
    thresholds: {
      lines?: number;
      statements?: number;
      functions?: number;
      branches?: number;
    },
  ): boolean {
    const {total} = coverageData;

    if (thresholds.lines !== undefined && total.lines.pct < thresholds.lines) {
      return false;
    }

    if (thresholds.statements !== undefined && total.statements.pct < thresholds.statements) {
      return false;
    }

    if (thresholds.functions !== undefined && total.functions.pct < thresholds.functions) {
      return false;
    }

    if (thresholds.branches !== undefined && total.branches.pct < thresholds.branches) {
      return false;
    }

    return true;
  }

  /**
   * Generates the total coverage summary table
   */
  private generateTotalCoverageTable(total: CoverageFileSummary, useEmoji: boolean): string {
    let table = `| Category    | Coverage |\n`;
    table += `|-------------|----------|\n`;

    const formatCoverage = (pct: number): string => {
      if (!useEmoji) {
        return `${pct.toFixed(2)}%`;
      }

      let emoji: string;
      if (pct >= 90) {
        emoji = "🟢";
      } else if (pct >= 75) {
        emoji = "🟡";
      } else {
        emoji = "🔴";
      }
      return `${emoji} ${pct.toFixed(2)}%`;
    };

    table += `| Statements  | ${formatCoverage(total.statements.pct)} |\n`;
    table += `| Branches    | ${formatCoverage(total.branches.pct)} |\n`;
    table += `| Functions   | ${formatCoverage(total.functions.pct)} |\n`;
    table += `| Lines       | ${formatCoverage(total.lines.pct)} |\n`;

    return table;
  }

  /**
   * Generates per-file coverage breakdown table
   */
  private generateFileBreakdownTable(
    files: ReadonlyArray<{filePath: string; coverage: CoverageFileSummary}>,
    workspaceRoot: string,
    maxFiles: number,
    useEmoji: boolean,
  ): string {
    let table = `| File | Statements | Branches | Functions | Lines |\n`;
    table += `|------|------------|----------|-----------|-------|\n`;

    const filesToShow = files.slice(0, maxFiles);

    for (const {filePath, coverage} of filesToShow) {
      const displayPath = workspaceRoot ? path.relative(workspaceRoot, filePath) : path.basename(filePath);
      // Normalize path and convert separators to POSIX style for cross-platform consistency
      const normalizedPath = path.normalize(displayPath).replace(/\\/g, "/");
      const fileName = normalizedPath.length > 40 ? `...${normalizedPath.slice(-37)}` : normalizedPath;

      const formatPct = (pct: number): string => {
        if (!useEmoji) {
          return `${pct.toFixed(1)}%`;
        }

        let emoji: string;
        if (pct >= 90) {
          emoji = "🟢";
        } else if (pct >= 75) {
          emoji = "🟡";
        } else {
          emoji = "🔴";
        }
        return `${emoji} ${pct.toFixed(1)}%`;
      };

      table += `| \`${fileName}\` | ${formatPct(coverage.statements.pct)} | ${formatPct(coverage.branches.pct)} | ${formatPct(coverage.functions.pct)} | ${formatPct(coverage.lines.pct)} |\n`;
    }

    return table;
  }
}

/**
 * Factory function to create a new VitestHelper instance
 * @returns A new VitestHelper instance
 */
export function createVitestHelper(): IVitestHelper {
  return new VitestHelper();
}

/**
 * Default vitest helper instance for convenience
 */
export const vitest: IVitestHelper = createVitestHelper();

/**
 * Convenience function: Parse Vitest coverage data
 * @param coverageJsonPath - Path to coverage-summary.json
 * @param fs - File system helper
 * @returns Parsed coverage data
 */
export async function parseVitestCoverage(coverageJsonPath: string, fs: IFileSystemHelper): Promise<ParsedCoverageData> {
  return vitest.parseCoverage(coverageJsonPath, fs);
}

/**
 * Convenience function: Generate markdown section for Vitest results
 * @param coverageData - Parsed coverage data
 * @param options - Markdown formatting options
 * @returns Formatted markdown string
 */
export function generateVitestMarkdownSection(coverageData: ParsedCoverageData, options?: VitestMarkdownOptions): string {
  return vitest.generateMarkdownSection(coverageData, options);
}

/**
 * Convenience function: Check if coverage meets thresholds
 * @param coverageData - Parsed coverage data
 * @param thresholds - Required coverage percentages
 * @returns True if all thresholds are met
 */
export function checkVitestThresholds(
  coverageData: ParsedCoverageData,
  thresholds: {
    lines?: number;
    statements?: number;
    functions?: number;
    branches?: number;
  },
): boolean {
  return vitest.checkThresholds(coverageData, thresholds);
}
