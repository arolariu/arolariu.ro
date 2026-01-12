/**
 * @fileoverview Shared utilities for monorepo scripts (CI detection, spinners, environment helpers).
 * @module scripts/common
 *
 * @remarks
 * These helpers are consumed by various `scripts/*.ts` entry points.
 * They are intentionally runtime-lightweight and avoid importing heavy toolchains.
 */

import {createSpinner} from "nanospinner";
import {spawn} from "node:child_process";
import pc from "picocolors";

/**
 * Runs a command with a spinner and captures output.
 *
 * @param command - The command to run.
 * @param args - Command arguments.
 * @param spinnerText - The text to show in the spinner.
 * @param hideOutput - Whether to hide the output (useful for parallel execution).
 * @returns A promise resolving to the exit code and captured output.
 * @throws Error when inputs are invalid.
 */
export async function runWithSpinner(
  command: string,
  args: string[],
  spinnerText: string,
  hideOutput: boolean = true,
): Promise<{code: number; output: string}> {
  // Input validation
  if (!command || command.trim().length === 0) {
    throw new Error("Command cannot be empty");
  }
  if (!Array.isArray(args)) {
    throw new Error("Arguments must be an array");
  }
  if (!spinnerText || spinnerText.trim().length === 0) {
    throw new Error("Spinner text cannot be empty");
  }

  switch (hideOutput) {
    case true: {
      const spinner = createSpinner(spinnerText).start();

      return new Promise((resolve) => {
        const child = spawn(command, args, {
          stdio: "pipe",
          windowsHide: true,
        });

        let output = "";
        let errorOutput = "";

        // Wait for the spawn event to ensure PID is available
        child.on("spawn", () => {
          const pidText = pc.gray(`[PID: ${child.pid || "N/A"}]`);
          spinner.update({text: `${spinnerText} ${pidText}`});
        });

        child.stdout?.on("data", (data) => {
          output += data.toString();
        });

        child.stderr?.on("data", (data) => {
          errorOutput += data.toString();
        });

        child.on("close", (code) => {
          const fullOutput = output + errorOutput;
          const pidText = pc.gray(`[PID: ${child.pid}]`);
          if (code === 0) {
            spinner.success({text: `${spinnerText} ${pc.green("✓")} ${pidText}`});
          } else {
            spinner.error({text: `${spinnerText} ${pc.red("✗")} ${pidText}`});
            if (fullOutput.trim()) {
              console.log(pc.gray(`\n${fullOutput.trim()}\n`));
            }
          }
          resolve({code: code ?? 1, output: fullOutput});
        });

        child.on("error", (error) => {
          spinner.error({text: `${spinnerText} ${pc.red("✗")}`});
          console.error(pc.red(`Error: ${error.message}`));
          resolve({code: 1, output: error.message});
        });
      });
    }
    case false: {
      console.log(pc.cyan(`\n${spinnerText} ...`));

      return new Promise((resolve) => {
        const child = spawn(command, args, {
          stdio: "inherit",
          windowsHide: true,
        });

        child.on("close", (code) => {
          if (code === 0) {
            console.log(pc.green(`  ✓ ${spinnerText} completed successfully!\n`));
          } else {
            console.log(pc.red(`  ✗ ${spinnerText} failed!\n`));
          }
          resolve({code: code ?? 1, output: ""});
        });

        child.on("error", (error) => {
          console.error(pc.red(`  ✗ Error: ${error.message}!\n`));
          resolve({code: 1, output: error.message});
        });
      });
    }
    default:
      throw new Error("The `hideOutput` variable should NOT be undefined!");
  }
}

/**
 * Environment flag to determine if we are in production.
 */
export const isProductionEnvironment = process.env["PRODUCTION"] === "true";

/**
 * Environment flag to determine if we are using Azure App Configuration.
 */
export const isAzureInfrastructure = process.env["INFRA"] === "azure";

/**
 * Environment flag to determine if we are in verbose mode.
 * In verbose mode, more detailed logs are printed to the console.
 */
export const isVerboseMode = process.env["VERBOSE"] === "true";

/**
 * Environment flag to determine if we are in a CI/CD environment.
 */
export const isInCI = !!(process.env["CI"] ?? process.env["GITHUB_ACTIONS"]);
