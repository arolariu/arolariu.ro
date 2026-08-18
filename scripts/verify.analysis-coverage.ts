/**
 * @fileoverview Verifies that the analysis pipeline feature surface delivered by tasks 2-12 meets the approved
 * backend coverage threshold, computed honestly from every OpenCover XML report that actually contains analysis
 * source files. Report selection is deterministic: all matching reports are merged, never an arbitrary newest one.
 * @module scripts/verify.analysis-coverage
 */

import {parseArgs} from "node:util";
import {readdir, readFile, stat} from "node:fs/promises";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import {JSDOM} from "jsdom";

/** Minimum acceptable line/branch/method coverage percentages, each in the inclusive range [0, 100]. */
export interface CoverageThresholds {
  readonly lines: number;
  readonly branches: number;
  readonly methods: number;
}

/**
 * The analysis-pipeline source surface this coverage gate is scoped to: every file carrying new or materially
 * changed analysis feature logic from tasks 2-12.
 *
 * Path fragments are matched, after normalizing path separators to forward slashes, as substrings against every
 * OpenCover `<File fullPath="...">` entry. Directory fragments end with `/` so they match whole segments.
 *
 * Two categories are deliberately absent, both for structural reasons rather than to shrink the denominator:
 *  - `Invoices/Modules/Log.cs` — `[LoggerMessage]` partial declarations emit zero OpenCover sequence points in
 *    their declaring file; the generated bodies live in a single project-wide `LoggerMessage.g.cs` that cannot be
 *    attributed back to individual logging methods by path matching. Logging behaviour is covered by dedicated
 *    telemetry unit tests instead.
 *  - External SDK adapter directories other than the Document Intelligence, taxonomy, and analysis-run brokers —
 *    their pass-through calls do not contribute source sequence points. The Document Intelligence broker is
 *    deliberately included because it contains receipt mapping, parsing, validation, and branch behaviour.
 */
export const DEFAULT_INCLUDED_PATH_FRAGMENTS: readonly string[] = [
  "/src/Invoices/Modules/InvoiceMetrics.cs",
  "/src/Invoices/DDD/Analysis/",
  "/src/Invoices/DDD/ValueObjects/Allergens/",
  "/src/Invoices/DDD/ValueObjects/Classifications/",
  "/src/Invoices/DDD/ValueObjects/Recipes/",
  "/src/Invoices/DDD/Entities/Merchants/MerchantNameNormalizer.cs",
  "/src/Invoices/Brokers/TaxonomyBroker/",
  "/src/Invoices/Brokers/AnalysisRunBroker/",
  "/src/Invoices/Brokers/DocumentIntelligenceBroker/",
  "/src/Invoices/Services/Foundation/AnalysisRuns/",
  "/src/Invoices/Services/Foundation/DocumentAnalysis/",
  "/src/Invoices/Services/Foundation/GenerativeAnalysis/",
  "/src/Invoices/Services/Orchestration/AnalysisService/",
  "/src/Invoices/Services/Processing/AnalysisService/",
  "/src/Invoices/Workers/AnalysisWorker.cs",
  "/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.Validations.cs",
  "/src/Invoices/Services/Foundation/MerchantStorage/MerchantStorageFoundationService.Validations.cs",
  "/src/Invoices/DTOs/Analysis/AnalysisOptionsResolver.cs",
  "/src/Invoices/DTOs/Analysis/AnalysisAcceptedResponseDto.cs",
  "/src/Invoices/DTOs/Analysis/ClassificationSelectionDto.cs",
  "/src/Invoices/Endpoints/InvoiceEndpoints.Analysis.cs",
];

/** Default coverage thresholds applied by the CLI when no `--threshold` override is given. */
export const DEFAULT_THRESHOLDS: CoverageThresholds = {lines: 99, branches: 99, methods: 99};

