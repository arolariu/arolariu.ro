/**
 * Mock data generators for local dev (`npm run dev` / `npm run preview`).
 * Only used when `window.location.hostname` resolves to localhost — never
 * shipped to the production Azure SWA runtime path. See fetchStatusData.ts.
 *
 * Data is generated relative to `Date.now()` so the UI always shows "recent"
 * timestamps regardless of when the dev server is started.
 *
 * === Shape ===
 *
 * Each service has a `ServiceStoryline` record declaring:
 *  - `baseline` — the "normal day" p50 latency
 *  - optional `latencyDrift` — a linear creep window (startAgoHours → endAgoHours
 *    ramps p50 from baseline to `endP50`, then snaps back)
 *  - `blips` — list of wall-clock-anchored events (status + duration)
 *  - optional `subChecks` — per-sub-check storylines driving the sub-series
 *
 * Incidents are derived from blips directly: one resolved Incident per
 * past blip, plus `ongoing` blips become open incidents. Narrative stays
 * declarative; bucket math + incident generation share one source.
 */

import type {AggregateFile, Bucket, HealthStatus, Incident, IncidentsFile, ServiceId, ServiceSeries} from "../types/status";

const MS_PER_MIN = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/** Which aggregate file is being mocked (matches the production `Granularity`). */
type Granularity = "fine" | "hourly" | "daily";

/** Per-granularity constants used by the bucket-generation loop. */
interface GranularityConfig {
  readonly bucketSize: "30m" | "1h" | "1d";
  readonly windowDays: 14 | 90 | 365;
  /** Wall-clock span of one bucket, in milliseconds. */
  readonly bucketMs: number;
  /** Total number of buckets in the output file (windowDays × buckets-per-day). */
  readonly bucketCount: number;
  /** How many 30-min cron runs are aggregated into one bucket at this granularity. */
  readonly cronsPerBucket: number;
}

/**
 * Canonical (bucketSize, windowDays) pairings. Mirrors the `AggregateWindow`
 * discriminated union — any change here must also happen in `types/status.ts`
 * or the mock will produce unvalidatable files.
 */
const CONFIGS: Record<Granularity, GranularityConfig> = {
  fine: {bucketSize: "30m", windowDays: 14, bucketMs: 30 * MS_PER_MIN, bucketCount: 14 * 48, cronsPerBucket: 1},
  hourly: {bucketSize: "1h", windowDays: 90, bucketMs: MS_PER_HOUR, bucketCount: 90 * 24, cronsPerBucket: 2},
  daily: {bucketSize: "1d", windowDays: 365, bucketMs: MS_PER_DAY, bucketCount: 365, cronsPerBucket: 48},
};

/**
 * Samples per cron run. Must match `DEFAULT_SAMPLE_DELAYS_MS.length` in
 * `scripts/probe.ts` — the real probe takes 10 measurements over 180s per
 * cron, and mock bucket `probes.total` values need to reflect the same
 * arithmetic (cronsPerBucket × samples) so "N / N probes" tooltips
 * read the same in local-mock dev as in production.
 */
const SAMPLES_PER_CRON = 10;

/**
 * A single incident-worthy event on a service (or sub-check). Anchored by
 * `ageHours` = hours-ago from `Date.now()`, extends for `durationHours`.
 * `open: true` marks it as an ongoing incident: the blip appears in the
 * IncidentsFile as an open entry, but is intentionally *excluded* from the
 * bucket series (see `generateBucketsFor` — `.filter(b => !b.open)`) so
 * near-now, unsettled state doesn't rewrite the health timeline.
 *
 * `latencyFactor` multiplies baseline p50 during the blip — e.g. 8.0 for
 * a full outage, 3.2 for slow-but-serving. Defaults to 3.2 for Degraded,
 * 8.0 for Unhealthy.
 *
 * `reason` carries through to the derived Incident record.
 */
interface Blip {
  readonly ageHours: number;
  readonly durationHours: number;
  readonly status: Exclude<HealthStatus, "Healthy">;
  readonly reason: string;
  readonly latencyFactor?: number;
  readonly probeCount: number;
  readonly open?: boolean;
}

/**
 * Per-sub-check narrative. Sub-checks carry their own baseline p50 and blip
 * list so a sub-check outage can be simulated without affecting the parent
 * service's bucket series.
 */
interface SubCheckStoryline {
  readonly baselineP50: number;
  readonly blips: readonly Blip[];
  /** Cyclic cosmetic degradation at sub-check level that does not
   *  escalate to an incident (mssql "hiccup" every ~96 30m-buckets). */
  readonly cyclicHiccup?: {
    readonly everyNBuckets: number;
    readonly atOffset: number;
    readonly p50: number;
    readonly healthyPerCron: number;
  };
}

