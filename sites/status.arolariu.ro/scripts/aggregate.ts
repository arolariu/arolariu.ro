/**
 * Aggregation pipeline. Rolls the append-only `raw/*.jsonl` probe stream
 * into three retention-sized JSON files consumed by the frontend:
 *   - `fine.json`    — 30-minute buckets, rebuilt from scratch every run (14 days).
 *   - `hourly.json`  — 1-hour buckets, merge-updated (90 days).
 *   - `daily.json`   — 1-day buckets,  merge-updated (365 days).
 *
 * Merge semantics: only "today" and "yesterday" are recomputed from raw
 * probes; older buckets in the previous file are preserved untouched, so
 * long-retention tiers don't get truncated when the raw window slides.
 */
import {mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync} from "node:fs";
import {join} from "node:path";
import {SERVICE_IDS, type AggregateFile, type Bucket,
  type ProbeResult, type ServiceId, type ServiceSeries} from "../src/lib/types/status";
import {isAggregateFile} from "../src/lib/types/guards";
import {readRawProbes} from "./rawProbes";
import {bucketStart, makeBucket, type BucketAccumulator} from "./aggregateCommon";
import {groupProbes} from "./aggregateServices";
import {groupSubChecks} from "./aggregateSubChecks";

// Re-export so existing test imports (`from "./aggregate"`) keep working.
export {bucketStart};

const MS_PER_DAY = 86_400_000;

/**
 * Fold the per-bucket accumulators for a single service into a sorted
 * `ServiceSeries`. If the service has sub-check data, each sub-check gets
 * its own time-sorted bucket array under `subSeries[name]`.
 */
function toSeries(
  service: ServiceId,
  mainBuckets: Map<string, BucketAccumulator>,
  subs: Map<string, Map<string, BucketAccumulator>> | undefined,
): ServiceSeries {
  const buckets: Bucket[] = [...mainBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t, acc]) => makeBucket(t, acc));
  if (subs && subs.size > 0) {
    const subSeries: Record<string, readonly Bucket[]> = {};
    for (const [name, accMap] of subs) {
      subSeries[name] = [...accMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([t, acc]) => makeBucket(t, acc));
    }
    return {service, buckets, subSeries};
  }
  return {service, buckets};
}

/**
 * Build the 14-day, 30-minute-bucket aggregate from scratch. Safe to
 * regenerate on every run because the raw JSONL window is also 14 days —
 * the two retentions are intentionally matched.
 *
 * @param probes - All raw probes currently on disk.
 * @param now    - Wall clock used to compute the 14-day cutoff.
 */
export function rebuildFine(probes: readonly ProbeResult[], now: Date): AggregateFile {
  const cutoff = now.getTime() - 14 * MS_PER_DAY;
  const recent = probes.filter(p => Date.parse(p.timestamp) >= cutoff);
  const mainGroups = groupProbes(recent, "30m");
  const subGroups = groupSubChecks(recent, "30m");
  const services: ServiceSeries[] = SERVICE_IDS
    .filter(s => mainGroups.has(s))
    .map(s => toSeries(s, mainGroups.get(s)!, subGroups.get(s)));
  return {
    generatedAt: now.toISOString(),
    bucketSize: "30m",
    windowDays: 14,
    services,
  };
}

/**
 * Delete raw JSONL files older than the 14-day fine-tier window. Called at
 * the end of every aggregate run so the working set stays bounded.
 */
function pruneRawFiles(dataDir: string, now: Date): void {
  const rawDir = join(dataDir, "raw");
  if (!existsSync(rawDir)) return;
  const cutoffMs = now.getTime() - 14 * MS_PER_DAY;
  for (const f of readdirSync(rawDir)) {
    if (!f.endsWith(".jsonl")) continue;
    const day = f.slice(0, 10);
    const dayMs = Date.parse(`${day}T00:00:00Z`);
    if (Number.isFinite(dayMs) && dayMs < cutoffMs) {
      unlinkSync(join(rawDir, f));
    }
  }
}

/** Bucket granularities supported by the merge path (fine uses a separate rebuild path). */
type MergeBucketSize = "1h" | "1d";
/** Retention window tied to bucket size: 90d for hourly, 365d for daily. */
type MergeWindowDays<S extends MergeBucketSize> = S extends "1h" ? 90 : 365;

/**
 * Merge freshly computed today+yesterday buckets into the previous aggregate
 * file while preserving older buckets verbatim. This is what lets hourly
 * (90d) and daily (365d) retention exceed the 14-day raw-probe window.
 *
 * @param probes     - All available raw probes (will be filtered to today/yesterday internally).
 * @param previous   - The prior `AggregateFile` to inherit old buckets from; `undefined` on first run.
 * @param now        - Wall clock for bucket alignment and windowing.
 * @param size       - `"1h"` for hourly, `"1d"` for daily.
 * @param windowDays - Retention in days; must be paired with `size` per {@link MergeWindowDays}.
 */
