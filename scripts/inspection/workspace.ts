/**
 * @fileoverview Isolated Nx workspace inspection provider using the public Nx Devkit project graph API.
 * @module scripts/inspection/workspace
 *
 * @remarks
 * This provider does not reimplement Nx's own project-discovery rules from repository metadata.
 * It instead invokes
 * `createProjectGraphAsync()` inside an isolated child process (see `./workspace.worker.ts`),
 * redirecting Nx's workspace database and task cache to a unique, disposable temporary directory
 * so the repository's own `.nx` state is never read from or written to. The worker's untrusted
 * JSON output is validated and projected here into a small, deterministic fact shape; it is never
 * cast to an Nx-owned type.
 */

import {isAbsolute, join, relative, resolve, sep} from "node:path";
import type {ProcessExecutionResult} from "../core/process/process-execution-result.ts";
import type {InspectionOutcome, InspectionProvider, InspectionProviderContext} from "./types.ts";

/** One repository project discovered in the Nx workspace graph. */
interface WorkspaceProjectFact {
  /** Canonical Nx project name. */
  readonly name: string;
  /** Repository-relative project root, using `/` separators. */
  readonly root: string;
  /** Sorted, de-duplicated Nx target names declared by this project. */
  readonly targets: readonly string[];
}

/** One logical repository-to-repository project dependency. */
interface WorkspaceEdgeFact {
  /** Canonical name of the depending project. */
  readonly source: string;
  /** Canonical name of the depended-upon project. */
  readonly target: string;
}

/** Deterministic, repository-scoped projection of the Nx workspace project graph. */
export interface WorkspaceFacts {
  /** Projects sorted by canonical name. */
  readonly projects: readonly WorkspaceProjectFact[];
  /** Logical dependency edges, sorted by source then target. */
  readonly dependencies: readonly WorkspaceEdgeFact[];
  /** Deterministic directed-cycle evidence; each cycle repeats its starting project at the end. */
  readonly cycles: readonly (readonly string[])[];
}

/** Reports a malformed, inconsistent, or repository-escaping Nx workspace graph document. */
class WorkspaceGraphProjectionError extends Error {}

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Resolves one Nx project root to a repository-relative, `/`-separated path.
 *
 * @param repositoryRoot - Resolved absolute repository root.
 * @param projectName - Canonical project name, used only for error messages.
 * @param rawRoot - Raw `data.root` value reported by the worker.
 * @returns The repository-relative root, using `/` separators.
 * @throws {@link WorkspaceGraphProjectionError} when the root escapes the repository root.
 */
function resolveProjectRoot(repositoryRoot: string, projectName: string, rawRoot: string): string {
  const resolvedProjectRoot = resolve(repositoryRoot, rawRoot);
  const relativeRoot = relative(repositoryRoot, resolvedProjectRoot);
  if (relativeRoot === ".." || relativeRoot.startsWith(`..${sep}`) || isAbsolute(relativeRoot)) {
    throw new WorkspaceGraphProjectionError(`Nx workspace project '${projectName}' root '${rawRoot}' escapes the repository root.`);
  }
  return relativeRoot.split(sep).join("/");
}

/**
 * Rotates a directed-cycle path so it starts at its lexicographically smallest project, without
 * reversing edge direction, so structurally identical cycles compare equal regardless of which
 * project a traversal happened to discover them from.
 *
 * @param cycle - A cycle path ending with its starting project repeated (for example `["a","b","a"]`).
 * @returns The canonical rotation of the same cycle.
 */
function canonicalizeCycle(cycle: readonly string[]): readonly string[] {
  const body = cycle.slice(0, -1);
  let minIndex = 0;
  for (let index = 1; index < body.length; index += 1) {
    if (body[index]! < body[minIndex]!) {
      minIndex = index;
    }
  }
  const rotated = [...body.slice(minIndex), ...body.slice(0, minIndex)];
  return [...rotated, rotated[0]!];
}

