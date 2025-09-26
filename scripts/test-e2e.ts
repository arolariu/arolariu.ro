import {execSync} from "node:child_process";
import {writeFileSync} from "node:fs";

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
    const collection = require(collectionPath);

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
const runOpenAPITestCollection = async (path: string): Promise<void> => {
  try {
    execSync(`npx newman run "${path}"`, {stdio: "inherit"});
  } catch (error) {
    console.error("Newman tests failed:", error);
    throw error;
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

  injectAuthTokenIntoCollection(path, authToken);
  console.log(`Starting Newman tests for target: ${target}, using collection at: ${path}`);
  await runOpenAPITestCollection(path);
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
