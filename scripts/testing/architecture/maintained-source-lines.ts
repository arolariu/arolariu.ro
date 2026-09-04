/**
 * @fileoverview Maintained `scripts/**` line-accounting metric and its Git evidence parsers.
 * @module scripts/testing/architecture/maintained-source-lines
 *
 * @remarks
 * This module is the single authoritative implementation of the Cohort 0 maintained-line metric:
 * it enumerates the exact candidate source scope, counts lines with the same algorithm the
 * approved baseline used, and parses `git diff --numstat`/`--name-status` output into evidence
 * that distinguishes real deletions from detected renames or relocations.
 * `scripts/testing/architecture/report-maintained-source-lines.ts` and
 * `scripts/testing/architecture/maintained-source-lines.test.ts` both depend on these exports
 * instead of re-implementing parsing or counting.
 */

import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

import {approvedScriptsArchitectureBaseline} from "./scripts-architecture-baseline.ts";
import {isScriptTestFile, normalizeScriptSourcePath} from "./script-source-files.ts";

/** File extensions counted toward the maintained `scripts/**` line total. */
const maintainedSourcePattern = /\.(?:cjs|js|mjs|ts|tsx)$/u;

/**
 * The sole approved exemption from the maintained-line metric.
 *
 * @remarks
 * Only `scripts/vitest.config.ts` is excluded; every other `scripts/**` source file, including
 * test files and `scripts/testing/**` support code, counts toward the total.
 */
const excludedSourcePaths = new Set(["scripts/vitest.config.ts"]);

/** One counted maintained source file and its line count and classification. */
interface MaintainedSourceFileLineDefinition {
  /** Forward-slash relative path to the counted source file. */
  readonly sourcePath: string;
  /** Whether this file counts toward the production or test-support subtotal. */
  readonly classification: "production" | "test-support";
  /** Grouping key derived from the first path segment under `scripts/`. */
  readonly family: string;
  /** Line count for this file, using the baseline `sourceText.split("\n").length` algorithm. */
  readonly maintainedLineCount: number;
}

/** Full maintained-line report for the current working tree. */
interface MaintainedSourceLineReport {
  /** Sum of every counted file's `maintainedLineCount`. */
  readonly totalMaintainedLineCount: number;
  /** Production-only subset of `totalMaintainedLineCount`. */
  readonly productionMaintainedLineCount: number;
  /** Test-support subset of `totalMaintainedLineCount`. */
  readonly testSupportMaintainedLineCount: number;
  /** Difference between `totalMaintainedLineCount` and the approved baseline total. */
  readonly baselineDelta: number;
  /** Every counted source file, sorted by path. */
  readonly sourceFiles: readonly MaintainedSourceFileLineDefinition[];
  /** Per-family maintained line counts, sorted by family name. */
  readonly familyMaintainedLineCounts: Readonly<Record<string, number>>;
  /** The exact, sorted set of paths excluded from the metric. */
  readonly excludedSourcePaths: readonly string[];
}

/** One Git-detected rename or relocation between two maintained source paths. */
interface RenamedOrRelocatedSourcePathDefinition {
  /** Source path before the rename or relocation. */
  readonly previousSourcePath: string;
  /** Source path after the rename or relocation. */
  readonly currentSourcePath: string;
  /** Git-reported content similarity percentage between the two paths. */
  readonly similarityPercentage: number;
}

/** Parsed `git diff --name-status --find-renames` evidence, restricted to maintained paths. */
interface ParsedGitNameStatus {
  /** Paths that exist only in the compared commit. */
  readonly addedSourcePaths: readonly string[];
  /** Paths that exist only in the baseline commit. */
  readonly deletedSourcePaths: readonly string[];
  /** Paths present in both commits with modified content. */
  readonly modifiedSourcePaths: readonly string[];
  /** Paths Git detected as renamed or relocated between the two commits. */
  readonly renamedOrRelocatedSourcePaths: readonly RenamedOrRelocatedSourcePathDefinition[];
}

/** Full history report comparing the approved baseline commit to committed `HEAD`. */
interface MaintainedSourceHistoryReport extends ParsedGitNameStatus {
  /** The approved baseline commit being compared from. */
  readonly baselineCommit: string;
  /** The fixed comparison target: committed `HEAD`. */
  readonly comparedCommit: "HEAD";
  /** Total added lines across the compared range, restricted to maintained paths. */
  readonly addedLineCount: number;
  /** Total deleted lines across the compared range, restricted to maintained paths. */
  readonly deletedLineCount: number;
  /** `addedLineCount` minus `deletedLineCount`. */
  readonly netLineCount: number;
}