/**
 * Detects directed cycles over a deterministic, pre-sorted adjacency list.
 *
 * @param sortedProjectNames - Project names, already sorted, used as the fixed traversal order.
 * @param sortedAdjacency - Each project's sorted, de-duplicated dependency targets.
 * @returns Deterministic, rotation-de-duplicated directed cycles, sorted for stable output.
 */
function findCycles(sortedProjectNames: readonly string[], sortedAdjacency: ReadonlyMap<string, readonly string[]>): readonly (readonly string[])[] {
  const state = new Map<string, "visiting" | "visited">();
  const stack: string[] = [];
  const seenCanonicalCycles = new Set<string>();
  const cycles: (readonly string[])[] = [];

  const visit = (project: string): void => {
    const currentState = state.get(project);
    if (currentState === "visited") {
      return;
    }
    if (currentState === "visiting") {
      const start = stack.indexOf(project);
      if (start >= 0) {
        const canonical = canonicalizeCycle([...stack.slice(start), project]);
        const key = canonical.join("\u0000");
        if (!seenCanonicalCycles.has(key)) {
          seenCanonicalCycles.add(key);
          cycles.push(canonical);
        }
      }
      return;
    }

    state.set(project, "visiting");
    stack.push(project);
    for (const dependency of sortedAdjacency.get(project) ?? []) {
      visit(dependency);
    }
    stack.pop();
    state.set(project, "visited");
  };

  for (const project of sortedProjectNames) {
    visit(project);
  }

  return cycles.toSorted((left, right) => {
    const length = Math.min(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      const comparison = compareText(left[index]!, right[index]!);
      if (comparison !== 0) {
        return comparison;
      }
    }
    return left.length - right.length;
  });
}

/**
 * Validates and projects an untrusted worker JSON document into deterministic workspace facts.
 *
 * @remarks
 * Only the minimum public Nx project-graph shape needed from `nodes` and `dependencies` is
 * validated; the document is never cast to an Nx-owned type. Every entry in `nodes` is treated as
 * a repository project; `externalNodes` is never read. Edges whose source or target is not a
 * projected repository project are filtered as external dependencies, not treated as malformed.
 *
 * @param value - Untrusted, already-parsed JSON document emitted by `workspace.worker.ts`.
 * @param repositoryRoot - Repository root every project root must resolve within.
 * @returns Deterministic, sorted workspace facts.
 * @throws {@link WorkspaceGraphProjectionError} when a required field is malformed, a project
 * identity or root is duplicated/inconsistent, a root escapes `repositoryRoot`, or a dependency
 * record owned by a repository project is malformed.
 */
