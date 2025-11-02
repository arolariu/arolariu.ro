/**
 * Test file for vitest-helper.ts
 * Validates coverage summary parsing and markdown generation
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import getVitestResultsSection from "./vitest-helper.ts";

// Mock core object for testing
const mockCore = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  warning: (message: string) => console.warn(`[WARN] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`),
  debug: (message: string) => console.log(`[DEBUG] ${message}`),
};

/**
 * Creates a temporary coverage-summary.json file for testing
 */
async function createTestCoverageFile(tempDir: string): Promise<string> {
  const coverageData = {
    total: {
      lines: {total: 100, covered: 95, skipped: 0, pct: 95.0},
      statements: {total: 120, covered: 110, skipped: 0, pct: 91.67},
      functions: {total: 30, covered: 28, skipped: 0, pct: 93.33},
      branches: {total: 40, covered: 36, skipped: 0, pct: 90.0},
    },
    "/test/file1.ts": {
      lines: {total: 50, covered: 48, skipped: 0, pct: 96.0},
      statements: {total: 60, covered: 55, skipped: 0, pct: 91.67},
      functions: {total: 15, covered: 14, skipped: 0, pct: 93.33},
      branches: {total: 20, covered: 18, skipped: 0, pct: 90.0},
    },
  };

  const coveragePath = path.join(tempDir, "coverage-summary.json");
  await fs.mkdir(tempDir, {recursive: true});
  await fs.writeFile(coveragePath, JSON.stringify(coverageData, null, 2));

  return coveragePath;
}

/**
 * Main test function
 */
async function runTests() {
  console.log("🧪 Testing Vitest Helper...\n");

  const tempDir = path.join(process.cwd(), "temp-test-coverage");

  try {
    // Setup: Create test coverage file
    console.log("📝 Setting up test coverage file...");
    const coveragePath = await createTestCoverageFile(tempDir);
    console.log(`✓ Created test coverage file at ${coveragePath}\n`);

    // Set environment variable to point to test coverage
    const originalWorkspace = process.env["GITHUB_WORKSPACE"];
    const testWorkspacePath = path.dirname(path.dirname(tempDir));
    process.env["GITHUB_WORKSPACE"] = testWorkspacePath;

    // Create the expected directory structure
    const expectedCoveragePath = path.join(testWorkspacePath, "sites/arolariu.ro/coverage/vitest");
    await fs.mkdir(expectedCoveragePath, {recursive: true});
    await fs.copyFile(coveragePath, path.join(expectedCoveragePath, "coverage-summary.json"));

    // Test: Generate coverage section
    console.log("🔍 Testing getVitestResultsSection()...");
    const result = await getVitestResultsSection(mockCore as any);
    console.log("✓ Function executed successfully\n");

    // Validate: Check result contains expected content
    console.log("✅ Validating result...");
    const checks = [
      {condition: result.includes("🧪 Vitest Test Results"), message: "Contains Vitest header"},
      {condition: result.includes("**All files**"), message: "Contains total coverage row"},
      {condition: result.includes("% Statements"), message: "Contains column headers"},
      {condition: result.includes("95.00"), message: "Contains correct line coverage percentage"},
      {condition: result.includes("91.67"), message: "Contains correct statement coverage percentage"},
    ];

    let allPassed = true;
    for (const check of checks) {
      if (check.condition) {
        console.log(`  ✓ ${check.message}`);
      } else {
        console.log(`  ✗ ${check.message}`);
        allPassed = false;
      }
    }

    if (allPassed) {
      console.log("\n✅ All tests passed!\n");
      console.log("Sample output:");
      console.log("─".repeat(60));
      console.log(result);
      console.log("─".repeat(60));
    } else {
      console.error("\n❌ Some tests failed!");
      process.exit(1);
    }

    // Cleanup
    console.log("\n🧹 Cleaning up...");
    await fs.rm(tempDir, {recursive: true, force: true});
    await fs.rm(path.join(testWorkspacePath, "sites"), {recursive: true, force: true});

    if (originalWorkspace !== undefined) {
      process.env["GITHUB_WORKSPACE"] = originalWorkspace;
    } else {
      delete process.env["GITHUB_WORKSPACE"];
    }

    console.log("✓ Cleanup complete\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
    // Cleanup on error
    try {
      await fs.rm(tempDir, {recursive: true, force: true});
    } catch {
      // Ignore cleanup errors
    }
    process.exit(1);
  }
}

// Run tests
runTests();
