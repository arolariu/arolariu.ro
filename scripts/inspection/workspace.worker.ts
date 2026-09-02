/**
 * @fileoverview Isolated worker command invoking the public Nx Devkit project graph API.
 * @module scripts/inspection/workspace.worker
 *
 * @remarks
 * Invoked as a native Node child process — never a `worker_threads` thread — so the Nx daemon,
 * dotenv loading, workspace database, and task cache directories can be redirected purely through
 * process environment variables before `@nx/devkit` is ever imported. This worker never mutates
 * its own working directory, never touches repository `.nx` state, and emits exactly one JSON
 * document on stdout and no other stdout output.
 *
 * The worker accepts only one fixed typed input (the repository root Commander decodes from its
 * single positional argument) and selects JSON presentation unconditionally: it exposes no
 * user-selected command, field list, or output mode. Its parent (`./workspace.ts`) classifies any
 * nonzero exit as an `unavailable` workspace outcome.
 */

import {resolve} from "node:path";

import {
  CommandInputError,
  MonorepoCommand,
  toJsonValue,
  type CommandContext,
  type CommandRuntimeFactory,
  type JsonValue,
} from "../common/commander.ts";

/** The single fixed input the Nx workspace worker accepts. */
export interface WorkspaceWorkerInput {
  /** Absolute repository root whose Nx project graph is constructed. */
  readonly repositoryRoot: string;
}

/** The single JSON document the Nx workspace worker emits on stdout. */
export type WorkspaceWorkerDocument = JsonValue;

/**
 * Serializes the untrusted third-party Nx project graph exactly the way the previous
 * `logger.json(graph)` boundary did, then re-validates the plain parsed result.
 *
 * @remarks
 * Exported only so the projection contract can be exercised in-process without spawning Nx: it is
 * never called by another production module. `JSON.stringify` is invoked exactly once so a
 * third-party `toJSON()` hook runs once, `undefined` object properties are dropped, and a
 * serialization failure (a cycle, a `bigint`) still surfaces as a thrown error rather than a
 * silently truncated document. A top-level serialization of `undefined` — what `JSON.stringify`
 * returns for a function, a symbol, or `undefined` itself — is rejected instead of being emitted as
 * the string `"undefined"` or coerced to `null`. The parsed value is then passed through strict
 * {@link toJsonValue} so the emitted document is a checked {@link JsonValue} rather than an
 * assertion.
 *
 * @param graph - Untrusted project graph value returned by `@nx/devkit`.
 * @returns The validated JSON document.
 * @throws {Error} When the graph cannot be serialized, or serializes to `undefined`.
 */
export function projectWorkerDocument(graph: unknown): WorkspaceWorkerDocument {
  const serialized = JSON.stringify(graph);
  if (serialized === undefined) {
    throw new Error("Nx workspace worker produced a project graph that is not JSON-serializable.");
  }

  const parsed: unknown = JSON.parse(serialized);
  return toJsonValue(parsed);
}

/**
 * Validates the decoded repository root against `NX_WORKSPACE_ROOT_PATH` and constructs the
 * isolated Nx project graph.
 *
 * @param context - Owning command context supplying the immutable environment snapshot.
 * @param input - Decoded worker input.
 * @returns The validated single JSON document to emit.
 * @throws {Error} When `NX_WORKSPACE_ROOT_PATH` is missing, empty, or does not resolve to the same
 * path as the supplied repository root.
 */
async function collectWorkspaceWorkerDocument(
  context: Readonly<CommandContext>,
  input: Readonly<WorkspaceWorkerInput>,
): Promise<WorkspaceWorkerDocument> {
  const workspaceRootEnvironmentValue = context.runtime.environment.variables["NX_WORKSPACE_ROOT_PATH"];
  if (typeof workspaceRootEnvironmentValue !== "string" || workspaceRootEnvironmentValue.trim() === "") {
    throw new Error("Nx workspace worker requires a non-empty NX_WORKSPACE_ROOT_PATH environment value.");
  }

  const resolvedArgumentRoot = resolve(input.repositoryRoot);
  const resolvedEnvironmentRoot = resolve(workspaceRootEnvironmentValue);
  if (resolvedArgumentRoot !== resolvedEnvironmentRoot) {
    throw new Error("Nx workspace worker repository root argument does not match NX_WORKSPACE_ROOT_PATH.");
  }

  const {createProjectGraphAsync} = await import("@nx/devkit");
  const graph: unknown = await createProjectGraphAsync();
  return projectWorkerDocument(graph);
}

/**
 * Creates the isolated Nx workspace worker command.
 *
 * @param runtimeFactory - Optional runtime factory; tests inject a fake instead of the Node adapter.
 * @returns The typed `inspection-workspace-worker` command object.
 */
export function createWorkspaceWorkerCommand(
  runtimeFactory?: CommandRuntimeFactory,
): MonorepoCommand<WorkspaceWorkerInput, WorkspaceWorkerDocument> {
  return new MonorepoCommand<WorkspaceWorkerInput, WorkspaceWorkerDocument>(
    {
      metadata: {
        name: "inspection-workspace-worker",
        description: "Emits the isolated Nx project graph for one repository root as a single JSON document.",
        usage: "<repositoryRoot>",
      },
      configure: (program) => {
        program.argument("[repositoryRoot]", "Absolute repository root whose Nx project graph is constructed.");
      },
      decode: (program) => {
        const repositoryRoot = program.args[0];
        if (program.args.length !== 1 || repositoryRoot === undefined || repositoryRoot.trim() === "") {
          throw new CommandInputError("Nx workspace worker requires exactly one repository root argument.");
        }
        return {repositoryRoot};
      },
      presentation: () => "json",
      execute: collectWorkspaceWorkerDocument,
      completion: (document) => ({exitCode: 0, json: document}),
    },
    runtimeFactory,
  );
}

/** Production singleton used by this module's direct entrypoint. */
export const workspaceWorkerCommand: MonorepoCommand<WorkspaceWorkerInput, WorkspaceWorkerDocument> =
  createWorkspaceWorkerCommand();

await workspaceWorkerCommand.runIfMain(import.meta.url);