/**
 * Counts maintained lines using the same algorithm the approved baseline used.
 *
 * @param sourceText - Full file content to count.
 * @returns `sourceText.split("\n").length`, matching the baseline's newline-split algorithm
 * exactly so re-measuring never silently changes the counting method.
 */
export function countMaintainedSourceLineRecords(sourceText: string): number {
  return sourceText.split("\n").length;
}

/**
 * Determines whether a normalized path is inside the approved maintained-line counting scope.
 *
 * @param sourcePath - A forward-slash normalized candidate path.
 * @returns `true` when the path is under `scripts/`, has a counted source extension, and is not
 * the sole approved exemption.
 */
function isMaintainedSourcePath(sourcePath: string): boolean {
  return sourcePath.startsWith("scripts/") && maintainedSourcePattern.test(sourcePath) && !excludedSourcePaths.has(sourcePath);
}

/**
 * Filters raw newline-delimited Git candidate paths down to the approved maintained source scope.
 *
 * @param stdout - Raw newline-delimited path output, such as from `git ls-files`.
 * @returns Every maintained source path, normalized and sorted.
 */
export function parseGitScriptSourcePaths(stdout: string): readonly string[] {
  return stdout.split(/\r?\n/u).map(normalizeScriptSourcePath).filter(isMaintainedSourcePath).toSorted();
}

/**
 * Splits a single `git diff --numstat` display path into the one or two paths it represents.
 *
 * @remarks
 * Git renders renames either as a brace-abbreviated common prefix/suffix (for example
 * `scripts/{common/old.ts => core/new.ts}`) or, when there is no common affix, as a complete
 * `old/path.ts => new/path.ts` pair. Both forms must resolve to their real underlying paths so a
 * rename involving one maintained and one non-maintained path is still classified correctly.
 *
 * @param displayPath - The raw path column from one `--numstat` line.
 * @returns One path for an ordinary change, or two paths (previous, current) for a rename.
 */
function sourcePathsFromNumstatDisplayPath(displayPath: string): readonly string[] {
  const normalized = normalizeScriptSourcePath(displayPath);
  const braceMatch = /^(.*)\{(.*) => (.*)\}(.*)$/u.exec(normalized);
  if (braceMatch !== null) {
    const [, prefix = "", previous = "", current = "", suffix = ""] = braceMatch;
    return [`${prefix}${previous}${suffix}`, `${prefix}${current}${suffix}`];
  }

  const completeRenameParts = normalized.split(" => ");
  return completeRenameParts.length === 2 ? completeRenameParts : [normalized];
}

/**
 * Parses `git diff --numstat --find-renames` output into added/deleted/net line totals.
 *
 * @param stdout - Raw `--numstat` output for the compared range.
 * @returns Added, deleted, and net line counts, restricted to maintained source paths.
 * @throws {Error} When a line is malformed, reports binary content, or has non-numeric counts.
 */
export function parseGitNumstat(stdout: string): Readonly<{
  addedLineCount: number;
  deletedLineCount: number;
  netLineCount: number;
}> {
  let addedLineCount = 0;
  let deletedLineCount = 0;

  for (const line of stdout.split(/\r?\n/u).filter((candidate) => candidate.length > 0)) {
    const [addedText, deletedText, ...displayPathParts] = line.split("\t");
    if (addedText === undefined || deletedText === undefined || displayPathParts.length === 0) {
      throw new Error(`Unexpected Git numstat line: ${line}`);
    }
    if (addedText === "-" || deletedText === "-") {
      throw new Error(`Binary source is outside the maintained scripts metric: ${line}`);
    }
    if (!sourcePathsFromNumstatDisplayPath(displayPathParts.join("\t")).some(isMaintainedSourcePath)) {
      continue;
    }

    if (!/^\d+$/u.test(addedText) || !/^\d+$/u.test(deletedText)) {
      throw new Error(`Unexpected Git numstat counts: ${line}`);
    }
    const added = Number.parseInt(addedText, 10);
    const deleted = Number.parseInt(deletedText, 10);
    if (!Number.isSafeInteger(added) || !Number.isSafeInteger(deleted)) {
      throw new Error(`Unexpected Git numstat counts: ${line}`);
    }
    addedLineCount += added;
    deletedLineCount += deleted;
  }

  return {
    addedLineCount,
    deletedLineCount,
    netLineCount: addedLineCount - deletedLineCount,
  };
}