/** Default `dotnet test --results-directory` root holding the dedicated analysis coverage collection. */
export const DEFAULT_RESULTS_DIRECTORY = "sites/api.arolariu.ro/TestResults/AnalysisCoverage";

/** Per-file coverage attribution, emitted so a failing gate names the exact files that regressed. */
export interface FileCoverage {
  readonly path: string;
  readonly coveredLines: number;
  readonly totalLines: number;
  readonly missedLines: number;
  readonly coveredBranches: number;
  readonly totalBranches: number;
  readonly missedBranches: number;
  readonly coveredMethods: number;
  readonly totalMethods: number;
  readonly missedMethods: number;
}

/** Aggregated coverage measurement across every included file in every selected report. */
export interface CoverageMeasurement {
  readonly files: readonly FileCoverage[];
  readonly coveredLines: number;
  readonly totalLines: number;
  readonly coveredBranches: number;
  readonly totalBranches: number;
  readonly coveredMethods: number;
  readonly totalMethods: number;
  readonly linePercent: number | undefined;
  /** `undefined` when the included files contain no branch points at all — never silently reported as 100%. */
  readonly branchPercent: number | undefined;
  readonly methodPercent: number | undefined;
}

/** Normalizes a filesystem path for fragment matching by converting backslashes to forward slashes. */
function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}

/**
 * Parses OpenCover XML into a queryable DOM document, failing loudly on malformed XML instead of silently
 * returning an empty/partial document.
 *
 * @param openCoverXml Raw OpenCover XML report content.
 * @returns The parsed XML document.
 * @throws Error when the XML cannot be parsed.
 */
function parseXmlDocument(openCoverXml: string): Document {
  const dom = new JSDOM();
  const parser = new dom.window.DOMParser();
  const document_ = parser.parseFromString(openCoverXml, "application/xml");

  const parserErrors = document_.getElementsByTagName("parsererror");
  if (parserErrors.length > 0) {
    throw new Error(`Failed to parse OpenCover XML: ${parserErrors[0]?.textContent?.trim() ?? "unknown parse error"}`);
  }

  return document_;
}

/** Mutable accumulator keyed by point identity so multiple reports merge instead of double-counting. */
interface FileAccumulator {
  /** Sequence point identity (`method#ordinal:startLine`) mapped to the highest visit count seen. */
  readonly lineVisits: Map<string, number>;
  /** Branch point identity (`method#ordinal:offset:path`) mapped to the highest visit count seen. */
  readonly branchVisits: Map<string, number>;
  /** Method identity mapped to whether any of its own sequence points were visited in any report. */
  readonly methodVisits: Map<string, boolean>;
}

/** Builds a stable identity for a method so the same method merges across reports. */
function methodIdentity(methodElement: Element, fallbackIndex: number): string {
  const name = methodElement.getElementsByTagName("Name")[0]?.textContent?.trim();
  return name !== undefined && name.length > 0 ? name : `method#${fallbackIndex}`;
}

/**
 * Returns whether a normalized file path belongs to the coverage gate's scope.
 *
 * @param filePath Normalized (forward-slash) source file path from the report.
 * @param normalizedFragments Normalized included path fragments.
 * @returns `true` when the path contains at least one included fragment.
 */
function isIncluded(filePath: string, normalizedFragments: readonly string[]): boolean {
  return normalizedFragments.some((fragment) => filePath.includes(fragment));
}

/**
 * Collects, per included source file, the merged visit counts for every sequence point, branch point, and method
 * across all supplied OpenCover reports.
 */