/**
 * Full narrative for one service: baseline p50, optional latency drift
 * ramp, list of blips (incident events), and optional per-sub-check sub-storylines.
 */
interface ServiceStoryline {
  readonly service: ServiceId;
  /** "Normal day" p50 latency in ms, used when no blip or drift is active. */
  readonly baselineP50: number;
  /**
   * Optional linear latency creep. Between `startAgoHours` and `endAgoHours`
   * the main p50 ramps from `baseline - 30` to `endP50`, then snaps back.
   * Emulates e.g. connection-pool degradation leading into a deploy.
   */
  readonly latencyDrift?: {
    readonly startAgoHours: number;
    readonly endAgoHours: number;
    readonly endP50: number;
  };
  readonly blips: readonly Blip[];
  readonly subChecks?: Readonly<Record<string, SubCheckStoryline>>;
}

/**
 * One storyline per service. Adding / tweaking a dev scenario is a one-
 * dict edit — no bucket-math changes needed; `generateBuckets` folds the
 * storyline into either fine / hourly / daily buckets identically.
 */
const STORYLINES: readonly ServiceStoryline[] = [
  {
    service: "arolariu.ro",
    baselineP50: 142,
    blips: [
      {
        ageHours: 14 * 24 + 2,
        durationHours: 4,
        status: "Degraded",
        reason: "CDN cache purge cascaded origin load (mock)",
        latencyFactor: 2.6,
        probeCount: 8,
      },
    ],
  },
  {
    service: "api.arolariu.ro",
    baselineP50: 310,
    // Latency creep: from (4d + 14d) ago to 4d ago — p50 ramps 280 → 450.
    latencyDrift: {
      startAgoHours: (4 + 14) * 24,
      endAgoHours: 4 * 24,
      endP50: 450,
    },
    blips: [
      {
        ageHours: 26,
        durationHours: 1,
        status: "Degraded",
        reason: "connection pool exhausted (mock)",
        latencyFactor: 4.0,
        probeCount: 2,
      },
      {
        ageHours: 4 * 24,
        durationHours: 2,
        status: "Degraded",
        reason: "connection pool saturation during deploy (mock)",
        latencyFactor: 2.5,
        probeCount: 4,
      },
    ],
    subChecks: {
      mssql: {
        baselineP50: 10,
        cyclicHiccup: {everyNBuckets: 96, atOffset: 48, p50: 600, healthyPerCron: 1},
        blips: [
          {
            ageHours: 26,
            durationHours: 1,
            status: "Degraded",
            reason: "connection pool exhausted (mock)",
            latencyFactor: 84.7,
            probeCount: 2,
          },
        ],
      },
      cosmosdb: {
        baselineP50: 48,
        blips: [
          {
            ageHours: 5 * 24,
            durationHours: 0.5,
            status: "Unhealthy",
            reason: "cosmosdb throttling on partition key (mock)",
            latencyFactor: 15.6,
            probeCount: 1,
          },
        ],
      },
    },
  },
  {
    service: "exp.arolariu.ro",
    baselineP50: 89,
    blips: [
      {
        ageHours: 3,
        durationHours: 3,
        status: "Degraded",
        reason: "elevated latency on upstream dependency (mock)",
        latencyFactor: 3.0,
        probeCount: 6,
        open: true,
      },
      {
        ageHours: 12,
        durationHours: 3,
        status: "Unhealthy",
        reason: "upstream ML model service unreachable (mock)",
        latencyFactor: 8.0,
        probeCount: 6,
      },
    ],
  },
  {
    service: "cv.arolariu.ro",
    baselineP50: 35,
    blips: [
      {
        ageHours: 45 * 24,
        durationHours: 0.5,
        status: "Degraded",
        reason: "Azure Static Web App edge node hiccup (mock)",
        latencyFactor: 3.2,
        probeCount: 1,
      },
    ],
  },
];

/**
 * Derived p99/p75/p95 fan around p50 — matches the old p99 ≈ p50 * 2.1 contract.
 * Ratios picked to roughly track production observations:
 *   p75 ≈ 1.35× p50, p95 ≈ 1.80× p50, p99 ≈ 2.10× p50.
 */
function percentileFan(p50: number): {p50: number; p75: number; p95: number; p99: number} {
  return {
    p50,
    p75: Math.round(p50 * 1.35),
    p95: Math.round(p50 * 1.8),
    p99: Math.round(p50 * 2.1),
  };
}

