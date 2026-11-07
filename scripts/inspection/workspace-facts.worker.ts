/**
 * @fileoverview Fixed JSON adapter exposing existing validated Nx facts to CI planning.
 * @module scripts/inspection/workspace-facts.worker
 * @remarks The existing provider owns the isolated child, timeout, and temporary
 * state. Reporting/gate consumers import only the serializable CI-side contract.
 */
import {toJsonValue} from "../platform/Output.ts";
import {runWorker, type WorkerOptions} from "../platform/worker.ts";
import type {InspectionOutcome} from "./types.ts";
import {createWorkspaceProvider, type WorkspaceFacts} from "./workspace.ts";
import {decodeWorkerArgs, type WorkspaceWorkerInput} from "./workspace.worker.ts";

/** The fixed root-input/facts-output adapter; defects remain exceptional. */
export const workspaceFactsWorker: WorkerOptions<WorkspaceWorkerInput, InspectionOutcome<WorkspaceFacts>, never> = {
  name: "inspection-workspace-facts-worker",
  decode: decodeWorkerArgs,
  program: (input) => createWorkspaceProvider({root: input.repositoryRoot}),
  encode: toJsonValue,
};

if (import.meta.main) {
  runWorker(workspaceFactsWorker);
}
