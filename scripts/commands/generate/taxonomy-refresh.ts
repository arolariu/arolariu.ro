import {basename, dirname, isAbsolute, join, relative, resolve, sep} from "node:path";
import {Clock, Effect, FileSystem} from "effect";

import {taxonomyArtifactOutputRoots} from "../../common/taxonomy-artifacts.ts";
import {readTaxonomySnapshots, type TaxonomySnapshot} from "../../common/taxonomy-snapshots.ts";
import {ReadOnlyFilesLive, writeTextAtomic} from "../../platform/Files.ts";
import type {TaxonomyArtifactNode} from "../../types/generators.ts";
import {
  EcoicopTaxonomyClassificationGenerator,
  Gs1GpcTaxonomyClassificationGenerator,
  NaceTaxonomyClassificationGenerator,
  type ArtifactGenerationError,
} from "./artifacts.ts";
import type {GenerateRequirements} from "./env.ts";
import {ArtifactGenerationFailed} from "./errors.ts";
import {silently} from "./index.ts";

const reviewFields = ["officialLabel", "level", "parentCode", "hierarchyCodes", "hierarchyLabels", "definition", "searchText"] as const;
type ReviewField = (typeof reviewFields)[number];

interface TaxonomyNodeDiff {
  readonly added: readonly TaxonomyArtifactNode[];
  readonly removed: readonly TaxonomyArtifactNode[];
  readonly changed: readonly {
    readonly code: string;
    readonly fields: readonly ReviewField[];
    readonly before: TaxonomyArtifactNode;
    readonly after: TaxonomyArtifactNode;
  }[];
}

interface TaxonomyReview extends TaxonomyNodeDiff {
  readonly pinned: TaxonomySnapshot;
  readonly candidate: TaxonomySnapshot;
}

/** Complete candidate set ready for human review, never automatic promotion. */
export interface TaxonomyRefreshResult {
  readonly outputDirectory: string;
  readonly reportPath: string;
  readonly taxonomies: readonly TaxonomyReview[];
}

/** Compares canonical node data by code, including ancestor changes carried by descendants. */
export function diffTaxonomyNodes(before: readonly TaxonomyArtifactNode[], after: readonly TaxonomyArtifactNode[]): TaxonomyNodeDiff {
  const pinned = new Map(before.map((node) => [node.code, node]));
  const candidate = new Map(after.map((node) => [node.code, node]));
  const changed: TaxonomyNodeDiff["changed"][number][] = [];
  for (const [code, previous] of pinned) {
    const next = candidate.get(code);
    if (next === undefined) continue;
    const fields = reviewFields.filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(next[field]));
    if (fields.length !== 0) changed.push({code, fields, before: previous, after: next});
  }
  return {
    added: after.filter(({code}) => !pinned.has(code)),
    removed: before.filter(({code}) => !candidate.has(code)),
    changed,
  };
}

function refreshFailure(message: string): ArtifactGenerationFailed {
  return new ArtifactGenerationFailed({artifact: "Taxonomy refresh", message});
}

function isWithin(root: string, candidate: string): boolean {
  const suffix = relative(root, candidate);
  return !isAbsolute(suffix) && suffix !== ".." && !suffix.startsWith(`..${sep}`);
}

/** Fetches all three fresh candidates before publishing any to a new review directory. */
export const refreshTaxonomies: (
  root: string,
  output: string,
) => Effect.Effect<TaxonomyRefreshResult, ArtifactGenerationError, GenerateRequirements> = Effect.fn("generate.refreshTaxonomies")(
  function* (root: string, output: string) {
    const fs = yield* FileSystem.FileSystem;
    const requested = resolve(root, output);
    const leaf = basename(requested);
    if (!/^[\w-](?:[\w.-]*[\w-])?$/u.test(leaf)) {
      return yield* refreshFailure("Choose a new candidate directory with a plain name (letters, digits, dots, underscores or hyphens).");
    }

    const roots = taxonomyArtifactOutputRoots.map((path) => resolve(root, path));
    const now = new Date(yield* Clock.currentTimeMillis);
    const pinned = yield* readTaxonomySnapshots(roots, now).pipe(Effect.provide(ReadOnlyFilesLive));
    if (pinned.issues.length > 0) {
      return yield* refreshFailure(
        `Recover the approved snapshots before refreshing:\n${pinned.issues.map(({message}) => message).join("\n")}`,
      );
    }
    const canonicalRoots = yield* Effect.forEach(roots, (path) => fs.realPath(path));
    const parent = yield* fs.realPath(dirname(requested));
    const outputDirectory = join(parent, leaf);
    if (
      roots.some((path) => isWithin(path, requested))
      || canonicalRoots.some((path) => isWithin(path, outputDirectory))
      || (yield* fs.exists(outputDirectory))
    ) {
      return yield* refreshFailure("Output must be a new directory outside the canonical API and Website taxonomy directories.");
    }

    const scratch = yield* fs.makeTempDirectoryScoped({directory: parent, prefix: ".taxonomy-refresh-"});
    const generators = [
      new Gs1GpcTaxonomyClassificationGenerator([scratch]),
      new EcoicopTaxonomyClassificationGenerator([scratch]),
      new NaceTaxonomyClassificationGenerator([scratch]),
    ] as const;
    yield* silently(Effect.forEach(generators, (generator) => generator.generate(false), {concurrency: "unbounded", discard: true}));
    const candidates = yield* readTaxonomySnapshots([scratch], new Date(yield* Clock.currentTimeMillis)).pipe(
      Effect.provide(ReadOnlyFilesLive),
    );
    if (candidates.issues.length > 0) {
      return yield* refreshFailure(candidates.issues.map(({message}) => message).join("\n"));
    }

    const taxonomies: TaxonomyReview[] = [];
    for (const candidate of candidates.snapshots) {
      const previous = pinned.snapshots.find(({system}) => system === candidate.system);
      const before = pinned.artifacts.find(({system}) => system === candidate.system);
      const after = candidates.artifacts.find(({system}) => system === candidate.system);
      if (previous === undefined || before === undefined || after === undefined) {
        return yield* refreshFailure(`A complete comparison is unavailable for ${candidate.system}.`);
      }
      taxonomies.push({pinned: previous, candidate, ...diffTaxonomyNodes(before.nodes, after.nodes)});
    }

    // Reserve the destination exclusively. The report is written last and marks a complete set.
    yield* fs.makeDirectory(outputDirectory);
    yield* Effect.forEach(candidates.snapshots, ({fileName}) => fs.copyFile(join(scratch, fileName), join(outputDirectory, fileName)), {
      discard: true,
    });
    const reportPath = join(outputDirectory, "taxonomy-review.json");
    yield* writeTextAtomic(reportPath, `${JSON.stringify({taxonomies}, null, 2)}\n`);
    return {outputDirectory, reportPath, taxonomies};
  },
  Effect.scoped,
  Effect.mapError((error) =>
    error._tag === "ArtifactGenerationFailed" || error._tag === "TaxonomySourceUnavailable" ? error : refreshFailure(error.message),
  ),
);
