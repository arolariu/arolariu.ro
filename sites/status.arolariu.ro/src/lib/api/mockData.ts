/**
 * Mock data generators for local dev (`npm run dev` / `npm run preview`).
 * Only used when `window.location.hostname` resolves to localhost — never
 * shipped to the production Azure SWA runtime path. See fetchStatusData.ts.
 *
 * Data is generated relative to `Date.now()` so the UI always shows "recent"
 * timestamps regardless of when the dev server is started. This is why
 * static JSON fixtures (`tests/fixtures/*.json`) are not reused here.
 */

import type {
  AggregateFile, Bucket, Incident, IncidentsFile,
  ServiceId, ServiceSeries,
} from "../types/status";

const SERVICES: readonly ServiceId[] = [
  "arolariu.ro", "api.arolariu.ro", "exp.arolariu.ro", "cv.arolariu.ro",
];

const MS_PER_MIN = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

type Granularity = "fine" | "hourly" | "daily";

interface WindowConfig {
  readonly bucketSize: "30m" | "1h" | "1d";
  readonly windowDays: 14 | 90 | 365;
  readonly bucketMs: number;
  readonly bucketCount: number;
  /** How many 30-min cron runs are aggregated into one bucket at this granularity. */
  readonly cronsPerBucket: number;
}

const CONFIGS: Record<Granularity, WindowConfig> = {
  fine:   {bucketSize: "30m", windowDays: 14,  bucketMs: 30 * MS_PER_MIN,       bucketCount: 14 * 48, cronsPerBucket: 1},
  hourly: {bucketSize: "1h",  windowDays: 90,  bucketMs: MS_PER_HOUR,           bucketCount: 90 * 24, cronsPerBucket: 2},
  daily:  {bucketSize: "1d",  windowDays: 365, bucketMs: MS_PER_DAY,            bucketCount: 365,     cronsPerBucket: 48},
};

// Samples per cron run in the new 3-sample-per-cron model
const SAMPLES_PER_CRON = 3;

/**
 * `healthyPerCron` / `totalPerCron` are per-cron-run sample counts (0..3).
 * The bucket-level probe count is scaled by `cronsPerBucket`, so a 1-day
 * bucket at daily granularity shows 48× the sample count of a 30-min bucket.
 */
function mkBucket(
  t: string,
  status: "Healthy" | "Degraded" | "Unhealthy",
  p50: number,
  healthyPerCron: number,
  totalPerCron: number,
  cronsPerBucket: number,
  extras: {worstSubCheck?: {name: string; status: "Healthy" | "Degraded" | "Unhealthy"; description?: string}} = {},
): Bucket {
  const bucket: Bucket = {
    t, status,
    probes: {
      healthy: healthyPerCron * cronsPerBucket,
      total: totalPerCron * cronsPerBucket,
    },
    latency: {p50, p99: Math.round(p50 * 2.1)},
    httpStatus: status === "Unhealthy" ? 503 : 200,
  };
  if (extras.worstSubCheck !== undefined) {
    (bucket as Record<string, unknown>)["worstSubCheck"] = extras.worstSubCheck;
  }
  return bucket;
}

/**
 * Returns true if bucket timestamp `t` (ms) overlaps the half-open range
 * [start, end). Used to place blips anchored by wall-clock instead of
 * bucket index, so they appear correctly across all three granularities.
 */
function withinRange(t: number, bucketMs: number, start: number, end: number): boolean {
  return t + bucketMs > start && t < end;
}

/**
 * arolariu.ro storyline:
 * - Mostly Healthy
 * - Two short clusters of mild degradation (~5 days apart, ~1h each)
 * - One 4-hour Degraded blip centered ~14 days ago (visible in 14d/30d/90d views)
 */
function generateArolariuRoBuckets(config: WindowConfig, now: number): Bucket[] {
  const total = config.bucketCount;
  const p50 = 142;
  const degradedCluster1 = new Set([30, 31, 32]);
  const degradedCluster2 = new Set([270, 271, 272]);

  // Wall-clock anchor: 14 days + 2h ago, lasting 4 hours.
  const blipStart = now - 14 * MS_PER_DAY - 2 * MS_PER_HOUR;
  const blipEnd = blipStart + 4 * MS_PER_HOUR;

  return Array.from({length: total}, (_, rev) => {
    const fromEnd = rev;
    const bucketT = now - fromEnd * config.bucketMs;
    const t = new Date(bucketT).toISOString();
    if (withinRange(bucketT, config.bucketMs, blipStart, blipEnd)) {
      return mkBucket(t, "Degraded", Math.round(p50 * 2.6), 2, SAMPLES_PER_CRON, config.cronsPerBucket);
    }
    if (degradedCluster1.has(fromEnd) || degradedCluster2.has(fromEnd)) {
      return mkBucket(t, "Degraded", Math.round(p50 * 3.2), 2, SAMPLES_PER_CRON, config.cronsPerBucket);
    }
    return mkBucket(t, "Healthy", p50, SAMPLES_PER_CRON, SAMPLES_PER_CRON, config.cronsPerBucket);
  });
}