function accumulate(openCoverXmls: readonly string[], normalizedFragments: readonly string[]): Map<string, FileAccumulator> {
  const perFile = new Map<string, FileAccumulator>();

  for (const openCoverXml of openCoverXmls) {
    const document_ = parseXmlDocument(openCoverXml);

    if (document_.getElementsByTagName("Module").length === 0) {
      throw new Error("OpenCover report contains no <Module> elements; the report is empty or malformed.");
    }

    for (const moduleElement of Array.from(document_.getElementsByTagName("Module"))) {
      const filesByUid = new Map<string, string>();
      for (const fileElement of Array.from(moduleElement.getElementsByTagName("File"))) {
        const uid = fileElement.getAttribute("uid");
        const fullPath = fileElement.getAttribute("fullPath");
        if (uid !== null && fullPath !== null) {
          filesByUid.set(uid, normalizePath(fullPath));
        }
      }

      const methodElements = Array.from(moduleElement.getElementsByTagName("Method"));
      for (const [methodIndex, methodElement] of methodElements.entries()) {
        const fileUid = methodElement.getElementsByTagName("FileRef")[0]?.getAttribute("uid");
        if (fileUid === undefined || fileUid === null) {
          continue; // Compiler-synthesized methods without a file reference cannot be attributed to a source file.
        }

        const filePath = filesByUid.get(fileUid);
        if (filePath === undefined || !isIncluded(filePath, normalizedFragments)) {
          continue;
        }

        let accumulator = perFile.get(filePath);
        if (accumulator === undefined) {
          accumulator = {lineVisits: new Map(), branchVisits: new Map(), methodVisits: new Map()};
          perFile.set(filePath, accumulator);
        }

        const method = methodIdentity(methodElement, methodIndex);
        let methodHasCoveredSequencePoint = false;

        for (const sequencePoint of Array.from(methodElement.getElementsByTagName("SequencePoint"))) {
          const key = `${method}#${sequencePoint.getAttribute("ordinal") ?? "?"}:${sequencePoint.getAttribute("sl") ?? "?"}`;
          const visitCount = Number(sequencePoint.getAttribute("vc") ?? "0");
          accumulator.lineVisits.set(key, Math.max(accumulator.lineVisits.get(key) ?? 0, visitCount));
          if (visitCount > 0) {
            methodHasCoveredSequencePoint = true;
          }
        }

        // Every real `<BranchPoint>` node is counted. coverlet emits one node per branch arm, so an honest
        // denominator is simply their count; nothing is skipped, deduplicated away, or defaulted to covered.
        for (const branchPoint of Array.from(methodElement.getElementsByTagName("BranchPoint"))) {
          const key = `${method}#${branchPoint.getAttribute("ordinal") ?? "?"}:${branchPoint.getAttribute("offset") ?? "?"}:${branchPoint.getAttribute("path") ?? "?"}`;
          const visitCount = Number(branchPoint.getAttribute("vc") ?? "0");
          accumulator.branchVisits.set(key, Math.max(accumulator.branchVisits.get(key) ?? 0, visitCount));
        }

        // Method-level coverage is derived from whether any of the method's own sequence points were hit, rather
        // than the OpenCover `visited` attribute: coverlet.collector's OpenCover exporter does not reliably
        // populate `visited` (observed empty for every method in this repo's real coverage runs), so trusting it
        // alone would silently under-report method coverage regardless of actual test execution.
        const visited = methodHasCoveredSequencePoint || methodElement.getAttribute("visited") === "true";
        accumulator.methodVisits.set(method, (accumulator.methodVisits.get(method) ?? false) || visited);
      }
    }
  }

  return perFile;
}

/**
 * Measures merged line, branch, and method coverage for the included analysis files across one or more OpenCover
 * reports.
 *
 * @param openCoverXmls Raw OpenCover XML report contents; multiple reports are merged point-by-point.
 * @param includedPathFragments Path fragments identifying the files this coverage gate is scoped to.
 * @returns The merged measurement, including per-file attribution.
 * @throws Error when a report is malformed or no fragments were supplied.
 */
