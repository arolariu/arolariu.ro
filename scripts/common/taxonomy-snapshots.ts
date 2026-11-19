import {createHash} from "node:crypto";
import {join, resolve} from "node:path";
import {Effect, Result} from "effect";

import {ReadOnlyFiles} from "../platform/Files.ts";
import type {TaxonomyArtifact} from "../types/generators.ts";
import {matchesTaxonomyIdentity, parseTaxonomyArtifact} from "./taxonomy-artifact-validation.ts";
import {taxonomyArtifactFileNames, taxonomyArtifactIdentities, taxonomyArtifactOutputRoots} from "./taxonomy-artifacts.ts";

/** Advisory age classification, independent of artifact integrity. */
export type TaxonomyFreshness = "fresh" | "review-due" | "overdue" | "unknown-age";

/** Identity and age of one verified mirror pair or review candidate. */
export interface TaxonomySnapshot {
  readonly fileName: string;
  readonly system: TaxonomyArtifact["system"];
  readonly version: string;
  readonly sourceUrl: string;
  readonly attribution: string;
  readonly generatedAt: string;
  readonly sha256: string;
  readonly freshness: TaxonomyFreshness;
}

/** Invalid local inputs must not be repaired by an implicit publisher request. */
export interface TaxonomyIntegrityIssue {
  readonly fileName: string;
  readonly kind: "unreadable" | "mismatched" | "invalid";
  readonly message: string;
}

/** Every verified catalog plus any integrity errors encountered. */
export interface TaxonomySnapshotInspection {
  readonly snapshots: readonly TaxonomySnapshot[];
  readonly issues: readonly TaxonomyIntegrityIssue[];
}

const artifactKeys = ["gpc", "ecoicop", "nace"] as const;
const maximumSnapshotBytes = 64 * 1024 * 1024;
const decoder = new TextDecoder("utf-8", {fatal: true});

function monthAnniversary(start: Date, months: number): number {
  const anniversary = new Date(start.getTime());
  const day = anniversary.getUTCDate();
  anniversary.setUTCDate(1);
  anniversary.setUTCMonth(anniversary.getUTCMonth() + months + 1, 0);
  anniversary.setUTCDate(Math.min(day, anniversary.getUTCDate()));
  return anniversary.getTime();
}

/** Uses UTC calendar anniversaries, including month-end clamping. */
export function taxonomyFreshness(generatedAt: string, now: Date): TaxonomyFreshness {
  const start = new Date(generatedAt);
  const current = now.getTime();
  if (!Number.isFinite(current) || !Number.isFinite(start.getTime()) || current < start.getTime()) return "unknown-age";
  if (current >= monthAnniversary(start, 12)) return "overdue";
  if (current >= monthAnniversary(start, 6)) return "review-due";
  return "fresh";
}

/** Reads and validates the three pairs without writing or calling upstream. */
export function inspectTaxonomySnapshots(root: string, now: Date): Effect.Effect<TaxonomySnapshotInspection, never, ReadOnlyFiles> {
  return readTaxonomySnapshots(
    taxonomyArtifactOutputRoots.map((path) => resolve(root, path)),
    now,
  );
}

/** Reads verified catalogs from their known mirrors or a single isolated candidate directory. */
export function readTaxonomySnapshots(
  roots: readonly string[],
  now: Date,
): Effect.Effect<TaxonomySnapshotInspection & {readonly artifacts: readonly TaxonomyArtifact[]}, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const fs = yield* ReadOnlyFiles;
    const snapshots: TaxonomySnapshot[] = [];
    const artifacts: TaxonomyArtifact[] = [];
    const issues: TaxonomyIntegrityIssue[] = [];
    for (const key of artifactKeys) {
      const fileName = taxonomyArtifactFileNames[key];
      const identity = taxonomyArtifactIdentities[key];
      const files = yield* Effect.result(
        Effect.forEach(roots, (root) => {
          const path = join(root, fileName);
          return Effect.gen(function* () {
            const info = yield* fs.stat(path);
            const size = Number(info.size);
            if (info.type !== "File" || size > maximumSnapshotBytes)
              return yield* Effect.fail(`Not a regular taxonomy file within size limit: ${path}`);
            return yield* fs.readBytesBounded(path, size);
          });
        }),
      );
      const first = Result.isSuccess(files) ? files.success[0] : undefined;
      if (first === undefined || Result.isFailure(files)) {
        issues.push({fileName, kind: "unreadable", message: `Missing or unreadable taxonomy snapshot: ${fileName}`});
        continue;
      }
      if (files.success.slice(1).some((bytes) => Buffer.compare(first, bytes) !== 0)) {
        issues.push({fileName, kind: "mismatched", message: `Mirrored taxonomy bytes differ: ${fileName}`});
        continue;
      }
      try {
        const artifact = parseTaxonomyArtifact(decoder.decode(first));
        if (!matchesTaxonomyIdentity(artifact, identity))
          throw new Error(`Expected pinned provenance for ${identity.system} ${identity.version}.`);
        artifacts.push(artifact);
        snapshots.push({
          fileName,
          system: artifact.system,
          version: artifact.version,
          sourceUrl: artifact.sourceUrl,
          attribution: artifact.attribution,
          generatedAt: artifact.generatedAt,
          sha256: createHash("sha256").update(first).digest("hex"),
          freshness: taxonomyFreshness(artifact.generatedAt, now),
        });
      } catch (error: unknown) {
        issues.push({
          fileName,
          kind: "invalid",
          message: `Invalid taxonomy snapshot '${fileName}': ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
    return {snapshots, artifacts, issues};
  });
}
