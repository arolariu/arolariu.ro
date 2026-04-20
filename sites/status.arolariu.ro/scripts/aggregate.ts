import {mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync} from "node:fs";
import {join} from "node:path";
import {SERVICE_IDS, type AggregateFile, type Bucket, type BucketSize,
  type ProbeResult, type ServiceId, type ServiceSeries} from "../src/lib/types/status";
import {isAggregateFile} from "../src/lib/types/guards";
import {readRawProbes} from "./rawProbes";
import {bucketStart, makeBucket, type BucketAccumulator} from "./aggregateCommon";
import {groupProbes} from "./aggregateServices";
import {groupSubChecks} from "./aggregateSubChecks";

// Re-export so existing test imports (`from "./aggregate"`) keep working.
export {bucketStart};

const MS_PER_DAY = 86_400_000;

function toSeries(
  service: ServiceId,
  mainBuckets: Map<string, BucketAccumulator>,
  subs: Map<string, Map<string, BucketAccumulator>> | undefined,
): ServiceSeries {
  const buckets: Bucket[] = [...mainBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t, acc]) => makeBucket(t, acc));
  const series: ServiceSeries = {service, buckets};
  if (subs && subs.size > 0) {
    const subSeries: Record<string, readonly Bucket[]> = {};
    for (const [name, accMap] of subs) {
      subSeries[name] = [...accMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([t, acc]) => makeBucket(t, acc));
    }
    (series as Record<string, unknown>)["subSeries"] = subSeries;
  }
  return series;
}

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

function mergeAggregate(
  probes: readonly ProbeResult[],
  previous: AggregateFile | undefined,
  now: Date,
  size: BucketSize,
  windowDays: 90 | 365,
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

    const series: ServiceSeries = {service, buckets: combinedBuckets};

    const freshSubForService = freshSub.get(service);
    const prevSubSeries = prevSeries?.subSeries;
    if ((freshSubForService && freshSubForService.size > 0) || (prevSubSeries && Object.keys(prevSubSeries).length > 0)) {
      const subNames = new Set<string>();
      if (prevSubSeries) for (const n of Object.keys(prevSubSeries)) subNames.add(n);
      if (freshSubForService) for (const n of freshSubForService.keys()) subNames.add(n);

      const subSeriesOut: Record<string, readonly Bucket[]> = {};
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
        subSeriesOut[subName] = [...keptPrev, ...freshSubBuckets].sort((a, b) => a.t.localeCompare(b.t));
      }
      (series as Record<string, unknown>)["subSeries"] = subSeriesOut;
    }

    if (combinedBuckets.length > 0 || series.subSeries) merged.push(series);
  }

  return {
    generatedAt: now.toISOString(),
    bucketSize: size,
    windowDays,
    services: merged,
  };
}

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

export interface RunAggregateOptions {
  readonly dataDir: string;
  readonly now?: Date;
}

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
