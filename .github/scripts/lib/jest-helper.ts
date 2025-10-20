import * as fs from "node:fs/promises";
import path from "node:path";
import type {ScriptParams} from "../types/index.ts";

/**
 * Interface for Jest coverage statistics per category (lines, statements, etc.)
 */
interface CoverageStats {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

/**
 * Interface for Jest coverage summary for a single file or total.
 */
interface CoverageFileSummary {
  lines: CoverageStats;
  statements: CoverageStats;
  functions: CoverageStats;
  branches: CoverageStats;
}

/**
 * Interface for the overall Jest coverage summary object.
 */
interface JestCoverageSummary {
  total: CoverageFileSummary; // For "All files"
  [filePath: string]: CoverageFileSummary; // For individual files, keys are absolute paths
}

async function getCoverageFromJson(coverageJsonPath: string, workspaceRoot: string, core: ScriptParams["core"]): Promise<string> {
  try {
    const coverageSummaryRaw = await fs.readFile(coverageJsonPath, "utf8");
    const coverageSummaryData: JestCoverageSummary = JSON.parse(coverageSummaryRaw);

    let table = `| File                    | % Statements | % Branch | % Functions | % Lines |\n`;
    table += `|-------------------------|---------|----------|---------|---------|\n`;

    const formatCoverageRow = (filePathOrKey: string, coverageData: CoverageFileSummary | undefined, isTotal: boolean = false): string => {
      let fileNameDisplay: string;
      if (isTotal) {
        fileNameDisplay = "**All files**";
      } else {
        const relativePath = path.relative(workspaceRoot, filePathOrKey) || path.basename(filePathOrKey);
        fileNameDisplay = `\`${relativePath}\``;
      }

      if (!coverageData) {
        return `| ${fileNameDisplay.padEnd(23)} | N/A     | N/A      | N/A     | N/A     |\n`;
      }

      const stmts = coverageData.statements.pct.toFixed(2);
      const branch = coverageData.branches.pct.toFixed(2);
      const funcs = coverageData.functions.pct.toFixed(2);
      const lines = coverageData.lines.pct.toFixed(2);

      return `| ${fileNameDisplay.padEnd(23)} | ${stmts.padStart(7)} | ${branch.padStart(8)} | ${funcs.padStart(7)} | ${lines.padStart(
        7,
      )} |\n`;
    };

    // "All files" row
    table += formatCoverageRow("total", coverageSummaryData.total, true);

    // Individual file rows
    const filePaths = Object.keys(coverageSummaryData).filter((k) => k !== "total" && coverageSummaryData[k]);
    filePaths.sort(); // Sort for consistent output

    for (const filePath of filePaths) {
      table += formatCoverageRow(filePath, coverageSummaryData[filePath], false);
    }

    return table;
  } catch (error) {
    const err = error as Error;
    core.warning(`Could not read or parse Jest coverage summary from ${coverageJsonPath}: ${err.message}`);
    return `| Error reading/parsing ${path.basename(
      coverageJsonPath,
    )}. | N/A     | N/A      | N/A     | N/A     |\n|-------------------------|---------|----------|---------|---------|\n\n`;
  }
}

/**
 * Generates the Jest test results section.
 * @param core - The GitHub Actions core helper.
 * @returns Markdown string for the Jest test results section.
 */
export default async function getJestResultsSection(core: ScriptParams["core"]): Promise<string> {
  let section = `### 🧪 Jest Test Results\n\n`;
  const coverageSummaryJsonPath = path.join(
    process.env["GITHUB_WORKSPACE"] ?? ".",
    "sites/arolariu.ro/code-cov/jest-report/coverage-summary.json",
  );
  const workspaceRoot = process.env["GITHUB_WORKSPACE"] ?? "";

  // Generate coverage table from coverage-summary.json
  const coverageTable = await getCoverageFromJson(coverageSummaryJsonPath, workspaceRoot, core);
  section += coverageTable;
  section += `----\n`;
  return section;
}
