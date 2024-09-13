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
  console.error("The Prettier configuration file does not exist.");
  process.exit(1);
}

console.log("Checking the code with Prettier...");

try {
  execSync(`npx prettier --check . --config-precedence prefer-file --cache --cache-strategy metadata`, {
    stdio: "inherit",
  });
} catch (error) {
  console.error("The code is not formatted with Prettier!.");
  console.log("Formatting the code with Prettier...");

  execSync(`npx prettier --write . --config-precedence prefer-file --cache --cache-strategy metadata`, {
    stdio: "inherit",
  });

  console.log("The code has been formatted with Prettier.");
}
