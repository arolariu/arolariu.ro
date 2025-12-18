/**
 * @fileoverview E2E runner for OpenAPI/Postman collections via Newman.
 * @module scripts/test-e2e
 *
 * @remarks
 * This script executes Postman collections (one per target) using Newman.
 * It injects an auth token into the collection at runtime, produces JSON/JUnit
 * reports, and generates a Markdown summary of failed assertions.
 */

import {execSync} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import pc from "picocolors";

type E2ETestTarget = "frontend" | "backend" | "all";

const directoryMap: Record<Exclude<E2ETestTarget, "all">, string> = {
  frontend: "sites/arolariu.ro",
  backend: "sites/api.arolariu.ro",
};

/**
 * Injects an authentication token into a Postman collection JSON file.
 *
 * @remarks
 * Newman collections may store variables under `collection.variable`.
 * This function ensures an `authToken` variable exists and is set.
 *
 * @param collectionPath - File path to the Postman collection JSON file.
 * @param token - Authentication token to inject.
 * @returns Nothing.
 */
const injectAuthTokenIntoCollection = (collectionPath: string, token: string): void => {
  try {
    console.log(pc.cyan(`\n🔑 Injecting auth token into collection...`));
    console.log(pc.gray(`   Path: ${collectionPath}`));
    const collection = JSON.parse(readFileSync(collectionPath, "utf-8"));

    const authTokenVariable = collection.variable.find((v: any) => v.key === "authToken");
    if (authTokenVariable) {
      authTokenVariable.value = token;
    } else {
      collection.variable.push({key: "authToken", value: token, type: "string"});
    }

    writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
    console.log(pc.green(`   ✓ Auth token injected successfully`));
  } catch (error) {
    console.error(pc.red("   ✗ Failed to inject auth token into collection:"), error);
  }
};

/**
 * Resolves the collection path for a target.
 *
 * @param target - The target to load the collection for.
 * @returns File path to the Postman collection JSON.
 */
const loadOpenAPITestCollectionPath = (target: Exclude<E2ETestTarget, "all">): string => {
  const directory = directoryMap[target];
  return `${directory}/postman-collection.json`;
};

/**
 * Ensures the report output directory exists.
 *
 * @param dir - Directory path to create.
 * @returns Nothing.
 */
const ensureReportDir = (dir: string): void => {
  try {
    mkdirSync(dir, {recursive: true});
    console.log(pc.gray(`   📁 Report directory: ${dir}`));
  } catch (e) {
    console.error(pc.red("   ✗ Failed to create report directory:"), dir, e);
  }
};

/**
 * Writes a Markdown summary of Newman assertion failures.
 *
 * @remarks
 * Uses the JSON reporter output (`newman-<target>.json`) to extract failures.
 * This is primarily intended for CI artifact inspection.
 *
 * @param target - Target identifier used in report filenames.
 * @param reportDir - Report directory path.
 * @returns Nothing.
 */
const writeAssertionSummary = (target: string, reportDir: string): void => {
  const jsonPath = `${reportDir}/newman-${target}.json`;
  if (!existsSync(jsonPath)) {
    console.warn(pc.yellow(`   ⚠ JSON report not found, cannot create summary: ${jsonPath}`));
    return;
  }
  try {
    const data = JSON.parse(readFileSync(jsonPath, "utf-8"));
    const failures = (data.run?.failures || []).map((f: any) => ({
      assertion: f.assertion,
      error: f.error?.message || f.error,
      item: f.source?.name || f.parent?.name || f.cursor?.scriptId || "Unknown",
    }));
    let md = `### Failed Assertions (${target})\n`;
    if (!failures.length) {
      md += "No failed assertions.\n";
      console.log(pc.green(`   ✓ No failed assertions for ${target}`));
    } else {
      failures.forEach((f: any, i: number) => {
        md += `${i + 1}. AssertionError  ${f.assertion}\n   ${f.error}\n   in "${f.item}"\n\n`;
      });
      console.log(pc.yellow(`   ⚠ ${failures.length} failed assertion(s) for ${target}`));
    }
    writeFileSync(`${reportDir}/newman-${target}-summary.md`, md.trim() + "\n");
    console.log(pc.gray(`   📄 Summary written to: ${reportDir}/newman-${target}-summary.md`));
  } catch (e) {
    console.error(pc.red("   ✗ Error while writing assertion summary:"), e);
  }
};

/**
 * Runs a Newman collection and produces JSON/JUnit reports.
 *
 * @remarks
 * Throws when Newman exits with a non-zero code.
 *
 * @param target - The target whose collection is being executed.
 * @param path - Path to the Postman collection JSON.
 * @param reportDir - Directory to write report artifacts.
 * @returns A promise that resolves when execution completes.
 */
