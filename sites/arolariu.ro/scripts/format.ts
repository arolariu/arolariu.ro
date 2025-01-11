/**
 * This script will run the Prettier CLI to format the code in the project.
 * The Prettier configuration is in the `prettier.config.js` file.
 *
 * @format
 */

import {execSync} from "child_process";
import fs from "fs";
import path from "path";

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
}
