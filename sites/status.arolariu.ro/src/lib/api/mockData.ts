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

type Granularity = "fine" | "hourly" | "daily";

interface WindowConfig {
  readonly bucketSize: "30m" | "1h" | "1d";
  readonly windowDays: 14 | 90 | 365;
  readonly bucketMs: number;
  readonly bucketCount: number;
}

const CONFIGS: Record<Granularity, WindowConfig> = {
  fine:   {bucketSize: "30m", windowDays: 14,  bucketMs: 30 * 60_000,       bucketCount: 14 * 48},
  hourly: {bucketSize: "1h",  windowDays: 90,  bucketMs: 60 * 60_000,       bucketCount: 90 * 24},
  daily:  {bucketSize: "1d",  windowDays: 365, bucketMs: 24 * 60 * 60_000,  bucketCount: 365},
};

// Samples per cron run in the new 3-sample-per-cron model
const SAMPLES_PER_CRON = 3;

function mkBucket(
  t: string,
  status: "Healthy" | "Degraded" | "Unhealthy",
  p50: number,
  healthy: number,
  total: number,
  extras: {worstSubCheck?: {name: string; status: "Healthy" | "Degraded" | "Unhealthy"; description?: string}} = {},
): Bucket {
  const bucket: Bucket = {
    t, status,
    probes: {healthy, total},
    latency: {p50, p99: Math.round(p50 * 2.1)},
    httpStatus: status === "Unhealthy" ? 503 : 200,
  };
  if (extras.worstSubCheck !== undefined) {
    (bucket as Record<string, unknown>)["worstSubCheck"] = extras.worstSubCheck;
  }
  return bucket;
}

/**
 * arolariu.ro storyline:
 * - Mostly Healthy (3/3 samples)
 * - Two short clusters of mild degradation (3 adjacent buckets each, ~5 days apart)
 *   with healthy=2/3 (one sample flaked)
 */
function generateArolariuRoBuckets(config: WindowConfig, now: number): Bucket[] {
  const total = config.bucketCount;
  const p50 = 142;
  // Place clusters relative to bucket index from end
  // Cluster 1: indices 30-32 from end (~ day 1)
  // Cluster 2: indices 270-272 from end (~ day 5-6) — only relevant for fine/hourly windows
  const degradedCluster1 = new Set([30, 31, 32]);
  const degradedCluster2 = new Set([270, 271, 272]);

  return Array.from({length: total}, (_, rev) => {
    const i = total - 1 - rev; // bucket index from oldest
    const fromEnd = rev; // distance from newest
    const t = new Date(now - fromEnd * config.bucketMs).toISOString();
    if (degradedCluster1.has(fromEnd) || degradedCluster2.has(fromEnd)) {
      return mkBucket(t, "Degraded", Math.round(p50 * 3.2), 2, SAMPLES_PER_CRON);
    }
    void i;
    return mkBucket(t, "Healthy", p50, SAMPLES_PER_CRON, SAMPLES_PER_CRON);
  });
}

/**
 * api.arolariu.ro storyline:
 * - Healthy overall
 * - Cosmetic mssql hiccup every ~2 days (sub-check flap, parent still Healthy)
 * - One 90-min full Degraded window (6 buckets, ~2 days ago): healthy=0/3
 */
function generateApiArolariuRoBuckets(config: WindowConfig, now: number): Bucket[] {
  const total = config.bucketCount;
  const p50 = 310;
  // Full Degraded window: buckets 80-85 from end (~2 days ago in fine mode)
  const degradedWindow = new Set([80, 81, 82, 83, 84, 85]);
  // Cosmetic mssql hiccup every ~2 days: indices mod 96 (48 buckets/day * 2 = 96)
  const mssqlHiccup = (fromEnd: number) => fromEnd % 96 === 48;

  return Array.from({length: total}, (_, rev) => {
    const fromEnd = rev;
    const t = new Date(now - fromEnd * config.bucketMs).toISOString();
    if (degradedWindow.has(fromEnd)) {
      return mkBucket(t, "Degraded", Math.round(p50 * 4.0), 0, SAMPLES_PER_CRON,
        {worstSubCheck: {name: "mssql", status: "Degraded", description: "connection pool exhausted"}},
      );
    }
    if (mssqlHiccup(fromEnd)) {
      // Parent stays Healthy but worstSubCheck shows the flap
      return mkBucket(t, "Healthy", p50, SAMPLES_PER_CRON, SAMPLES_PER_CRON,
        {worstSubCheck: {name: "mssql", status: "Degraded", description: "brief connection spike"}},
      );
    }
    return mkBucket(t, "Healthy", p50, SAMPLES_PER_CRON, SAMPLES_PER_CRON);
  });
}

/**
 * exp.arolariu.ro storyline:
 * - One major outage ~12h ago: 6 buckets Unhealthy (healthy=0/3)
 * - Otherwise clean
 */
