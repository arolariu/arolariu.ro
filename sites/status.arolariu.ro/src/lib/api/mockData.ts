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

/**
 * Mark ~2% of buckets in a deterministic pseudorandom pattern as degraded,
 * so every filter window has some visible incident activity to look at.
 * Determinism keeps hot-reload stable across refreshes within a session.
 */
function isBucketDegraded(bucketIndex: number, serviceOffset: number): boolean {
  const h = (bucketIndex * 2654435761 + serviceOffset * 40503) >>> 0;
  return h % 50 < 1; // ~2%
}

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

function generateMainBuckets(service: ServiceId, config: WindowConfig, now: number): Bucket[] {
  const offset = SERVICES.indexOf(service);
  const baseLatency = [142, 310, 89, 35][offset] ?? 100;
  const buckets: Bucket[] = [];
  for (let i = config.bucketCount - 1; i >= 0; i--) {
    const t = new Date(now - i * config.bucketMs).toISOString();
    const degraded = isBucketDegraded(i, offset);
    if (degraded) {
      buckets.push(mkBucket(
        t, "Degraded", Math.round(baseLatency * 4.5), 0, 1,
        service === "api.arolariu.ro"
          ? {worstSubCheck: {name: "mssql", status: "Degraded", description: "connection pool exhausted"}}
          : {},
      ));
    } else {
      buckets.push(mkBucket(t, "Healthy", baseLatency, 1, 1));
    }
  }
  return buckets;
}

function generateSubSeries(config: WindowConfig, now: number): Record<string, readonly Bucket[]> {
  const mssql: Bucket[] = [];
  const cosmosdb: Bucket[] = [];
  const apiOffset = SERVICES.indexOf("api.arolariu.ro");
  for (let i = config.bucketCount - 1; i >= 0; i--) {
    const t = new Date(now - i * config.bucketMs).toISOString();
    const degraded = isBucketDegraded(i, apiOffset);
    mssql.push(degraded
      ? mkBucket(t, "Degraded", 847, 0, 1)
      : mkBucket(t, "Healthy", 10, 1, 1));
    cosmosdb.push(mkBucket(t, "Healthy", 48, 1, 1));
  }
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
