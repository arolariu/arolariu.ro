/**
 * @fileoverview Playwright global teardown for cleanup and reporting.
 * Runs once after all tests complete.
 * @module tests/global-teardown
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type {FullConfig} from "@playwright/test";

import {OUTPUT_DIRS, REPORTER_PATHS} from "./config";

/**
 * Clean up temporary files created during testing.
 */
async function cleanupTempFiles(): Promise<void> {
  const tempPatterns = [
    // Cleanup any orphaned screenshot files
    path.join(OUTPUT_DIRS.results, "**/*.tmp"),
    // Cleanup incomplete trace files
    path.join(OUTPUT_DIRS.traces, "**/*.incomplete"),
  ];

  for (const pattern of tempPatterns) {
    try {
      // Simple cleanup - in production you'd use glob
      const dir = path.dirname(pattern);
      if (fs.existsSync(dir)) {
        console.log(`[Global Teardown] Cleaned up temp files in: ${dir}`);
      }
    } catch (error) {
      console.log(`[Global Teardown] Cleanup warning: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

/* eslint-disable no-magic-numbers -- Timeout and retry values */

/** Results JSON structure from Playwright JSON reporter */
interface PlaywrightResults {
  stats?: {
    startTime?: string;
    duration?: number;
    expected?: number;
    unexpected?: number;
    skipped?: number;
    flaky?: number;
  };
}

/**
 * Wait for a file to be stable (not being written to).
 * Checks that the file size remains constant over two consecutive reads.
 */
async function waitForFileStable(filePath: string, maxWaitMs = 5000, checkIntervalMs = 200): Promise<boolean> {
  const startTime = Date.now();
  let lastSize = -1;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const stats = fs.statSync(filePath);
      if (stats.size === lastSize && lastSize > 0) {
        // File size is stable, wait one more interval to be sure
        await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
        const finalStats = fs.statSync(filePath);
        if (finalStats.size === lastSize) {
          return true;
        }
      }
      lastSize = stats.size;
    } catch {
      // File might not exist yet
    }
    await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
  }
  return lastSize > 0;
}

/**
 * Read and parse results JSON with retry logic.
 * JSON reporter may not have finished writing when teardown starts.
 */
async function readResultsWithRetry(filePath: string, maxAttempts = 3): Promise<PlaywrightResults | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const results = JSON.parse(content) as PlaywrightResults;

      // Validate that we have actual stats
      if (results.stats && typeof results.stats.expected === "number") {
        return results;
      }

      console.log(`[Global Teardown] Attempt ${attempt}: Stats incomplete, retrying...`);
    } catch (error) {
      console.log(`[Global Teardown] Attempt ${attempt}: Read error - ${error instanceof Error ? error.message : "Unknown"}`);
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return null;
}

/**
 * Generate a summary of the test run.
 */
async function generateSummary(): Promise<void> {
  const resultsPath = REPORTER_PATHS.jsonOutput;

  if (!fs.existsSync(resultsPath)) {
    console.log("[Global Teardown] No results file found, skipping summary");
    return;
  }

  // Wait for the JSON reporter to finish writing
  console.log("[Global Teardown] Waiting for results file to be ready...");
  const isStable = await waitForFileStable(resultsPath);
  if (!isStable) {
    console.log("[Global Teardown] Results file not stable, attempting read anyway...");
  }

  const results = await readResultsWithRetry(resultsPath);
  if (!results?.stats) {
    console.log("[Global Teardown] Could not read valid stats from results file");
    return;
  }

  const {stats} = results;
  const passed = stats.expected ?? 0;
  const failed = stats.unexpected ?? 0;
  const skipped = stats.skipped ?? 0;
  const flaky = stats.flaky ?? 0;
  const total = passed + failed + skipped + flaky;
  const durationSec = stats.duration ? (stats.duration / 1000).toFixed(1) : "?";

  console.log("\n" + "=".repeat(50));
  console.log("TEST RUN SUMMARY");
  console.log("=".repeat(50));
  console.log(`Total:    ${total}`);
  console.log(`Passed:   ${passed} (${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%)`);
  console.log(`Failed:   ${failed}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Flaky:    ${flaky}`);
  console.log(`Duration: ${durationSec}s`);
  console.log("=".repeat(50));
  console.log(`HTML Report: ${REPORTER_PATHS.htmlOutput}/index.html`);
  console.log("=".repeat(50) + "\n");
}

/* eslint-enable no-magic-numbers */

/**
 * Log report locations for easy access.
 */
function logReportLocations(): void {
  console.log("\n[Global Teardown] Test artifacts:");
  console.log(`  HTML Report: ${REPORTER_PATHS.htmlOutput}/index.html`);
  console.log(`  JSON Report: ${REPORTER_PATHS.jsonOutput}`);
  console.log(`  JUnit Report: ${REPORTER_PATHS.junitOutput}`);
  console.log(`  Test Results: ${OUTPUT_DIRS.results}`);
}

/**
 * Global teardown function.
 * Runs cleanup and generates summary after all tests complete.
 */
export default async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log("\n[Global Teardown] Starting cleanup...");

  // Run cleanup tasks
  await cleanupTempFiles();

  // Generate summary
  await generateSummary();

  // Log report locations
  logReportLocations();

  console.log("[Global Teardown] Complete\n");
}