export function projectNxGraph(value: unknown, repositoryRoot: string): WorkspaceFacts {
  if (!isRecord(value)) {
    throw new WorkspaceGraphProjectionError("Nx workspace graph document must be a JSON object.");
  }
  const {nodes, dependencies} = value;
  if (!isRecord(nodes)) {
    throw new WorkspaceGraphProjectionError("Nx workspace graph document is missing a 'nodes' object.");
  }
  if (!isRecord(dependencies)) {
    throw new WorkspaceGraphProjectionError("Nx workspace graph document is missing a 'dependencies' object.");
  }

  const resolvedRepositoryRoot = resolve(repositoryRoot);
  const projectsByName = new Map<string, WorkspaceProjectFact>();
  const usedRoots = new Set<string>();

  for (const [key, rawNode] of Object.entries(nodes)) {
    if (!isRecord(rawNode)) {
      throw new WorkspaceGraphProjectionError(`Nx workspace project '${key}' is not an object.`);
    }
    const {name, data} = rawNode;
    if (typeof name !== "string" || name.trim() === "") {
      throw new WorkspaceGraphProjectionError(`Nx workspace project '${key}' has a missing or empty 'name'.`);
    }
    if (name !== key) {
      throw new WorkspaceGraphProjectionError(`Nx workspace project '${key}' declares an inconsistent identity ('${name}').`);
    }
    if (projectsByName.has(name)) {
      throw new WorkspaceGraphProjectionError(`Duplicate Nx workspace project name '${name}'.`);
    }
    if (!isRecord(data)) {
      throw new WorkspaceGraphProjectionError(`Nx workspace project '${name}' is missing 'data'.`);
    }

    const rawRoot = data["root"];
    if (typeof rawRoot !== "string" || rawRoot.trim() === "") {
      throw new WorkspaceGraphProjectionError(`Nx workspace project '${name}' has a missing or empty 'data.root'.`);
    }
    const projectRoot = resolveProjectRoot(resolvedRepositoryRoot, name, rawRoot);
    if (usedRoots.has(projectRoot)) {
      throw new WorkspaceGraphProjectionError(`Duplicate Nx workspace project root '${projectRoot}'.`);
    }
    usedRoots.add(projectRoot);

    const rawTargets = data["targets"];
    let targetNames: readonly string[];
    if (rawTargets === undefined) {
      targetNames = [];
    } else if (isRecord(rawTargets)) {
      targetNames = Object.keys(rawTargets);
    } else {
      throw new WorkspaceGraphProjectionError(`Nx workspace project '${name}' has malformed 'data.targets'.`);
    }

    projectsByName.set(name, {name, root: projectRoot, targets: [...new Set(targetNames)].toSorted(compareText)});
  }

  const projectNames = new Set(projectsByName.keys());
  const edgeKeys = new Set<string>();
  const edges: WorkspaceEdgeFact[] = [];

  for (const [source, rawEdgeList] of Object.entries(dependencies)) {
    if (!projectNames.has(source)) {
      continue;
    }
    if (!Array.isArray(rawEdgeList)) {
      throw new WorkspaceGraphProjectionError(`Nx workspace dependency list for '${source}' is malformed.`);
    }
    for (const rawEdge of rawEdgeList) {
      if (!isRecord(rawEdge)) {
        throw new WorkspaceGraphProjectionError(`Nx workspace dependency record for '${source}' is malformed.`);
      }
      const {source: edgeSource, target: edgeTarget} = rawEdge;
      if (typeof edgeSource !== "string" || typeof edgeTarget !== "string") {
        throw new WorkspaceGraphProjectionError(`Nx workspace dependency record for '${source}' has a missing 'source' or 'target'.`);
      }
      if (edgeSource !== source) {
        throw new WorkspaceGraphProjectionError(`Nx workspace dependency record for '${source}' declares an inconsistent source ('${edgeSource}').`);
      }
      if (!projectNames.has(edgeTarget)) {
        continue;
      }
      const key = `${edgeSource}\u0000${edgeTarget}`;
      if (!edgeKeys.has(key)) {
        edgeKeys.add(key);
        edges.push({source: edgeSource, target: edgeTarget});
      }
    }
  }

  const sortedProjects = [...projectsByName.values()].toSorted((left, right) => compareText(left.name, right.name));
  const sortedEdges = edges.toSorted((left, right) => compareText(left.source, right.source) || compareText(left.target, right.target));

  const adjacency = new Map<string, string[]>();
  for (const edge of sortedEdges) {
    const targets = adjacency.get(edge.source);
    if (targets === undefined) {
      adjacency.set(edge.source, [edge.target]);
    } else {
      targets.push(edge.target);
    }
  }

  return {
    projects: sortedProjects,
    dependencies: sortedEdges,
    cycles: findCycles(sortedProjects.map(({name}) => name), adjacency),
  };
}

/** Dependencies required to create the isolated Nx workspace provider. */
interface WorkspaceProviderInput
  extends Pick<InspectionProviderContext, "runner" | "clock" | "environment" | "temporaryDirectories"> {
  /** Repository root to inspect. */
  readonly root: string;
}

/** Bounded timeout applied to the isolated worker invocation. */
const WORKER_TIMEOUT_MS = 120_000;