export function measureOpenCover(openCoverXmls: readonly string[], includedPathFragments: readonly string[]): CoverageMeasurement {
  if (includedPathFragments.length === 0) {
    throw new Error("measureOpenCover requires at least one included path fragment.");
  }

  const perFile = accumulate(openCoverXmls, includedPathFragments.map(normalizePath));

  const files: FileCoverage[] = [];
  let coveredLines = 0;
  let totalLines = 0;
  let coveredBranches = 0;
  let totalBranches = 0;
  let coveredMethods = 0;
  let totalMethods = 0;

  for (const [path, accumulator] of [...perFile.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const fileLines = [...accumulator.lineVisits.values()];
    const fileBranches = [...accumulator.branchVisits.values()];
    const fileMethods = [...accumulator.methodVisits.values()];

    const fileCoveredLines = fileLines.filter((visitCount) => visitCount > 0).length;
    const fileCoveredBranches = fileBranches.filter((visitCount) => visitCount > 0).length;
    const fileCoveredMethods = fileMethods.filter(Boolean).length;

    files.push({
      path,
      coveredLines: fileCoveredLines,
      totalLines: fileLines.length,
      missedLines: fileLines.length - fileCoveredLines,
      coveredBranches: fileCoveredBranches,
      totalBranches: fileBranches.length,
      missedBranches: fileBranches.length - fileCoveredBranches,
      coveredMethods: fileCoveredMethods,
      totalMethods: fileMethods.length,
      missedMethods: fileMethods.length - fileCoveredMethods,
    });

    coveredLines += fileCoveredLines;
    totalLines += fileLines.length;
    coveredBranches += fileCoveredBranches;
    totalBranches += fileBranches.length;
    coveredMethods += fileCoveredMethods;
    totalMethods += fileMethods.length;
  }

  return {
    files,
    coveredLines,
    totalLines,
    coveredBranches,
    totalBranches,
    coveredMethods,
    totalMethods,
    linePercent: totalLines === 0 ? undefined : (coveredLines / totalLines) * 100,
    branchPercent: totalBranches === 0 ? undefined : (coveredBranches / totalBranches) * 100,
    methodPercent: totalMethods === 0 ? undefined : (coveredMethods / totalMethods) * 100,
  };
}

/**
 * Formats the worst offending files so a failing gate is actionable without re-running coverage collection.
 *
 * @param measurement The merged coverage measurement.
 * @returns A human-readable, newline-separated list of the files with the largest gaps.
 */
function formatWorstOffenders(measurement: CoverageMeasurement): string {
  return measurement.files
    .filter((file) => file.missedLines > 0 || file.missedBranches > 0 || file.missedMethods > 0)
    .sort((left, right) => right.missedLines + right.missedBranches + right.missedMethods - (left.missedLines + left.missedBranches + left.missedMethods))
    .slice(0, 15)
    .map((file) => `    ${file.path}: lines -${file.missedLines}/${file.totalLines}, branches -${file.missedBranches}/${file.totalBranches}, methods -${file.missedMethods}/${file.totalMethods}`)
    .join("\n");
}

/**
 * Verifies that the analysis files across the supplied OpenCover reports meet every coverage threshold.
 *
 * Honesty guarantees (never silently ignored):
 *  - Throws when a report contains no `<Module>` elements (malformed/empty report).
 *  - Throws when no file in any report matches any included fragment (typo'd/moved/renamed path).
 *  - Throws on a zero line, branch, or method denominator — a matched analysis file always branches, so a zero
 *    branch denominator means the reports were not read correctly and is never reported as a vacuous 100%.
 *  - Throws, naming every failing dimension and the worst offending files, when a percentage is below threshold.
 *
 * @param openCoverXmls Raw OpenCover XML report contents.
 * @param includedPathFragments Path fragments identifying the files this coverage gate is scoped to.
 * @param thresholds Minimum acceptable line/branch/method percentages.
 * @returns The merged measurement when every threshold is met.
 * @throws Error when the reports are malformed, unmatched, have a zero denominator, or fall below threshold.
 */
export function verifyOpenCover(
  openCoverXmls: readonly string[],
  includedPathFragments: readonly string[],
  thresholds: CoverageThresholds,
): CoverageMeasurement {
  if (includedPathFragments.length === 0) {
    throw new Error("verifyOpenCover requires at least one included path fragment.");
  }

  const measurement = measureOpenCover(openCoverXmls, includedPathFragments);

  if (measurement.files.length === 0) {
    throw new Error(
      `No files in the OpenCover report(s) matched any of the included path fragments: ${includedPathFragments.join(", ")}. ` +
        "Refusing to silently pass — verify the fragments still match the current source layout.",
    );
  }

  const matchedFiles = measurement.files.map((file) => file.path);

  for (const [dimension, total] of [
    ["line", measurement.totalLines],
    ["branch", measurement.totalBranches],
    ["method", measurement.totalMethods],
  ] as const) {
    if (total === 0) {
      throw new Error(
        `Matched ${matchedFiles.length} analysis file(s) but they contributed zero ${dimension} points; ` +
          `cannot honestly compute ${dimension} coverage from a zero denominator.`,
      );
    }
  }

  const failures: string[] = [];
  if (measurement.linePercent! < thresholds.lines) {
    failures.push(`lines ${measurement.linePercent!.toFixed(2)}% < ${thresholds.lines}% (${measurement.coveredLines}/${measurement.totalLines})`);
  }
  if (measurement.branchPercent! < thresholds.branches) {
    failures.push(`branches ${measurement.branchPercent!.toFixed(2)}% < ${thresholds.branches}% (${measurement.coveredBranches}/${measurement.totalBranches})`);
  }
  if (measurement.methodPercent! < thresholds.methods) {
    failures.push(`methods ${measurement.methodPercent!.toFixed(2)}% < ${thresholds.methods}% (${measurement.coveredMethods}/${measurement.totalMethods})`);
  }

  if (failures.length > 0) {
    throw new Error(
      `Analysis coverage gate failed across ${matchedFiles.length} file(s): ${failures.join("; ")}.\n  Worst offenders:\n${formatWorstOffenders(measurement)}`,
    );
  }

  return measurement;
}

/**
 * Recursively finds every `coverage.opencover.xml` file under `root`.
 *
 * @param root Directory to search recursively.
 * @returns Absolute paths to every discovered report, sorted deterministically.
 * @throws Error when `root` does not exist or is not a directory.
 */
async function findAllOpenCoverReports(root: string): Promise<string[]> {
  let rootStats;
  try {
    rootStats = await stat(root);
  } catch {
    throw new Error(`Analysis coverage results directory does not exist: ${root}`);
  }
  if (!rootStats.isDirectory()) {
    throw new Error(`Analysis coverage results directory is not a directory: ${root}`);
  }

  const found: string[] = [];

  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (entry.isFile() && entry.name === "coverage.opencover.xml") {
        found.push(entryPath);
      }
    }
  }

  await walk(root);
  return found.sort((left, right) => left.localeCompare(right));
}

