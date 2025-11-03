/**
 * @fileoverview Generates a comprehensive bundle size report for PR comments
 * @module scripts/bundle-size-report
 * 
 * This script demonstrates the new helper architecture pattern:
 * - Uses helper default instances (env, fs, git, github, comments)
 * - Clean, readable code without parameter passing
 * - Type-safe throughout
 * - Follows SOLID principles
 */

import * as core from "@actions/core";
import { env, fs, git, createGitHubHelper, createCommentBuilder, MarkdownUtils } from "../helpers/index.ts";

/**
 * Bundle size information for a file
 */
interface BundleFile {
  /** File path */
  path: string;
  /** Current size in bytes */
  currentSize: number;
  /** Previous size in bytes (from base branch) */
  previousSize: number;
  /** Size change in bytes */
  changeBytes: number;
  /** Size change as percentage */
  changePercent: number;
}

/**
 * Bundle size report data
 */
interface BundleReport {
  /** Total current size */
  totalCurrent: number;
  /** Total previous size */
  totalPrevious: number;
  /** Total change */
  totalChange: number;
  /** Individual file changes */
  files: BundleFile[];
}

/**
 * Target directories to analyze
 */
const BUNDLE_DIRECTORIES = [
  "sites/arolariu.ro/.next/static",
  "sites/arolariu.ro/dist",
  "packages/components/dist",
];

/**
 * Calculates bundle size report
 * @param baseRef - Base Git reference (usually origin/main)
 * @param headRef - Head Git reference (usually HEAD)
 * @returns Bundle report data
 */
async function calculateBundleSizes(baseRef: string, headRef: string): Promise<BundleReport> {
  core.info("📊 Calculating bundle sizes...");

  // Get file sizes from both refs
  const [currentSizes, previousSizes] = await Promise.all([
    git.getFileSizes(headRef, BUNDLE_DIRECTORIES),
    git.getFileSizes(baseRef, BUNDLE_DIRECTORIES),
  ]);

  // Combine into file reports
  const allPaths = new Set([...Object.keys(currentSizes), ...Object.keys(previousSizes)]);
  const files: BundleFile[] = [];

  for (const path of allPaths) {
    const currentSize = currentSizes[path] ?? 0;
    const previousSize = previousSizes[path] ?? 0;
    const changeBytes = currentSize - previousSize;
    const changePercent = previousSize > 0 ? (changeBytes / previousSize) * 100 : 0;

    files.push({
      path,
      currentSize,
      previousSize,
      changeBytes,
      changePercent,
    });
  }

  // Sort by absolute change (largest changes first)
  files.sort((a, b) => Math.abs(b.changeBytes) - Math.abs(a.changeBytes));

  // Calculate totals
  const totalCurrent = files.reduce((sum, f) => sum + f.currentSize, 0);
  const totalPrevious = files.reduce((sum, f) => sum + f.previousSize, 0);
  const totalChange = totalCurrent - totalPrevious;

  return {
    totalCurrent,
    totalPrevious,
    totalChange,
    files,
  };
}

/**
 * Builds a formatted comment from bundle report
 * @param report - Bundle report data
 * @param baseRef - Base reference name
 * @param headRef - Head reference name
 * @returns Formatted markdown comment
 */
