import {execFile} from "node:child_process";
import {resolve} from "node:path";
import {promisify} from "node:util";

const execFileAsync = promisify(execFile);

/** Runs compiler work outside Vitest's precise-coverage process and forwards diagnostic output on failure. */
export async function runCompilerCheck(script: string, args: readonly string[], timeout: number): Promise<void> {
  try {
    await execFileAsync(process.execPath, [resolve(import.meta.dirname, script), ...args], {timeout});
  } catch (error) {
    const output = error instanceof Error && "stdout" in error && typeof error.stdout === "string" ? error.stdout.trim() : "";
    throw new Error(output || (error instanceof Error ? error.message : String(error)), {cause: error});
  }
}
