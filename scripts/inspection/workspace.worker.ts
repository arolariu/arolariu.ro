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
 * The worker accepts only one fixed typed input (the repository root {@link decodeWorkerArgs} decodes
 * from its single positional argument) and runs through `runWorker`, which selects JSON
 * presentation unconditionally: it exposes no user-selected command, field list, or output mode. A
 * malformed argument list is a usage failure (exit `2`); a missing or mismatched
 * `NX_WORKSPACE_ROOT_PATH` or a failed graph construction exits `1` with its message on stderr.
 * Its parent (`./workspace.ts`) classifies any nonzero exit as an `unavailable` workspace outcome.
 */

import {resolve} from "node:path";

import {Effect, Schema} from "effect";

import {Environment} from "../platform/Environment.ts";
import {toJsonValue, type JsonValue} from "../platform/Output.ts";
import {runWorker, type WorkerOptions} from "../platform/worker.ts";

/** The single fixed input the Nx workspace worker accepts. */
export interface WorkspaceWorkerInput {
  /** Absolute repository root whose Nx project graph is constructed. */
  readonly repositoryRoot: string;
}

/** The single JSON document the Nx workspace worker emits on stdout. */
export type WorkspaceWorkerDocument = JsonValue;

/** The Nx workspace worker could not construct its document. */
export class WorkspaceWorkerFailure extends Schema.TaggedError<WorkspaceWorkerFailure>()("WorkspaceWorkerFailure", {
  message: Schema.String,
}) {}

/** The worker's argument vector is not exactly one non-blank repository root: a usage failure (exit `2`). */
export class WorkspaceWorkerUsageError extends Schema.TaggedError<WorkspaceWorkerUsageError>()("WorkspaceWorkerUsageError", {
  message: Schema.String,
}) {}

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
 * @param input - Decoded worker input.
 * @returns The validated single JSON document to emit; fails with {@link WorkspaceWorkerFailure}
 * when `NX_WORKSPACE_ROOT_PATH` is missing, empty, or does not resolve to the same path as the
 * supplied repository root (before `@nx/devkit` is imported), or when the graph cannot be
 * constructed or projected.
 */
export function collectWorkspaceWorkerDocument(
  input: Readonly<WorkspaceWorkerInput>,
): Effect.Effect<WorkspaceWorkerDocument, WorkspaceWorkerFailure, Environment> {
  return Effect.gen(function* () {
    const environment = yield* Environment;
    const workspaceRootEnvironmentValue = environment.variables["NX_WORKSPACE_ROOT_PATH"];
    if (typeof workspaceRootEnvironmentValue !== "string" || workspaceRootEnvironmentValue.trim() === "") {
      return yield* new WorkspaceWorkerFailure({
        message: "Nx workspace worker requires a non-empty NX_WORKSPACE_ROOT_PATH environment value.",
      });
    }

    const resolvedArgumentRoot = resolve(input.repositoryRoot);
    const resolvedEnvironmentRoot = resolve(workspaceRootEnvironmentValue);
    if (resolvedArgumentRoot !== resolvedEnvironmentRoot) {
      return yield* new WorkspaceWorkerFailure({
        message: "Nx workspace worker repository root argument does not match NX_WORKSPACE_ROOT_PATH.",
      });
    }

    return yield* Effect.tryPromise({
      try: async () => {
        const {createProjectGraphAsync} = await import("@nx/devkit");
        const graph: unknown = await createProjectGraphAsync();
        return projectWorkerDocument(graph);
      },
      catch: (error) =>
        new WorkspaceWorkerFailure({message: error instanceof Error ? error.message : "Nx workspace graph construction failed."}),
    });
  });
}

/**
 * Decodes the worker's argv into its single fixed input.
 *
 * @param argv - Worker arguments after the executable and script path.
 * @returns The decoded worker input.
 * @throws {WorkspaceWorkerUsageError} When `argv` is not exactly one non-blank repository root.
 */
export function decodeWorkerArgs(argv: readonly string[]): WorkspaceWorkerInput {
  const repositoryRoot = argv[0];
  if (argv.length !== 1 || repositoryRoot === undefined || repositoryRoot.trim() === "") {
    throw new WorkspaceWorkerUsageError({message: "Nx workspace worker requires exactly one repository root argument."});
  }
  return {repositoryRoot};
}

/** The `inspection-workspace-worker` definition its `import.meta.main` block runs with `runWorker`. */
export const workspaceWorker: WorkerOptions<WorkspaceWorkerInput, WorkspaceWorkerDocument, WorkspaceWorkerFailure> = {
  name: "inspection-workspace-worker",
  decode: decodeWorkerArgs,
  program: collectWorkspaceWorkerDocument,
  encode: (document) => document,
};

if (import.meta.main) {
  runWorker(workspaceWorker);
}