/**
 * Parses `git diff --name-status --find-renames` output into added/deleted/modified/renamed
 * evidence, restricted to maintained source paths.
 *
 * @param stdout - Raw `--name-status` output for the compared range.
 * @returns Sorted added, deleted, modified, and renamed-or-relocated path evidence. A rename or
 * relocation whose endpoints straddle the maintained scope is recorded as a plain addition or
 * deletion of the maintained endpoint instead of a rename.
 * @throws {Error} When a line is malformed or reports an unsupported status code.
 */
export function parseGitNameStatus(stdout: string): ParsedGitNameStatus {
  const addedSourcePaths: string[] = [];
  const deletedSourcePaths: string[] = [];
  const modifiedSourcePaths: string[] = [];
  const renamedOrRelocatedSourcePaths: RenamedOrRelocatedSourcePathDefinition[] = [];

  for (const line of stdout.split(/\r?\n/u).filter((candidate) => candidate.length > 0)) {
    const [status = "", firstPath, secondPath] = line.split("\t");
    const renameStatusMatch = /^R(\d{1,3})$/u.exec(status);
    if (renameStatusMatch !== null) {
      if (firstPath === undefined || secondPath === undefined) {
        throw new Error(`Unexpected Git rename status line: ${line}`);
      }

      const previousSourcePath = normalizeScriptSourcePath(firstPath);
      const currentSourcePath = normalizeScriptSourcePath(secondPath);
      const previousIsMaintained = isMaintainedSourcePath(previousSourcePath);
      const currentIsMaintained = isMaintainedSourcePath(currentSourcePath);
      if (previousIsMaintained && currentIsMaintained) {
        const similarityPercentage = Number.parseInt(renameStatusMatch[1] ?? "", 10);
        if (!Number.isSafeInteger(similarityPercentage) || similarityPercentage > 100) {
          throw new Error(`Unexpected Git rename similarity: ${line}`);
        }
        renamedOrRelocatedSourcePaths.push({
          previousSourcePath,
          currentSourcePath,
          similarityPercentage,
        });
      } else if (previousIsMaintained) {
        deletedSourcePaths.push(previousSourcePath);
      } else if (currentIsMaintained) {
        addedSourcePaths.push(currentSourcePath);
      }
      continue;
    }

    if (firstPath === undefined) {
      throw new Error(`Unexpected Git name-status line: ${line}`);
    }
    const sourcePath = normalizeScriptSourcePath(firstPath);
    if (!isMaintainedSourcePath(sourcePath)) {
      continue;
    }

    if (status === "A") {
      addedSourcePaths.push(sourcePath);
    } else if (status === "D") {
      deletedSourcePaths.push(sourcePath);
    } else if (status === "M" || status === "T") {
      modifiedSourcePaths.push(sourcePath);
    } else {
      throw new Error(`Unsupported Git name-status value: ${line}`);
    }
  }

  return {
    addedSourcePaths: addedSourcePaths.toSorted(),
    deletedSourcePaths: deletedSourcePaths.toSorted(),
    modifiedSourcePaths: modifiedSourcePaths.toSorted(),
    renamedOrRelocatedSourcePaths: renamedOrRelocatedSourcePaths.toSorted((left, right) =>
      left.previousSourcePath.localeCompare(right.previousSourcePath),
    ),
  };
}

/**
 * Derives the grouping family for a maintained source path from its first path segment.
 *
 * @param sourcePath - A maintained source path, such as `scripts/common/runtime.node.ts`.
 * @returns The directory immediately under `scripts/`, or the file's base name when the file is
 * a direct child of `scripts/`.
 */
function familyOf(sourcePath: string): string {
  const relative = sourcePath.slice("scripts/".length);
  const separator = relative.indexOf("/");
  return separator >= 0 ? relative.slice(0, separator) : (relative.split(".")[0] ?? relative);
}