function buildReportComment(report: BundleReport, baseRef: string, headRef: string): string {
  const builder = createCommentBuilder();

  // Header
  builder.addHeading("📦 Bundle Size Report", 2);

  // Summary badge
  const totalChangeKb = report.totalChange / 1024;
  if (Math.abs(totalChangeKb) < 1) {
    builder.addBadge("No significant change", "success");
  } else if (totalChangeKb > 10) {
    builder.addBadge(`Bundle increased by ${MarkdownUtils.formatBytes(report.totalChange)}`, "error");
  } else if (totalChangeKb < -10) {
    builder.addBadge(`Bundle decreased by ${MarkdownUtils.formatBytes(Math.abs(report.totalChange))}`, "success");
  } else {
    builder.addBadge(`Bundle changed by ${MarkdownUtils.formatBytes(Math.abs(report.totalChange))}`, "warning");
  }

  builder.addNewline();

  // Comparison info
  builder.addParagraph(`Comparing ${MarkdownUtils.code(baseRef)} → ${MarkdownUtils.code(headRef)}`);
  builder.addNewline();

  // Summary table
  builder.addHeading("Summary", 3);
  builder.addTable(
    [
      { header: "Metric", align: "left" },
      { header: "Size", align: "right" },
    ],
    [
      ["Current Total", MarkdownUtils.formatBytes(report.totalCurrent)],
      ["Previous Total", MarkdownUtils.formatBytes(report.totalPrevious)],
      ["Change", `${MarkdownUtils.diff(report.totalChange, true)} (${MarkdownUtils.formatBytes(Math.abs(report.totalChange))})`],
    ]
  );

  // Detailed file changes (top 10)
  const topChanges = report.files.slice(0, 10);
  if (topChanges.length > 0) {
    builder.addHeading("Top File Changes", 3);
    
    const fileRows = topChanges.map((file) => {
      const fileName = file.path.split("/").pop() ?? file.path;
      const currentSize = MarkdownUtils.formatBytes(file.currentSize);
      const change = `${MarkdownUtils.diff(file.changeBytes, true)} (${MarkdownUtils.formatBytes(Math.abs(file.changeBytes))})`;
      const percent = file.previousSize > 0 ? MarkdownUtils.formatPercent(file.changePercent, false) : "N/A";
      
      return [fileName, currentSize, change, percent];
    });

    builder.addTable(
      [
        { header: "File", align: "left" },
        { header: "Current Size", align: "right" },
        { header: "Change", align: "right" },
        { header: "%", align: "right" },
      ],
      fileRows
    );
  }

  // All files in collapsible section
  if (report.files.length > 10) {
    const allFilesList = report.files.map((file) => {
      const change = MarkdownUtils.diff(file.changeBytes, true);
      return `${file.path}: ${MarkdownUtils.formatBytes(file.currentSize)} (${change} bytes)`;
    });

    builder.addCollapsible(
      `All Files (${report.files.length} total)`,
      allFilesList.join("\n"),
      true
    );
  }

  // Add identifier for comment updates
  builder.addIdentifier("bundle-size-report-v1");

  return builder.build();
}

/**
 * Main function - generates and posts bundle size report
 */
export default async function generateBundleSizeReport(): Promise<void> {
  try {
    core.info("🚀 Starting bundle size report generation");

    // Get GitHub token
    const token = env.getRequired("GITHUB_TOKEN");
    const gh = createGitHubHelper(token);

    // Get PR context
    const pr = gh.getPullRequest();
    if (!pr) {
      core.info("Not a PR context, skipping bundle size report");
      return;
    }

    core.info(`Processing PR #${pr.number}: ${pr.title}`);

    // Get Git references
    const baseRef = env.get("BASE_REF", "origin/main");
    const headRef = env.get("HEAD_REF", "HEAD");

    // Ensure base branch is fetched
    await git.fetchBranch("main", "origin");

    // Calculate bundle sizes
    const report = await calculateBundleSizes(baseRef, headRef);

    core.info(`Total current size: ${MarkdownUtils.formatBytes(report.totalCurrent)}`);
    core.info(`Total previous size: ${MarkdownUtils.formatBytes(report.totalPrevious)}`);
    core.info(`Change: ${report.totalChange} bytes (${report.files.length} files)`);

    // Build comment
    const comment = buildReportComment(report, baseRef, headRef);

    // Post or update comment
    await gh.upsertComment(pr.number, comment, "bundle-size-report-v1");

    core.info("✅ Bundle size report posted successfully");

    // Set outputs for workflow consumption
    core.setOutput("total-size", report.totalCurrent.toString());
    core.setOutput("size-change", report.totalChange.toString());
    core.setOutput("files-changed", report.files.length.toString());

  } catch (error) {
    const err = error as Error;
    core.error(`❌ Failed to generate bundle size report: ${err.message}`);
    core.setFailed(err.message);
  }
}

// Allow direct execution for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  generateBundleSizeReport();
}
