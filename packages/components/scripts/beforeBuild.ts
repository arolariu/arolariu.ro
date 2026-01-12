/**
 * @fileoverview Pre-build script for the shared components package.
 * @module packages/components/scripts/beforeBuild
 *
 * @remarks
 * Runs local build-time housekeeping steps (e.g., clean) before the primary build.
 */

import {execSync} from "node:child_process";

/**
 * Executes a series of scripts to prepare for the build process.
 *
 * This function performs the following operations sequentially:
 * 1. Cleans the build directory using the clean script
 * 2. Formats the code using the format script
 * 3. Generates new licenses and acknowledgements
 *
 * Each step is logged to the console with appropriate start and completion messages.
 */
export default async function main() {
  console.info("[arolariu.ro::beforeBuild] Running before build scripts...");

  // 1. Clean the build directory using the clean script
  console.info("[arolariu.ro::beforeBuild] Cleaning build directory...");
  // clean using npm run build:clean script
  execSync("npm run build:clean");

  console.info("[arolariu.ro::beforeBuild] Finished running before build scripts.");
}

main();
