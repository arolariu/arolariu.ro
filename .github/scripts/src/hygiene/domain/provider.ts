/**
 * @fileoverview CheckProvider contract -- the plugin interface for hygiene checks.
 * @module github/scripts/src/hygiene/domain/provider
 *
 * @remarks
 * Each hygiene check is a CheckProvider<P> object. Adding a new check means:
 *   1. Create a new file in providers/
 *   2. Add a single line to providers/registry.ts
 *
 * The provider does not write artifacts itself -- that is the runners job.
 * The provider does not log to GitHub Actions -- that is the runners job.
 * The provider is pure data + a single async run() function.
 */

import type {Finding, Gate, ProviderOutcome} from "./types.ts";

/**
 * Inputs available to every provider at run time.
 */
export interface ProviderRunInput {
  readonly workspaceRoot: string;
  readonly baseRef: string;
  readonly headRef: string;
  readonly changedFiles: readonly string[];
  readonly env: NodeJS.ProcessEnv;
}

/**
 * Output of a successful providers run() call.
 * The runner wraps this in a ProviderOutcome<P> by adding timing, gate result, error.
 */
export interface ProviderRunOutput<P> {
  readonly payload: P;
  readonly findings: readonly Finding[];
}

/**
 * Minimal schema interface -- zod-compatible but not zod-dependent.
 */
export interface Schema<P> {
  parse(data: unknown): P;
}

/**
 * The provider plugin contract.
 */
export interface CheckProvider<P> {
  /** Stable machine-readable ID (used in artifact filenames, status check names). */
  readonly id: string;
  /** Human-readable display name. */
  readonly name: string;
  /** Emoji or short string for the comment/summary header. */
  readonly icon: string;
  /** Default gate. Can be overridden by config in the future. */
  readonly defaultGate: Gate;
  /** Schema to validate the payload on read-back (for projections that load JSON). */
  readonly payloadSchema: Schema<P>;
  /** Decides whether this provider should run for the given input (e.g. skip stats on a docs-only PR). */
  applicableTo(input: ProviderRunInput): boolean;
  /** The actual work. Pure -- no @actions/core calls, no artifact writes. */
  run(input: ProviderRunInput): Promise<ProviderRunOutput<P>>;
}

/**
 * Convenience alias -- ProviderOutcome is re-exported here so providers only need to import provider.ts.
 */
export type {ProviderOutcome};