/**
 * Maps one worker {@link ProcessExecutionResult} exhaustively onto its bounded unavailable reason.
 *
 * @remarks
 * A signalled or cancelled child reports the same "exited with code 1" evidence the legacy
 * `CommandResult` mapping produced, so no caller observes a new reason string.
 *
 * @param outcome - Typed outcome of the isolated worker invocation.
 * @returns The bounded reason, or `undefined` when the worker completed successfully.
 */
function workerFailureReason(outcome: Readonly<ProcessExecutionResult>): string | undefined {
  switch (outcome.kind) {
    case "succeeded":
      return undefined;
    case "spawn-failed":
      return `Nx workspace worker failed to start: ${outcome.message}`;
    case "timed-out":
      return "Nx workspace worker timed out.";
    case "exited":
      return `Nx workspace worker exited with code ${String(outcome.exitCode)}.`;
    case "signalled":
    case "cancelled":
      return "Nx workspace worker exited with code 1.";
  }
}

/**
 * Creates the isolated Nx workspace inspection provider.
 *
 * @remarks
 * Each invocation creates a unique temporary root outside the repository through the narrow
 * temporary-directory capability (the provider's ordinary filesystem stays read-only), spawns
 * `workspace.worker.ts` as a native Node child process with Nx's daemon, dotenv loading, workspace
 * database, and task cache all redirected away from repository state, projects its single JSON
 * document through {@link projectNxGraph}, and removes exactly that temporary root in every case —
 * a successful projection, a command failure, or a malformed/invalid document. Only worker
 * spawn/nonzero/timeout failures and malformed/invalid worker output are represented as
 * `"unavailable"`/`"invalid"` outcomes; an unexpected filesystem failure (for example a temporary
 * directory creation/removal failure) rejects the returned promise instead of being hidden in a
 * success-shaped result.
 *
 * @param input - Repository root plus the runner, clock, environment, and temporary-directory
 * capabilities.
 * @returns An {@link InspectionProvider} for {@link WorkspaceFacts}.
 */
export function createWorkspaceProvider(input: Readonly<WorkspaceProviderInput>): InspectionProvider<WorkspaceFacts> {
  return async (): Promise<InspectionOutcome<WorkspaceFacts>> => {
    const startedAt = input.clock.monotonicNow();
    const resolvedRoot = resolve(input.root);
    const temporaryDirectory = await input.temporaryDirectories.createTemporaryDirectory("arolariu-nx-");
    const tempRoot = temporaryDirectory.path;

    try {
      const workerPath = resolve(resolvedRoot, "scripts", "inspection", "workspace.worker.ts");
      const outcome = await input.runner.run(
        {command: input.environment.executablePath, args: [workerPath, resolvedRoot]},
        {
          cwd: resolvedRoot,
          output: "capture",
          timeoutMs: WORKER_TIMEOUT_MS,
          env: {
            NX_DAEMON: "false",
            NX_LOAD_DOT_ENV_FILES: "false",
            NX_WORKSPACE_ROOT_PATH: resolvedRoot,
            NX_WORKSPACE_DATA_DIRECTORY: join(tempRoot, "workspace-data"),
            NX_CACHE_DIRECTORY: join(tempRoot, "cache"),
          },
        },
      );

      const durationMs = Math.max(0, input.clock.monotonicNow() - startedAt);

      const failureReason = workerFailureReason(outcome);
      if (failureReason !== undefined) {
        return {kind: "unavailable", reason: failureReason, durationMs};
      }

      let parsedDocument: unknown;
      try {
        parsedDocument = JSON.parse(outcome.stdout.trim());
      } catch {
        return {kind: "invalid", issues: ["Nx workspace worker did not emit a single valid JSON document."], durationMs};
      }

      try {
        const facts = projectNxGraph(parsedDocument, resolvedRoot);
        return {kind: "available", value: facts, durationMs};
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Nx workspace graph projection failed.";
        return {kind: "invalid", issues: [message], durationMs};
      }
    } finally {
      await temporaryDirectory.remove();
    }
  };
}