/**
 * api.arolariu.ro storyline:
 * - Healthy overall
 * - Cosmetic mssql hiccup every ~2 days (sub-check flap, parent still Healthy)
 * - One 90-min full Degraded window (6 buckets, ~2 days ago): healthy=0/3
 * - Latency creep: in the 14 days BEFORE the mssql incident 4 days ago, p50 climbs
 *   from 280ms toward 450ms linearly, then snaps back.
 */
function generateApiArolariuRoBuckets(config: WindowConfig, now: number): Bucket[] {
  const total = config.bucketCount;
  const baseP50 = 310;
  const degradedWindow = new Set([80, 81, 82, 83, 84, 85]);
  const mssqlHiccup = (fromEnd: number) => fromEnd % 96 === 48;

  // Latency creep window: from (4d + 14d) ago to (4d) ago.
  const creepStart = now - (4 * MS_PER_DAY + 14 * MS_PER_DAY);
  const creepEnd = now - 4 * MS_PER_DAY;

  return Array.from({length: total}, (_, rev) => {
    const fromEnd = rev;
    const bucketT = now - fromEnd * config.bucketMs;
    const t = new Date(bucketT).toISOString();

    // Latency creep: ramp 280 -> 450 as bucketT progresses from creepStart to creepEnd.
    let p50 = baseP50;
    if (bucketT >= creepStart && bucketT <= creepEnd) {
      const progress = (bucketT - creepStart) / (creepEnd - creepStart);
      p50 = Math.min(280 + progress * 170, 450);
    }

    if (degradedWindow.has(fromEnd)) {
      return mkBucket(t, "Degraded", Math.round(p50 * 4.0), 0, SAMPLES_PER_CRON, config.cronsPerBucket,
        {worstSubCheck: {name: "mssql", status: "Degraded", description: "connection pool exhausted"}},
      );
    }
    if (mssqlHiccup(fromEnd)) {
      return mkBucket(t, "Healthy", p50, SAMPLES_PER_CRON, SAMPLES_PER_CRON, config.cronsPerBucket,
        {worstSubCheck: {name: "mssql", status: "Degraded", description: "brief connection spike"}},
      );
    }
    return mkBucket(t, "Healthy", Math.round(p50), SAMPLES_PER_CRON, SAMPLES_PER_CRON, config.cronsPerBucket);
  });
}

/**
 * exp.arolariu.ro storyline:
 * - One major outage ~12h ago: 6 buckets Unhealthy (healthy=0/3)
 * - Ongoing Degraded event ~3h ago (covered via incident, not buckets here)
 * - Otherwise clean
 */
function generateExpArolariuRoBuckets(config: WindowConfig, now: number): Bucket[] {
  const total = config.bucketCount;
  const p50 = 89;
  const outageWindow = new Set([24, 25, 26, 27, 28, 29]);

  return Array.from({length: total}, (_, rev) => {
    const fromEnd = rev;
    const t = new Date(now - fromEnd * config.bucketMs).toISOString();
    if (outageWindow.has(fromEnd)) {
      return mkBucket(t, "Unhealthy", Math.round(p50 * 8.0), 0, SAMPLES_PER_CRON, config.cronsPerBucket);
    }
    return mkBucket(t, "Healthy", p50, SAMPLES_PER_CRON, SAMPLES_PER_CRON, config.cronsPerBucket);
  });
}

/**
 * cv.arolariu.ro storyline:
 * - Mostly clean (static site — boring is fine)
 * - One 30-min Degraded blip 45 days ago (visible in 90d/180d/365d views)
 */
