/**
 * @fileoverview Fixed native-process bridge to the root workspace-facts worker.
 * @module github/scripts/helpers/workspace
 */
import {join} from "node:path";
import {getExecOutput, type ExecOutput} from "../sdk/exec.ts";

/**
 * Invokes only the sanctioned facts adapter with an argument-vector root.
 * @param root - Absolute repository root used as both worker input and cwd.
 * @returns Captured native exit/stdout/stderr, including nonzero evidence.
 * @throws Original startup failures; callers validate/classify captured output.
 * @remarks Root dependencies load only in this child. The existing provider owns
 * its Nx timeout, temporary state, validation, and cleanup; this adds no engine.
 */
export function runWorkspaceInspection(root: string): Promise<ExecOutput> {
  // The SDK parses its first parameter as a command line, not a literal path.
  const executable = `"${process.execPath.replaceAll('"', '\\"')}"`;
  return getExecOutput(executable, [join(root, "scripts", "inspection", "workspace-facts.worker.ts"), root], {
    cwd: root,
    silent: true,
    ignoreReturnCode: true,
  });
}