/**
 * Build one `Bucket` from primitive inputs. `probes.total` is always
 * `SAMPLES_PER_CRON * cronsPerBucket`; `probes.healthy` is
 * `healthyPerCron * cronsPerBucket`. `httpStatus` is set to 503 for
 * `Unhealthy` and 200 otherwise (we don't model 5xx variety in mocks).
 */
function mkBucket(t: string, status: HealthStatus, p50: number, healthyPerCron: number, cronsPerBucket: number): Bucket {
  return {
    t,
    status,
    probes: {
      healthy: healthyPerCron * cronsPerBucket,
      total: SAMPLES_PER_CRON * cronsPerBucket,
    },
    latency: percentileFan(p50),
    httpStatus: status === "Unhealthy" ? 503 : 200,
  };
}

/**
 * Half-open [start, end) test for "does this bucket overlap the blip window".
 * Blips anchored by wall-clock (not bucket index) appear consistently across
 * all three granularities.
 */
function bucketOverlaps(bucketT: number, bucketMs: number, start: number, end: number): boolean {
  return bucketT + bucketMs > start && bucketT < end;
}

/** Start/end wall-clock range (ms) of a blip, computed from `now` and `ageHours`. */
function blipWindow(blip: Blip, now: number): {start: number; end: number} {
  const end = now - blip.ageHours * MS_PER_HOUR + blip.durationHours * MS_PER_HOUR;
  const start = now - blip.ageHours * MS_PER_HOUR;
  return {start, end};
}

/**
 * Compute the effective p50 at a given wall-clock time, accounting for the
 * storyline's optional latency-drift window. Outside the drift window (or
 * when no drift is configured) returns `story.baselineP50`; inside the
 * window ramps linearly from `baseline - 30` to `latencyDrift.endP50`.
 */
function computeP50AtTime(story: ServiceStoryline, bucketT: number, now: number): number {
  /* v8 ignore next */
  if (!story.latencyDrift) return story.baselineP50;
  const creepStart = now - story.latencyDrift.startAgoHours * MS_PER_HOUR;
  const creepEnd = now - story.latencyDrift.endAgoHours * MS_PER_HOUR;
  if (bucketT < creepStart || bucketT > creepEnd) return story.baselineP50;
  const progress = (bucketT - creepStart) / (creepEnd - creepStart);
  return Math.round(story.baselineP50 - 30 + progress * (story.latencyDrift.endP50 - (story.baselineP50 - 30)));
}

/**
 * Generate the full bucket sequence for one series (main or sub-check).
 *
 * For each bucket (walking backwards from `now`), evaluate in order:
 *  1. Is an active blip (non-`open`) overlapping this bucket? → emit a
 *     blip bucket (status = blip.status, p50 scaled by `latencyFactor`).
 *  2. Is this a cyclic-hiccup bucket? → emit a small Degraded spike.
 *  3. Otherwise → emit a Healthy bucket at baseline/drifted p50.
 */
function generateBucketsFor(
  baselineP50: number,
  blips: readonly Blip[],
  cyclicHiccup: SubCheckStoryline["cyclicHiccup"] | undefined,
  driftForMainP50: ((bucketT: number) => number) | null,
  config: GranularityConfig,
  now: number,
): Bucket[] {
  const total = config.bucketCount;
  // Ongoing blips (`open: true`) drive the incident log but do NOT rewrite
  // history into the bucket series — they're near-now events whose health
  // state hasn't settled yet. Pre-rewrite behavior preserved exactly.
  const bucketBlips = blips.filter((b) => !b.open);
  const windows = bucketBlips.map((blip) => ({blip, ...blipWindow(blip, now)}));

  return Array.from({length: total}, (_, fromEnd) => {
    const bucketT = now - fromEnd * config.bucketMs;
    const t = new Date(bucketT).toISOString();

    const activeBlip = windows.find((w) => bucketOverlaps(bucketT, config.bucketMs, w.start, w.end));

    const p50 = driftForMainP50 ? driftForMainP50(bucketT) : baselineP50;

    if (activeBlip) {
      /* v8 ignore next */
      const factor = activeBlip.blip.latencyFactor ?? (activeBlip.blip.status === "Unhealthy" ? 8.0 : 3.2);
      const healthyPerCron = activeBlip.blip.status === "Unhealthy" ? 0 : 2;
      return mkBucket(t, activeBlip.blip.status, Math.round(p50 * factor), healthyPerCron, config.cronsPerBucket);
    }

    /* v8 ignore next */
    if (cyclicHiccup && fromEnd % cyclicHiccup.everyNBuckets === cyclicHiccup.atOffset) {
      return mkBucket(t, "Degraded", cyclicHiccup.p50, cyclicHiccup.healthyPerCron, config.cronsPerBucket);
    }

    return mkBucket(t, "Healthy", p50, SAMPLES_PER_CRON, config.cronsPerBucket);
  });
}