function generateCvArolariuRoBuckets(config: WindowConfig, now: number): Bucket[] {
  const total = config.bucketCount;
  const p50 = 35;

  const blipStart = now - 45 * MS_PER_DAY;
  const blipEnd = blipStart + 30 * MS_PER_MIN;

  return Array.from({length: total}, (_, rev) => {
    const fromEnd = rev;
    const bucketT = now - fromEnd * config.bucketMs;
    const t = new Date(bucketT).toISOString();
    if (withinRange(bucketT, config.bucketMs, blipStart, blipEnd)) {
      return mkBucket(t, "Degraded", Math.round(p50 * 3.2), 2, SAMPLES_PER_CRON, config.cronsPerBucket);
    }
    return mkBucket(t, "Healthy", p50, SAMPLES_PER_CRON, SAMPLES_PER_CRON, config.cronsPerBucket);
  });
}

function generateMainBuckets(service: ServiceId, config: WindowConfig, now: number): Bucket[] {
  switch (service) {
    case "arolariu.ro":     return generateArolariuRoBuckets(config, now);
    case "api.arolariu.ro": return generateApiArolariuRoBuckets(config, now);
    case "exp.arolariu.ro": return generateExpArolariuRoBuckets(config, now);
    case "cv.arolariu.ro":  return generateCvArolariuRoBuckets(config, now);
  }
}

/**
 * api.arolariu.ro sub-series:
 * - mssql: same outage window (80-85 from end) plus cosmetic hiccups every ~96 buckets
 * - cosmosdb: mostly clean, one 30-min degraded spike ~30h ago (fromEnd ~ 60)
 *   plus a new 30-min Unhealthy blip 5 days ago (throttling)
 */
function generateSubSeries(config: WindowConfig, now: number): Record<string, readonly Bucket[]> {
  const total = config.bucketCount;
  const degradedWindow = new Set([80, 81, 82, 83, 84, 85]);
  const mssqlHiccup = (fromEnd: number) => fromEnd % 96 === 48;
  const cosmosDegraded = new Set([60]);

  // Cosmos throttle blip: 5 days ago, 30 min duration.
  const cosmosBlipStart = now - 5 * MS_PER_DAY;
  const cosmosBlipEnd = cosmosBlipStart + 30 * MS_PER_MIN;

  const mssql: Bucket[] = Array.from({length: total}, (_, rev) => {
    const fromEnd = rev;
    const t = new Date(now - fromEnd * config.bucketMs).toISOString();
    if (degradedWindow.has(fromEnd)) {
      return mkBucket(t, "Degraded", 847, 0, SAMPLES_PER_CRON, config.cronsPerBucket);
    }
    if (mssqlHiccup(fromEnd)) {
      return mkBucket(t, "Degraded", 600, 1, SAMPLES_PER_CRON, config.cronsPerBucket);
    }
    return mkBucket(t, "Healthy", 10, SAMPLES_PER_CRON, SAMPLES_PER_CRON, config.cronsPerBucket);
  });

  const cosmosdb: Bucket[] = Array.from({length: total}, (_, rev) => {
    const fromEnd = rev;
    const bucketT = now - fromEnd * config.bucketMs;
    const t = new Date(bucketT).toISOString();
    if (withinRange(bucketT, config.bucketMs, cosmosBlipStart, cosmosBlipEnd)) {
      return mkBucket(t, "Unhealthy", 750, 0, SAMPLES_PER_CRON, config.cronsPerBucket);
    }
    if (cosmosDegraded.has(fromEnd)) {
      return mkBucket(t, "Degraded", 320, 2, SAMPLES_PER_CRON, config.cronsPerBucket);
    }
    return mkBucket(t, "Healthy", 48, SAMPLES_PER_CRON, SAMPLES_PER_CRON, config.cronsPerBucket);
  });

  return {mssql, cosmosdb};
}

export function generateMockAggregate(granularity: Granularity): AggregateFile {
  const now = Date.now();
  const config = CONFIGS[granularity];
  const services: ServiceSeries[] = SERVICES.map(service => {
    const buckets = generateMainBuckets(service, config, now);
    const series: ServiceSeries = {service, buckets};
    if (service === "api.arolariu.ro") {
      (series as Record<string, unknown>)["subSeries"] = generateSubSeries(config, now);
    }
    return series;
  });

  // Intentionally construct via explicit discriminated-union literal so TS
  // verifies the (bucketSize, windowDays) pair is valid.
  const generatedAt = new Date(now).toISOString();
  switch (granularity) {
    case "fine":   return {generatedAt, bucketSize: "30m", windowDays: 14,  services};
    case "hourly": return {generatedAt, bucketSize: "1h",  windowDays: 90,  services};
    case "daily":  return {generatedAt, bucketSize: "1d",  windowDays: 365, services};
  }
}