/**
 * Classifies a maintained source path as production or test-support for the metric subtotal.
 *
 * @remarks
 * This intentionally differs from `isScriptTestSupportFile` in `script-source-files.ts`: the
 * approved baseline classification keeps `scripts/common/runtime.testing.ts` in the production
 * subtotal even though the runtime-boundary policy treats it as a testing adapter.
 *
 * @param sourcePath - A maintained source path.
 * @returns `"test-support"` for test files and everything under `scripts/testing/`, otherwise
 * `"production"`.
 */
function classificationOf(sourcePath: string): "production" | "test-support" {
  return isScriptTestFile(sourcePath) || sourcePath.startsWith("scripts/testing/") ? "test-support" : "production";
}

/**
 * Calculates the maintained-line report for the current working tree.
 *
 * @remarks
 * The candidate scope includes non-ignored untracked files so a pre-commit run cannot hide newly
 * added source, and it removes pending working-tree deletions before reading files. In CI, the
 * same command resolves to the Git-tracked scope.
 *
 * @param repositoryRoot - Absolute path to the repository root to run Git and read files from.
 * @returns The full maintained-line report: totals, per-file records, family subtotals, and the
 * exact excluded-path set.
 */
export function calculateMaintainedSourceLineReport(repositoryRoot: string): MaintainedSourceLineReport {
  const stdout = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", "scripts"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  const deletedSourcePaths = new Set(
    parseGitScriptSourcePaths(
      execFileSync("git", ["ls-files", "--deleted", "--", "scripts"], {
        cwd: repositoryRoot,
        encoding: "utf8",
      }),
    ),
  );
  const sourcePaths = parseGitScriptSourcePaths(stdout).filter((sourcePath) => !deletedSourcePaths.has(sourcePath));
  const sourceFiles = sourcePaths.map((sourcePath): MaintainedSourceFileLineDefinition => ({
    sourcePath,
    classification: classificationOf(sourcePath),
    family: familyOf(sourcePath),
    maintainedLineCount: countMaintainedSourceLineRecords(readFileSync(resolve(repositoryRoot, sourcePath), "utf8")),
  }));
  const totalMaintainedLineCount = sourceFiles.reduce((total, file) => total + file.maintainedLineCount, 0);
  const familyMaintainedLineCounts = Object.fromEntries(
    [...new Set(sourceFiles.map(({family}) => family))]
      .toSorted()
      .map((family) => [
        family,
        sourceFiles.filter((file) => file.family === family).reduce((total, file) => total + file.maintainedLineCount, 0),
      ]),
  );

  return {
    totalMaintainedLineCount,
    productionMaintainedLineCount: sourceFiles
      .filter(({classification}) => classification === "production")
      .reduce((total, file) => total + file.maintainedLineCount, 0),
    testSupportMaintainedLineCount: sourceFiles
      .filter(({classification}) => classification === "test-support")
      .reduce((total, file) => total + file.maintainedLineCount, 0),
    baselineDelta: totalMaintainedLineCount - approvedScriptsArchitectureBaseline.maintainedLineCount,
    sourceFiles,
    familyMaintainedLineCounts,
    excludedSourcePaths: [...excludedSourcePaths].toSorted(),
  };
}

/**
 * Calculates the maintained-line history report comparing the approved baseline commit to
 * committed `HEAD`.
 *
 * @remarks
 * The history comparison intentionally uses committed `HEAD`: the current line total from
 * {@link calculateMaintainedSourceLineReport} is authoritative for dirty or untracked work, while
 * the deletion-versus-relocation evidence here becomes complete only at each cohort commit.
 *
 * @param repositoryRoot - Absolute path to the repository root to run Git in.
 * @returns The full history report: baseline/compared commits, added/deleted/net line counts, and
 * added/deleted/modified/renamed-or-relocated path evidence.
 */
export function calculateMaintainedSourceHistoryReport(repositoryRoot: string): MaintainedSourceHistoryReport {
  const baselineCommit = approvedScriptsArchitectureBaseline.commit;
  const comparisonArguments = [baselineCommit, "HEAD", "--", "scripts"] as const;
  const numstat = parseGitNumstat(
    execFileSync("git", ["diff", "--numstat", "--find-renames", ...comparisonArguments], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }),
  );
  const nameStatus = parseGitNameStatus(
    execFileSync("git", ["diff", "--name-status", "--find-renames", ...comparisonArguments], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }),
  );

  return {
    baselineCommit,
    comparedCommit: "HEAD",
    ...numstat,
    ...nameStatus,
  };
}
