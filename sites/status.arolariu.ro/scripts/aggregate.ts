import {mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync} from "node:fs";
import {join} from "node:path";
import {SERVICE_IDS, type AggregateFile, type Bucket, type BucketSize,
  type HealthStatus, type ProbeResult, type ServiceId, type ServiceSeries,
  type SubCheckSummary} from "../src/lib/types/status";

const MS_PER_DAY = 86_400_000;

export function bucketStart(d: Date, size: BucketSize): string {
  const t = new Date(Date.UTC(
    d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
    size === "1d" ? 0 : d.getUTCHours(),
    size === "30m" ? Math.floor(d.getUTCMinutes() / 30) * 30 : 0,
    0, 0,
  ));
  return t.toISOString();
}

function worstStatus(a: HealthStatus, b: HealthStatus): HealthStatus {
  const order: Record<HealthStatus, number> = {Healthy: 0, Degraded: 1, Unhealthy: 2};
  return order[a] >= order[b] ? a : b;
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return Math.round(sorted[lo]! + (rank - lo) * (sorted[hi]! - sorted[lo]!));
}

function mode(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0]; let bestCount = 0;
  for (const [v, c] of counts) if (c > bestCount) {best = v; bestCount = c;}
  return best;
}

interface BucketAccumulator {
  statuses: HealthStatus[];
  latencies: number[];
  httpStatuses: number[];
  worstSub?: {name: string; status: HealthStatus; description?: string};
}

function makeBucket(t: string, acc: BucketAccumulator): Bucket {
  const worstOverall = acc.statuses.reduce(worstStatus, "Healthy" as HealthStatus);
  const healthy = acc.statuses.filter(s => s === "Healthy").length;
  const httpMode = mode(acc.httpStatuses);
  const bucket: Bucket = {
    t,
    status: worstOverall,
    probes: {healthy, total: acc.statuses.length},
    latency: {p50: percentile(acc.latencies, 50), p99: percentile(acc.latencies, 99)},
  };
  const result: Record<string, unknown> = {...bucket};
  if (httpMode !== undefined) result["httpStatus"] = httpMode;
  if (acc.worstSub !== undefined) {
    const summary: SubCheckSummary = {name: acc.worstSub.name, status: acc.worstSub.status};
    if (acc.worstSub.description !== undefined) (summary as Record<string, unknown>)["description"] = acc.worstSub.description;
    result["worstSubCheck"] = summary;
  }
  return result as Bucket;
}

function groupProbes(probes: readonly ProbeResult[], size: BucketSize):
  Map<ServiceId, Map<string, BucketAccumulator>> {
  const byService = new Map<ServiceId, Map<string, BucketAccumulator>>();
  for (const p of probes) {
    const bucket = bucketStart(new Date(p.timestamp), size);
    let perService = byService.get(p.service);
    if (!perService) {perService = new Map(); byService.set(p.service, perService);}
    let acc = perService.get(bucket);
    if (!acc) {acc = {statuses: [], latencies: [], httpStatuses: []}; perService.set(bucket, acc);}
    acc.statuses.push(p.overall);
    acc.latencies.push(p.latencyMs);
    acc.httpStatuses.push(p.httpStatus);
    if (p.subChecks) {
      for (const sc of p.subChecks) {
        if (sc.status !== "Healthy") {
          if (!acc.worstSub || worstStatus(acc.worstSub.status, sc.status) === sc.status) {
            acc.worstSub = {name: sc.name, status: sc.status, description: sc.description};
          }
        }
      }
    }
  }
  return byService;
}

function groupSubChecks(probes: readonly ProbeResult[], size: BucketSize):
  Map<ServiceId, Map<string, Map<string, BucketAccumulator>>> {
  const byService = new Map<ServiceId, Map<string, Map<string, BucketAccumulator>>>();
  for (const p of probes) {
    if (!p.subChecks) continue;
    const bucket = bucketStart(new Date(p.timestamp), size);
    let perService = byService.get(p.service);
    if (!perService) {perService = new Map(); byService.set(p.service, perService);}
    for (const sc of p.subChecks) {
      let perSub = perService.get(sc.name);
      if (!perSub) {perSub = new Map(); perService.set(sc.name, perSub);}
      let acc = perSub.get(bucket);
      if (!acc) {acc = {statuses: [], latencies: [], httpStatuses: []}; perSub.set(bucket, acc);}
      acc.statuses.push(sc.status);
      acc.latencies.push(sc.durationMs);
    }
  }
  return byService;
}

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

function readRawProbes(dataDir: string): ProbeResult[] {
  const rawDir = join(dataDir, "raw");
  if (!existsSync(rawDir)) return [];
  const files = readdirSync(rawDir).filter(f => f.endsWith(".jsonl")).sort();
  const probes: ProbeResult[] = [];
  for (const f of files) {
    const content = readFileSync(join(rawDir, f), "utf8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        probes.push(JSON.parse(line) as ProbeResult);
      } catch {
        // Malformed line — skip.
      }
    }
  }
  return probes;
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
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dataDir = process.env["DATA_DIR"] ?? "./data";
  runAggregate({dataDir}).catch(err => {
    console.error("aggregate failed:", err);
    process.exit(1);
  });
}