export function generateMockIncidents(): IncidentsFile {
  const now = Date.now();

  const incidents: Incident[] = [
    // inc-001: ongoing Degraded on exp.arolariu.ro (~3h ago)
    {
      id: "inc-001",
      service: "exp.arolariu.ro",
      status: "open",
      severity: "Degraded",
      startedAt: new Date(now - 3 * MS_PER_HOUR).toISOString(),
      reason: "elevated latency on upstream dependency (mock)",
      probeCount: 6,
    },
    // inc-002: exp.arolariu.ro Unhealthy outage 12h..9h ago
    {
      id: "inc-002",
      service: "exp.arolariu.ro",
      status: "resolved",
      severity: "Unhealthy",
      startedAt: new Date(now - 12 * MS_PER_HOUR).toISOString(),
      resolvedAt: new Date(now - 9 * MS_PER_HOUR).toISOString(),
      durationMs: 3 * MS_PER_HOUR,
      reason: "upstream ML model service unreachable (mock)",
      probeCount: 6,
    },
    // inc-003: api.arolariu.ro mssql Degraded 26h..25h ago
    {
      id: "inc-003",
      service: "api.arolariu.ro",
      subCheck: "mssql",
      status: "resolved",
      severity: "Degraded",
      startedAt: new Date(now - 26 * MS_PER_HOUR).toISOString(),
      resolvedAt: new Date(now - 25 * MS_PER_HOUR).toISOString(),
      durationMs: 1 * MS_PER_HOUR,
      reason: "connection pool exhausted (mock)",
      probeCount: 2,
    },
    // inc-004: api.arolariu.ro mssql Degraded 4 days ago, 2h duration
    {
      id: "inc-004",
      service: "api.arolariu.ro",
      subCheck: "mssql",
      status: "resolved",
      severity: "Degraded",
      startedAt: new Date(now - 4 * MS_PER_DAY).toISOString(),
      resolvedAt: new Date(now - 4 * MS_PER_DAY + 2 * MS_PER_HOUR).toISOString(),
      durationMs: 2 * MS_PER_HOUR,
      reason: "connection pool saturation during deploy (mock)",
      probeCount: 4,
    },
    // inc-005: api.arolariu.ro cosmosdb Unhealthy 5 days ago, 30min
    {
      id: "inc-005",
      service: "api.arolariu.ro",
      subCheck: "cosmosdb",
      status: "resolved",
      severity: "Unhealthy",
      startedAt: new Date(now - 5 * MS_PER_DAY).toISOString(),
      resolvedAt: new Date(now - 5 * MS_PER_DAY + 30 * MS_PER_MIN).toISOString(),
      durationMs: 30 * MS_PER_MIN,
      reason: "cosmosdb throttling on partition key (mock)",
      probeCount: 1,
    },
    // inc-006: arolariu.ro Degraded 14 days ago, 4h duration
    {
      id: "inc-006",
      service: "arolariu.ro",
      status: "resolved",
      severity: "Degraded",
      startedAt: new Date(now - 14 * MS_PER_DAY - 2 * MS_PER_HOUR).toISOString(),
      resolvedAt: new Date(now - 14 * MS_PER_DAY + 2 * MS_PER_HOUR).toISOString(),
      durationMs: 4 * MS_PER_HOUR,
      reason: "CDN cache purge cascaded origin load (mock)",
      probeCount: 8,
    },
    // inc-007: cv.arolariu.ro Degraded 45 days ago, 30min
    {
      id: "inc-007",
      service: "cv.arolariu.ro",
      status: "resolved",
      severity: "Degraded",
      startedAt: new Date(now - 45 * MS_PER_DAY).toISOString(),
      resolvedAt: new Date(now - 45 * MS_PER_DAY + 30 * MS_PER_MIN).toISOString(),
      durationMs: 30 * MS_PER_MIN,
      reason: "Azure Static Web App edge node hiccup (mock)",
      probeCount: 1,
    },
  ];

  return {
    generatedAt: new Date(now).toISOString(),
    incidents,
  };
}

/**
 * True when the page is being served from a local dev or preview server.
 * Returns false during SSR (no `window`) and in the production SWA, keeping
 * the mock module's runtime side-effects local-only.
 *
 * Escape hatch: the E2E spec navigates with `?mocks=off` so its
 * `page.route()` fixture interceptors fire against the real network code
 * path (otherwise this shortcut would swallow every fetch).
 */
export function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.search.includes("mocks=off")) return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}