const runOpenAPITestCollection = async (target: Exclude<E2ETestTarget, "all">, path: string, reportDir: string): Promise<void> => {
  console.log(pc.cyan(`\n🧪 Running Newman test collection for: ${pc.bold(target)}`));
  ensureReportDir(reportDir);
  const jsonPath = `${reportDir}/newman-${target}.json`;
  const junitPath = `${reportDir}/newman-${target}.xml`;

  console.log(pc.gray(`   📊 JSON report: ${jsonPath}`));
  console.log(pc.gray(`   📊 JUnit report: ${junitPath}`));
  console.log(pc.cyan(`\n⚡ Executing tests...\n`));

  try {
    execSync(
      `npx newman run "${path}" --reporters cli,json,junit --reporter-json-export "${jsonPath}" --reporter-junit-export "${junitPath}"`,
      {stdio: "inherit"},
    );
    console.log(pc.green(`\n   ✓ Newman tests passed for ${target}`));
  } catch (error) {
    console.error(pc.red(`\n   ✗ Newman tests failed for ${target}`));
    throw error;
  } finally {
    try {
      console.log(pc.cyan(`\n📝 Generating assertion summary...`));
      writeAssertionSummary(target, reportDir);
    } catch (e) {
      console.error(pc.red("   ✗ Failed generating assertion summary:"), e);
    }
  }
};

/**
 * Runs the Newman testing flow for a specific target.
 *
 * @remarks
 * Requires `E2E_TEST_AUTH_TOKEN` to be set in the environment.
 *
 * @param target - The target to run Newman tests for.
 * @returns A promise that resolves when the flow completes.
 * @throws {Error} When `E2E_TEST_AUTH_TOKEN` is missing.
 */
const startNewmanTesting = async (target: Exclude<E2ETestTarget, "all">): Promise<void> => {
  console.log(pc.bold(pc.magenta(`\n╔════════════════════════════════════════╗`)));
  console.log(pc.bold(pc.magenta(`║   E2E Testing: ${target.padEnd(23)} ║`)));
  console.log(pc.bold(pc.magenta(`╚════════════════════════════════════════╝`)));

  const path = loadOpenAPITestCollectionPath(target);
  const authToken = process.env["E2E_TEST_AUTH_TOKEN"] || "";
  if (!authToken) {
    console.error(pc.red("\n✗ E2E_TEST_AUTH_TOKEN environment variable is not set."));
    console.log(pc.yellow("💡 Set the E2E_TEST_AUTH_TOKEN environment variable before running tests.\n"));
    throw new Error("E2E_TEST_AUTH_TOKEN environment variable is not set.");
  }
  const reportDir = process.env["NEWMAN_REPORT_DIR"] || "e2e-logs";

  console.log(pc.cyan(`\n📦 Test collection: ${pc.bold(target)}`));
  console.log(pc.gray(`   Path: ${path}`));

  injectAuthTokenIntoCollection(path, authToken);
  await runOpenAPITestCollection(target, path, reportDir);

  console.log(pc.bold(pc.green(`\n✅ Completed Newman tests for: ${target}\n`)));
};

/**
 * Runs the E2E CLI.
 *
 * @remarks
 * This is the script entrypoint used by `npm run test:e2e`.
 *
 * @param arg - Target selector (`frontend`, `backend`, `all`).
 * @returns Process exit code (0 for success, non-zero for failure).
 */
export async function main(arg?: string): Promise<number> {
  console.log(pc.bold(pc.magenta("\n╔════════════════════════════════════════╗")));
  console.log(pc.bold(pc.magenta("║   arolariu.ro E2E Test Runner          ║")));
  console.log(pc.bold(pc.magenta("╚════════════════════════════════════════╝\n")));

  if (!arg) {
    console.error(pc.red("✗ Missing target argument"));
    console.log(pc.gray("\n💡 Usage: test:e2e <frontend|backend|all>"));
    console.log(pc.gray("   - frontend: Run frontend E2E tests"));
    console.log(pc.gray("   - backend:  Run backend API tests"));
    console.log(pc.gray("   - all:      Run all E2E tests"));
    console.log(pc.yellow("\n⚠️  Note: E2E_TEST_AUTH_TOKEN environment variable must be set\n"));
    return 1;
  }

  try {
    switch (arg) {
      case "frontend":
        await startNewmanTesting("frontend");
        break;
      case "backend":
        await startNewmanTesting("backend");
        break;
      case "all":
        console.log(pc.bold(pc.cyan("\n🎯 Running all E2E tests...\n")));
        await startNewmanTesting("frontend");
        console.log(pc.gray("\n─────────────────────────────────────────────────\n"));
        await startNewmanTesting("backend");
        break;
      default:
        console.error(pc.red(`✗ Invalid target: "${arg}"`));
        console.log(pc.gray("\n💡 Valid targets: frontend, backend, all\n"));
        return 1;
    }

    console.log(pc.bold(pc.green("\n🎉 All E2E tests completed successfully!\n")));
    return 0;
  } catch (error) {
    console.error(pc.bold(pc.red("\n❌ E2E tests failed with errors\n")));
    return 1;
  }
}

if (import.meta.main) {
  const arg = process.argv[2];
  main(arg)
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
