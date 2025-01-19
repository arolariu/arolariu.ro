/** @format */

import {execSync} from "child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * This function will format the code with the Prettier CLI.
 * It will use the `prettier.config.js` file as the configuration file.
 * If the configuration file does not exist, the script will exit with an error.
 */
function formatCodeWithPrettier() {
  const prettierConfig = path.join(process.cwd(), "prettier.config.js");
  if (!fs.existsSync(prettierConfig)) {
    console.error("[arolariu::format] >>> The Prettier configuration file does not exist.");
    process.exit(1);
  }

  console.log("[arolariu::format] >>> Checking the code with Prettier...");

  try {
    execSync(`npx prettier --check . --config-precedence prefer-file --cache --cache-strategy metadata`, {
      stdio: "inherit",
    });
  } catch (error) {
    console.error("[arolariu::format] >>> The code is not formatted with Prettier!.");
    console.log("[arolariu::format] >>> Formatting the code with Prettier...");

    execSync(`npx prettier --write . --config-precedence prefer-file --cache --cache-strategy metadata`, {
      stdio: "inherit",
    });

    console.log("[arolariu::format] >>> The code has been formatted with Prettier.");
  } finally {
    console.log("[arolariu::format] >>> The code has been processed with Prettier.");
  }
}

/**
 * This is the function that will be executed when this script is ran.
 */
export default async function main() {
  console.info("[arolariu::format] Formatting the code...");
  formatCodeWithPrettier();
}

main();