function generateExpArolariuRoBuckets(config: WindowConfig, now: number): Bucket[] {
  const total = config.bucketCount;
  const p50 = 89;
  // Outage window: buckets 24-29 from end (~12h ago in fine 30m mode)
  const outageWindow = new Set([24, 25, 26, 27, 28, 29]);

  return Array.from({length: total}, (_, rev) => {
    const fromEnd = rev;
    const t = new Date(now - fromEnd * config.bucketMs).toISOString();
    if (outageWindow.has(fromEnd)) {
      return mkBucket(t, "Unhealthy", Math.round(p50 * 8.0), 0, SAMPLES_PER_CRON);
    }
    return mkBucket(t, "Healthy", p50, SAMPLES_PER_CRON, SAMPLES_PER_CRON);
  });
}

/**
 * cv.arolariu.ro storyline:
 * - All Healthy (static site — boring is fine)
 */
function generateCvArolariuRoBuckets(config: WindowConfig, now: number): Bucket[] {
  const total = config.bucketCount;
  const p50 = 35;
  return Array.from({length: total}, (_, rev) => {
    const fromEnd = rev;
    const t = new Date(now - fromEnd * config.bucketMs).toISOString();
    return mkBucket(t, "Healthy", p50, SAMPLES_PER_CRON, SAMPLES_PER_CRON);
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
 */
function generateSubSeries(config: WindowConfig, now: number): Record<string, readonly Bucket[]> {
  const total = config.bucketCount;
  const degradedWindow = new Set([80, 81, 82, 83, 84, 85]);
  const mssqlHiccup = (fromEnd: number) => fromEnd % 96 === 48;
  const cosmosDegraded = new Set([60]);

  const mssql: Bucket[] = Array.from({length: total}, (_, rev) => {
    const fromEnd = rev;
    const t = new Date(now - fromEnd * config.bucketMs).toISOString();
    if (degradedWindow.has(fromEnd)) {
      return mkBucket(t, "Degraded", 847, 0, SAMPLES_PER_CRON);
    }
    if (mssqlHiccup(fromEnd)) {
      return mkBucket(t, "Degraded", 600, 1, SAMPLES_PER_CRON);
    }
    return mkBucket(t, "Healthy", 10, SAMPLES_PER_CRON, SAMPLES_PER_CRON);
  });

  const cosmosdb: Bucket[] = Array.from({length: total}, (_, rev) => {
    const fromEnd = rev;
    const t = new Date(now - fromEnd * config.bucketMs).toISOString();
    if (cosmosDegraded.has(fromEnd)) {
      return mkBucket(t, "Degraded", 320, 2, SAMPLES_PER_CRON);
    }
    return mkBucket(t, "Healthy", 48, SAMPLES_PER_CRON, SAMPLES_PER_CRON);
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
  const resolvedStart = new Date(now - 26 * 60 * 60_000).toISOString();   // 26h ago
  const resolvedEnd   = new Date(now - 25 * 60 * 60_000).toISOString();   // 25h ago
  const openStart     = new Date(now - 3 * 60 * 60_000).toISOString();    // 3h ago (ongoing)
  // New: api mssql incident ~4 days ago, 2h duration
  const apiMssqlStart   = new Date(now - 4 * 24 * 60 * 60_000).toISOString();
  const apiMssqlEnd     = new Date(now - 4 * 24 * 60 * 60_000 + 2 * 60 * 60_000).toISOString();
  // New: exp outage ~12h ago, 3h duration (matches storyline)
  const expOutageStart  = new Date(now - 12 * 60 * 60_000).toISOString();
  const expOutageEnd    = new Date(now - 9 * 60 * 60_000).toISOString();

  const incidents: Incident[] = [
    {
      id: `inc-${openStart.replace(/[:.]/g, "-")}-exp.arolariu.ro`,
      service: "exp.arolariu.ro",
      status: "open",
      startedAt: openStart,
      severity: "Degraded",
      reason: "elevated latency on upstream dependency (mock)",
      probeCount: 6,
    },
    {
      id: `inc-${resolvedStart.replace(/[:.]/g, "-")}-api.arolariu.ro-mssql`,
      service: "api.arolariu.ro",
      subCheck: "mssql",
      status: "resolved",
      startedAt: resolvedStart,
      resolvedAt: resolvedEnd,
      durationMs: 60 * 60_000,
      severity: "Degraded",
      reason: "connection pool exhausted (mock)",
      probeCount: 4,
    },
    {
      id: `inc-${apiMssqlStart.replace(/[:.]/g, "-")}-api.arolariu.ro-mssql-long`,
      service: "api.arolariu.ro",
      subCheck: "mssql",
      status: "resolved",
      startedAt: apiMssqlStart,
      resolvedAt: apiMssqlEnd,
      durationMs: 2 * 60 * 60_000,
      severity: "Degraded",
      reason: "connection pool saturation during deploy (mock)",
      probeCount: 4,
    },
    {
      id: `inc-${expOutageStart.replace(/[:.]/g, "-")}-exp.arolariu.ro-outage`,
      service: "exp.arolariu.ro",
      status: "resolved",
      startedAt: expOutageStart,
      resolvedAt: expOutageEnd,
      durationMs: 3 * 60 * 60_000,
      severity: "Unhealthy",
      reason: "upstream ML model service unreachable (mock)",
      probeCount: 6,
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