function mergeAggregate<S extends MergeBucketSize>(
  probes: readonly ProbeResult[],
  previous: AggregateFile | undefined,
  now: Date,
  size: S,
  windowDays: MergeWindowDays<S>,
): AggregateFile {
  const cutoffMs = now.getTime() - windowDays * MS_PER_DAY;
  const today = bucketStart(now, "1d");
  const yesterday = bucketStart(new Date(now.getTime() - MS_PER_DAY), "1d");

  const freshProbes = probes.filter(p => {
    const bd = bucketStart(new Date(p.timestamp), "1d");
    return bd === today || bd === yesterday;
  });
  const freshMain = groupProbes(freshProbes, size);
  const freshSub = groupSubChecks(freshProbes, size);

  const merged: ServiceSeries[] = [];
  for (const service of SERVICE_IDS) {
    const prevSeries = previous?.services.find(s => s.service === service);
    const keptPrevBuckets: Bucket[] = prevSeries?.buckets.filter(b => {
      if (Date.parse(b.t) < cutoffMs) return false;
      const day = bucketStart(new Date(b.t), "1d");
      return day !== today && day !== yesterday;
    }) ?? [];

    const freshBuckets: Bucket[] = freshMain.has(service)
      ? [...freshMain.get(service)!.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([t, acc]) => makeBucket(t, acc))
      : [];

    const combinedBuckets = [...keptPrevBuckets, ...freshBuckets].sort((a, b) => a.t.localeCompare(b.t));

    const freshSubForService = freshSub.get(service);
    const prevSubSeries = prevSeries?.subSeries;
    let subSeriesOut: Record<string, readonly Bucket[]> | undefined;
    if ((freshSubForService && freshSubForService.size > 0) || (prevSubSeries && Object.keys(prevSubSeries).length > 0)) {
      const subNames = new Set<string>();
      if (prevSubSeries) for (const n of Object.keys(prevSubSeries)) subNames.add(n);
      if (freshSubForService) for (const n of freshSubForService.keys()) subNames.add(n);

      const built: Record<string, readonly Bucket[]> = {};
      for (const subName of subNames) {
        const keptPrev = (prevSubSeries?.[subName] ?? []).filter(b => {
          if (Date.parse(b.t) < cutoffMs) return false;
          const day = bucketStart(new Date(b.t), "1d");
          return day !== today && day !== yesterday;
        });
        const freshSubBuckets = freshSubForService?.get(subName)
          ? [...freshSubForService.get(subName)!.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([t, acc]) => makeBucket(t, acc))
          : [];
        built[subName] = [...keptPrev, ...freshSubBuckets].sort((a, b) => a.t.localeCompare(b.t));
      }
      subSeriesOut = built;
    }

    const series: ServiceSeries = subSeriesOut !== undefined
      ? {service, buckets: combinedBuckets, subSeries: subSeriesOut}
      : {service, buckets: combinedBuckets};

    if (combinedBuckets.length > 0 || series.subSeries) merged.push(series);
  }

  // AggregateFile is discriminated on (bucketSize, windowDays); the generic
  // `MergeBucketSize`/`MergeWindowDays` constraints keep the pair valid but
  // TS can't narrow the runtime pair back into the discriminated union, so
  // we branch explicitly.
  if (size === "1h") {
    return {
      generatedAt: now.toISOString(),
      bucketSize: "1h",
      windowDays: 90,
      services: merged,
    };
  }
  return {
    generatedAt: now.toISOString(),
    bucketSize: "1d",
    windowDays: 365,
    services: merged,
  };
}

/**
 * Read and validate the previous aggregate file. Missing file → `undefined`
 * (first-run). An existing-but-corrupt file throws — silent recovery would
 * silently overwrite 15–365 days of retained buckets with only the last 14
 * days of raw data, which is worse than forcing a human to intervene.
 */
function readPrevious(dataDir: string, name: string): AggregateFile | undefined {
  const path = join(dataDir, name);
  if (!existsSync(path)) return undefined;
  // If the file exists but is corrupt/unparseable, fail loudly rather than
  // silently returning undefined — otherwise the next run would overwrite
  // 15–365 days of retained buckets with only the last 14d of raw JSONL.
  // A human can inspect and hand-rewind status-data in that case.
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(`readPrevious: failed to read ${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`readPrevious: ${path} exists but is not valid JSON — refusing to overwrite history. ${err instanceof Error ? err.message : ""}`);
  }
  if (!isAggregateFile(parsed)) {
    throw new Error(`readPrevious: ${path} does not match AggregateFile schema — refusing to overwrite history.`);
  }
  return parsed;
}

/** Options accepted by {@link runAggregate}. */
export interface RunAggregateOptions {
  /** Base directory containing `raw/*.jsonl` input and where `*.json` outputs are written. */
  readonly dataDir: string;
  /** Clock override for deterministic tests; defaults to `new Date()`. */
  readonly now?: Date;
}

/**
 * Cron entry point: rebuild `fine.json`, merge-update `hourly.json` and
 * `daily.json`, then prune raw JSONL files older than 14 days. All work is
 * performed in-memory against the full raw stream; output files are
 * atomically `writeFileSync`'d (single buffer write).
 */
export async function runAggregate(opts: RunAggregateOptions): Promise<void> {
  const now = opts.now ?? new Date();
  const probes = readRawProbes(opts.dataDir);

  mkdirSync(opts.dataDir, {recursive: true});

  const fine = rebuildFine(probes, now);
  writeFileSync(join(opts.dataDir, "fine.json"), JSON.stringify(fine), "utf8");

  const prevHourly = readPrevious(opts.dataDir, "hourly.json");
  const hourly = mergeAggregate(probes, prevHourly, now, "1h", 90);
  writeFileSync(join(opts.dataDir, "hourly.json"), JSON.stringify(hourly), "utf8");

  const prevDaily = readPrevious(opts.dataDir, "daily.json");
  const daily = mergeAggregate(probes, prevDaily, now, "1d", 365);
  writeFileSync(join(opts.dataDir, "daily.json"), JSON.stringify(daily), "utf8");

  pruneRawFiles(opts.dataDir, now);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dataDir = process.env["DATA_DIR"] ?? "./data";
  runAggregate({dataDir}).catch(err => {
    console.error("aggregate failed:", err);
    process.exit(1);
  });
}