/**
 * Fold one storyline into a `ServiceSeries` (main bucket list + optional
 * sub-series map) at the requested granularity.
 */
function generateServiceSeries(story: ServiceStoryline, config: GranularityConfig, now: number): ServiceSeries {
  const mainBuckets = generateBucketsFor(
    story.baselineP50,
    story.blips,
    undefined,
    story.latencyDrift ? (bucketT) => computeP50AtTime(story, bucketT, now) : null,
    config,
    now,
  );

  let subSeriesObj: Record<string, readonly Bucket[]> | null = null;
  if (story.subChecks) {
    subSeriesObj = {};
    for (const [name, sub] of Object.entries(story.subChecks)) {
      subSeriesObj[name] = generateBucketsFor(sub.baselineP50, sub.blips, sub.cyclicHiccup, null, config, now);
    }
  }

  const series: ServiceSeries = {
    service: story.service,
    buckets: mainBuckets,
    ...(subSeriesObj ? {subSeries: subSeriesObj} : {}),
  };

  return series;
}

/**
 * Build a full mock `AggregateFile` for the requested granularity by folding
 * every storyline into its bucket series. Relative to `Date.now()`, so the
 * produced timestamps always feel "recent" regardless of when dev started.
 */
export function generateMockAggregate(granularity: Granularity): AggregateFile {
  const now = Date.now();
  const config = CONFIGS[granularity];
  const services: ServiceSeries[] = STORYLINES.map((story) => generateServiceSeries(story, config, now));

  // Intentionally construct via explicit discriminated-union literal so TS
  // verifies the (bucketSize, windowDays) pair is valid.
  const generatedAt = new Date(now).toISOString();
  switch (granularity) {
    case "fine":
      return {generatedAt, bucketSize: "30m", windowDays: 14, services};
    case "hourly":
      return {generatedAt, bucketSize: "1h", windowDays: 90, services};
    case "daily":
      return {generatedAt, bucketSize: "1d", windowDays: 365, services};
  }
}

/**
 * Convert a blip to its corresponding `Incident`. Open blips become
 * `{status: "open"}` incidents (no `resolvedAt` / `durationMs`); past blips
 * become `{status: "resolved"}` incidents with those fields computed from
 * the blip duration.
 */
function blipToIncident(story: ServiceStoryline, blip: Blip, subCheck: string | undefined, index: number, now: number): Incident {
  const startedAt = new Date(now - blip.ageHours * MS_PER_HOUR).toISOString();
  const severity = blip.status;
  const common = {
    id: `inc-${String(index).padStart(3, "0")}`,
    service: story.service,
    severity,
    startedAt,
    reason: blip.reason,
    probeCount: blip.probeCount,
    ...(subCheck !== undefined ? {subCheck} : {}),
  };
  if (blip.open) {
    return {...common, status: "open"};
  }
  const resolvedAt = new Date(now - blip.ageHours * MS_PER_HOUR + blip.durationHours * MS_PER_HOUR).toISOString();
  return {
    ...common,
    status: "resolved",
    resolvedAt,
    durationMs: blip.durationHours * MS_PER_HOUR,
  };
}

/**
 * Build a full mock `IncidentsFile`. Derived directly from the storyline
 * blip lists — one incident per blip (main or sub-check), sorted newest-first
 * (lowest `ageHours` first). Keeps the mock narrative in a single source:
 * editing a blip in `STORYLINES` updates both bucket math and incident log.
 */
export function generateMockIncidents(): IncidentsFile {
  const now = Date.now();

  // Order: open blips first (most recent + still-ongoing), then resolved
  // newest-first. Matches the pre-rewrite shipped narrative closely.
  const entries: Array<{story: ServiceStoryline; blip: Blip; subCheck?: string; age: number}> = [];
  for (const story of STORYLINES) {
    for (const blip of story.blips) {
      entries.push({story, blip, age: blip.ageHours});
    }
    if (story.subChecks) {
      for (const [name, sub] of Object.entries(story.subChecks)) {
        for (const blip of sub.blips) {
          entries.push({story, blip, subCheck: name, age: blip.ageHours});
        }
      }
    }
  }

  // Newest first (lowest ageHours first).
  entries.sort((a, b) => a.age - b.age);

  const incidents: Incident[] = entries.map((e, i) => blipToIncident(e.story, e.blip, e.subCheck, i + 1, now));

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