/**
 * Deterministically selects every OpenCover report under `root` that actually contains at least one included
 * analysis file.
 *
 * This deliberately replaces "pick the newest report on disk": when several test projects write into a shared
 * results root, a newest-wins selector can silently gate on an unrelated project's report. Selection here is
 * content-based (does the report contain analysis files?) and order is a stable path sort, so the result never
 * depends on filesystem timestamps or directory enumeration order.
 *
 * @param root Directory to search recursively (the `dotnet test --results-directory` output root).
 * @param includedPathFragments Path fragments identifying the analysis files the gate is scoped to.
 * @returns Absolute paths to every matching report, sorted deterministically.
 * @throws Error when `root` is missing, holds no report, or holds reports that contain no analysis file.
 */
export async function selectOpenCoverReports(root: string, includedPathFragments: readonly string[]): Promise<string[]> {
  if (includedPathFragments.length === 0) {
    throw new Error("selectOpenCoverReports requires at least one included path fragment.");
  }

  const allReports = await findAllOpenCoverReports(root);

  if (allReports.length === 0) {
    throw new Error(
      `No coverage.opencover.xml found under ${root}. Ensure the coverage collection step includes ` +
        '"Format=opencover" (e.g. --collect:"XPlat Code Coverage;Format=opencover").',
    );
  }

  const normalizedFragments = includedPathFragments.map(normalizePath);
  const selected: string[] = [];

  for (const reportPath of allReports) {
    const document_ = parseXmlDocument(await readFile(reportPath, "utf8"));
    const containsAnalysisFile = Array.from(document_.getElementsByTagName("File")).some((fileElement) => {
      const fullPath = fileElement.getAttribute("fullPath");
      return fullPath !== null && isIncluded(normalizePath(fullPath), normalizedFragments);
    });

    if (containsAnalysisFile) {
      selected.push(reportPath);
    }
  }

  if (selected.length === 0) {
    throw new Error(
      `Found ${allReports.length} OpenCover report(s) under ${root}, but none contained any included analysis file. ` +
        "Refusing to gate on an unrelated project's report — run the dedicated Domain.Tests coverage collection.",
    );
  }

  return selected;
}

