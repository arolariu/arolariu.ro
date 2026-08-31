/**
 * @fileoverview Isolated worker invoking the public Nx Devkit project graph API.
 * @module scripts/inspection/workspace.worker
 *
 * @remarks
 * Invoked as a native Node child process — never a `worker_threads` thread — so the Nx daemon,
 * dotenv loading, workspace database, and task cache directories can be redirected purely through
 * process environment variables before `@nx/devkit` is ever imported. This worker never mutates
 * its own working directory, never touches repository `.nx` state, and emits exactly one JSON
 * document on success and no other stdout output.
 */

import {resolve} from "node:path";
import {MonorepositoryConsoleLogger} from "../common/logger.ts";

/**
 * Validates the repository root argument and matching environment value, then runs the isolated
 * Nx project graph construction.
 *
 * @throws Error when the repository root argument or `NX_WORKSPACE_ROOT_PATH` is missing, empty,
 * or the two do not resolve to the same path.
 */
async function main(): Promise<void> {
  const repositoryRootArgument = process.argv[2];
  if (typeof repositoryRootArgument !== "string" || repositoryRootArgument.trim() === "") {
    throw new Error("Nx workspace worker requires exactly one repository root argument.");
  }

  const workspaceRootEnvironmentValue = process.env["NX_WORKSPACE_ROOT_PATH"];
  if (typeof workspaceRootEnvironmentValue !== "string" || workspaceRootEnvironmentValue.trim() === "") {
    throw new Error("Nx workspace worker requires a non-empty NX_WORKSPACE_ROOT_PATH environment value.");
  }

  const resolvedArgumentRoot = resolve(repositoryRootArgument);
  const resolvedEnvironmentRoot = resolve(workspaceRootEnvironmentValue);
  if (resolvedArgumentRoot !== resolvedEnvironmentRoot) {
    throw new Error("Nx workspace worker repository root argument does not match NX_WORKSPACE_ROOT_PATH.");
  }

  const {createProjectGraphAsync} = await import("@nx/devkit");
  const graph = await createProjectGraphAsync();

  new MonorepositoryConsoleLogger("inspection::workspace", {mode: "json"}).json(graph);
}

await main();
