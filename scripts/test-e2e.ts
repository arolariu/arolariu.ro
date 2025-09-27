import {execSync} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";

type E2ETestTarget = "frontend" | "backend" | "all";

const directoryMap: Record<Exclude<E2ETestTarget, "all">, string> = {
  frontend: "sites/arolariu.ro",
  backend: "sites/api.arolariu.ro",
};

/**
 * Injects an authentication token into a Postman collection JSON file.
 * @param collectionPath The file path to the Postman collection JSON file.
 * @param token The authentication token to inject.
 */
const injectAuthTokenIntoCollection = (collectionPath: string, token: string): void => {
  try {
    console.log(`Injecting auth token into collection at: ${collectionPath}`);
    const collection = JSON.parse(readFileSync(collectionPath, "utf-8"));

    const authTokenVariable = collection.variable.find((v: any) => v.key === "authToken");
    if (authTokenVariable) {
      authTokenVariable.value = token;
    } else {
      collection.variable.push({key: "authToken", value: token, type: "string"});
    }

    writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
  } catch (error) {
    console.error("Failed to inject auth token into collection:", error);
  }
};

/**
 * Load the OpenAPI test collection path for a specific target.
 * @param target The target to load the OpenAPI test collection for. Can be "frontend" or "backend".
 * @returns The file path to the OpenAPI test collection.
 */
const loadOpenAPITestCollectionPath = (target: Exclude<E2ETestTarget, "all">): string => {
  const directory = directoryMap[target];
  return `${directory}/postman-collection.json`;
};

/**
 * Run the OpenAPI test collection using Newman via npx (npx newman run <path>).
 * @param path The file path to the OpenAPI test collection.
 */
const ensureReportDir = (dir: string): void => {
  try {
    mkdirSync(dir, {recursive: true});
  } catch (e) {
    console.error("Failed to create report directory:", dir, e);
  }
};

const writeAssertionSummary = (target: string, reportDir: string): void => {
  const jsonPath = `${reportDir}/newman-${target}.json`;
  if (!existsSync(jsonPath)) {
    console.warn("JSON report not found, cannot create summary:", jsonPath);
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
    } else {
      failures.forEach((f: any, i: number) => {
        md += `${i + 1}. AssertionError  ${f.assertion}\n   ${f.error}\n   in "${f.item}"\n\n`;
      });
    }
    writeFileSync(`${reportDir}/newman-${target}-summary.md`, md.trim() + "\n");
  } catch (e) {
    console.error("Error while writing assertion summary:", e);
  }
};

const runOpenAPITestCollection = async (target: Exclude<E2ETestTarget, "all">, path: string, reportDir: string): Promise<void> => {
  ensureReportDir(reportDir);
  const jsonPath = `${reportDir}/newman-${target}.json`;
  const junitPath = `${reportDir}/newman-${target}.xml`;
  try {
    execSync(
      `npx newman run "${path}" --reporters cli,json,junit --reporter-json-export "${jsonPath}" --reporter-junit-export "${junitPath}"`,
      {stdio: "inherit"},
    );
  } catch (error) {
    console.error("Newman tests failed:", error);
    throw error;
  } finally {
    try {
      writeAssertionSummary(target, reportDir);
    } catch (e) {
      console.error("Failed generating assertion summary:", e);
    }
  }
};

/**
 * Start the Newman testing process for a specific target.
 * @param target The target to run the Newman tests for. Can be "frontend", "backend", or "all".
 */
const startNewmanTesting = async (target: Exclude<E2ETestTarget, "all">): Promise<void> => {
  const path = loadOpenAPITestCollectionPath(target);
  const authToken = process.env["E2E_TEST_AUTH_TOKEN"] || "";
  if (!authToken) {
    throw new Error("E2E_TEST_AUTH_TOKEN environment variable is not set.");
  }
  const reportDir = process.env["NEWMAN_REPORT_DIR"] || "e2e-logs";

  injectAuthTokenIntoCollection(path, authToken);
  console.log(`Starting Newman tests for target: ${target}, using collection at: ${path}`);
  await runOpenAPITestCollection(target, path, reportDir);
  console.log(`Completed Newman tests for target: ${target}`);
};

export async function main(arg?: string): Promise<number> {
  if (!arg) {
    console.error("Missing target. Usage: test:e2e <frontend|backend|all>");
    return 1;
  }

  switch (arg) {
    case "frontend":
      await startNewmanTesting("frontend");
      break;
    case "backend":
      await startNewmanTesting("backend");
      break;
    case "all":
      await startNewmanTesting("frontend");
      await startNewmanTesting("backend");
      break;
    default:
      console.error("Invalid or missing target. Usage: test:e2e <frontend|backend|all>");
      return 1;
  }

  return 0;
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
