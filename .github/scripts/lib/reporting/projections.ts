/**
 * @fileoverview Independent publication with explicit requiredness and faithful failures.
 * @module github/scripts/lib/reporting/projections
 */
import type {HygieneReport} from "../hygiene/contracts.ts";

/** One publisher; explicit skips are distinct from successful publication. */
export interface Projection<T> {
  readonly name: string;
  readonly required: boolean;
  /** Publishes a report or explains why no remote/local publication applies. */
  run(report: T): Promise<{status: "published"} | {status: "skipped"; reason: string}>;
}
/** Internal publication result; never blindly serialize its raw error into artifacts. */
export type PublicationResult =
  | Readonly<{name: string; required: boolean; status: "published"; url?: string}>
  | Readonly<{name: string; required: boolean; status: "skipped"; reason: string}>
  | Readonly<{name: string; required: boolean; status: "failed"; message: string; error: unknown}>;

/**
 * Starts every projection even when another throws synchronously or rejects.
 * @param report - The report shared by independent publishers.
 * @param projections - Ordered publication contracts and requiredness.
 * @returns One ordered result per publisher, retaining original error identity internally.
 */
export function publishAll<T>(report: T, projections: readonly Projection<T>[]): Promise<readonly PublicationResult[]> {
  return Promise.all(
    projections.map(async (projection): Promise<PublicationResult> => {
      const common = {name: projection.name, required: projection.required};
      try {
        const result = await projection.run(report);
        if (result.status === "published") return {...common, status: "published"};
        if (result.status === "skipped" && result.reason.trim()) return {...common, status: "skipped", reason: result.reason};
        throw new TypeError("Publisher returned an invalid result");
      } catch (error) {
        return {...common, status: "failed", message: error instanceof Error ? error.message : "Publisher failed", error};
      }
    }),
  );
}

/**
 * Preserves the primary gate and additionally requires mandatory publication.
 * @param report - Existing hygiene verdict.
 * @param results - Settled publication results.
 * @returns One for a failed/errored gate or unpublished required evidence, otherwise zero.
 */
export function publicationExitCode(report: HygieneReport, results: readonly PublicationResult[]): 0 | 1 {
  return report.overallResult === "failed"
    || report.overallResult === "errored"
    || results.some((result) => result.required && result.status !== "published")
    ? 1
    : 0;
}