/** Parsed command-line options for the analysis coverage verifier. */
export interface CliOptions {
  readonly resultsDirectory: string;
  readonly threshold: number;
}

/**
 * Parses CLI arguments for the analysis coverage verifier.
 *
 * @param argv Raw CLI arguments (excluding the Node executable and script path).
 * @returns The parsed results directory and uniform threshold.
 * @throws Error when `--threshold` is not a number in the inclusive range [0, 100].
 */
export function parseCliOptions(argv: readonly string[]): CliOptions {
  const {values} = parseArgs({
    args: [...argv],
    options: {
      "results-directory": {type: "string"},
      threshold: {type: "string"},
    },
    strict: true,
  });

  const resultsDirectory = values["results-directory"] ?? DEFAULT_RESULTS_DIRECTORY;
  const thresholdRaw = values.threshold ?? String(DEFAULT_THRESHOLDS.lines);
  const threshold = Number(thresholdRaw);

  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    throw new Error(`Invalid --threshold value: ${thresholdRaw}. Must be a number between 0 and 100.`);
  }

  return {resultsDirectory, threshold};
}

/**
 * Runs the analysis pipeline coverage gate: deterministically selects every OpenCover report under the results
 * directory that contains analysis files, merges them, and verifies them against the default included fragments.
 *
 * @returns Process exit code (0 on success).
 */
export async function main(): Promise<number> {
  const {resultsDirectory, threshold} = parseCliOptions(process.argv.slice(2));
  const reportPaths = await selectOpenCoverReports(resolve(resultsDirectory), DEFAULT_INCLUDED_PATH_FRAGMENTS);
  const reports = await Promise.all(reportPaths.map((reportPath) => readFile(reportPath, "utf8")));

  const measurement = verifyOpenCover(reports, DEFAULT_INCLUDED_PATH_FRAGMENTS, {
    lines: threshold,
    branches: threshold,
    methods: threshold,
  });

  console.info(
    `Analysis coverage gate passed (>= ${threshold}%) across ${measurement.files.length} file(s) from ${reportPaths.length} report(s):\n` +
      `  lines    ${measurement.linePercent!.toFixed(2)}% (${measurement.coveredLines}/${measurement.totalLines})\n` +
      `  branches ${measurement.branchPercent!.toFixed(2)}% (${measurement.coveredBranches}/${measurement.totalBranches})\n` +
      `  methods  ${measurement.methodPercent!.toFixed(2)}% (${measurement.coveredMethods}/${measurement.totalMethods})\n` +
      reportPaths.map((reportPath) => `  report: ${reportPath}`).join("\n"),
  );
  return 0;
}

const isDirectExecution = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectExecution) {
  try {
    process.exitCode = await main();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
