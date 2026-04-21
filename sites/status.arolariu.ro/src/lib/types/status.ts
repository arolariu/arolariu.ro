/**
 * Canonical domain model for the status page.
 *
 * This module is the single source of truth for every shape the UI, probe
 * scripts, aggregator, and cache layer reason about. All downstream modules
 * (guards, aggregation, api, components) import their types from here — no
 * re-declared or parallel type definitions are permitted.
 *
 * Invariants captured at the type level:
 *  - `ServiceId` is a closed union (compile-time guard against unknown services).
 *  - `AggregateFile` is discriminated on the `(bucketSize, windowDays)` pair
 *    so only the three valid pairings compile.
 *  - `Incident` is discriminated on `status`; the `resolved` variant
 *    strictly requires `resolvedAt` + `durationMs`.
 *  - `WINDOW_CONFIGS` drives everything a UI component needs to know about
 *    a filter window — duration, granularity to read from, and chart suitability.
 */

/**
 * The fixed set of services the status page monitors. Any new hostname
 * must be added here (plus `SERVICE_IDS`, `SERVICE_DISPLAY_ORDER`, and
 * the probe configuration) to become representable.
 */
export type ServiceId =
  | "arolariu.ro"
  | "api.arolariu.ro"
  | "exp.arolariu.ro"
  | "cv.arolariu.ro";

/**
 * Runtime list mirror of the `ServiceId` union, used for membership checks
 * in type guards and for iteration at call sites that can't rely on the
 * compile-time union (e.g. schema validation).
 */
export const SERVICE_IDS: readonly ServiceId[] = [
  "arolariu.ro",
  "api.arolariu.ro",
  "exp.arolariu.ro",
  "cv.arolariu.ro",
];

/**
 * Ternary health classification, ordered by severity (Healthy < Degraded < Unhealthy).
 * The ordering is materialized as a lookup in `deriveParentStatus.ts`.
 */
export type HealthStatus = "Healthy" | "Degraded" | "Unhealthy";

/**
 * A single sub-check result on a service probe (e.g. `mssql`, `cosmosdb`).
 * Sub-checks are named components of a service's health profile, each with
 * its own latency and status; they roll up into the overall service status.
 */
export interface SubCheck {
  /** Sub-check identifier (matches the probe's reported `name`). */
  readonly name: string;
  /** Sub-check health status contributing to the service overall status. */
  readonly status: HealthStatus;
  /**
   * Representative sub-check execution time in milliseconds. When
   * `sampleDurationsMs` is populated this is the worst sample's duration
   * (aligned with how `overall` picks worst-sample status); when absent
   * (legacy single-sample probes) it is simply the probe's only measurement.
   */
  readonly durationMs: number;
  /** Optional human-readable message when degraded or unhealthy. */
  readonly description?: string;
  /**
   * Per-sample sub-check durations in milliseconds for this probe run.
   * Present when the probe took multiple samples (current 10-sample-per-cron
   * regime). Bucket-level percentile math MUST prefer this over `durationMs`
   * when available — one `durationMs` per bucket collapses p50/p75/p95/p99
   * to the same value.
   */
  readonly sampleDurationsMs?: readonly number[];
}

/**
 * A single cron-run probe result for a service. Emitted by `scripts/probe.ts`
 * and aggregated into bucketed `ServiceSeries`. `latencyMs` is the median
 * across the run's samples; `sampleCount` disambiguates legacy single-shot
 * probes from the current 10-sample-per-cron regime.
 */
export interface ProbeResult {
  readonly service: ServiceId;
  /** ISO-8601 timestamp of the probe (cron-run start time). */
  readonly timestamp: string;
  /** Aggregated latency (median across samples) in milliseconds. */
  readonly latencyMs: number;
  /** Representative HTTP status code from the probe run. */
  readonly httpStatus: number;
  /** Rolled-up health verdict combining HTTP status + sub-check results. */
  readonly overall: HealthStatus;
  readonly subChecks?: readonly SubCheck[];
  /** Error message when the probe could not complete (network, timeout, etc). */
  readonly error?: string;
  /** Number of HTTP samples aggregated into this result. Defaults to 1 when absent (legacy). */
  readonly sampleCount?: number;
  /**
   * Raw per-sample latencies in milliseconds (one entry per HTTP sample
   * taken in this cron run), preserved so bucket-level percentile math has
   * a real distribution to work on instead of a single median. Absent on
   * legacy single-sample rows. Consumers computing percentiles MUST prefer
   * this when present and fall back to `[latencyMs]` otherwise.
   */
  readonly sampleLatenciesMs?: readonly number[];
}

/**
 * The three supported bucket sizes. Each maps one-to-one with a window length
 * in `AggregateWindow` — picking a bucketSize picks its windowDays.
 */
export type BucketSize = "30m" | "1h" | "1d";

/** BucketSize → millisecond duration. Used for x-axis math, tooltip spans,
 *  and "minutes per bucket" readouts. Single source of truth — any place
 *  that needs to convert a BucketSize to a duration must use this map. */
export const BUCKET_SIZE_TO_MS: Record<BucketSize, number> = {
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

/**
 * Minimal snapshot of a sub-check attached to a bucket — what the UI needs
 * to label "worst sub-check" tooltips without loading the full probe history.
 */
export interface SubCheckSummary {
  readonly name: string;
  readonly status: HealthStatus;
  readonly description?: string;
}

/**
 * One aggregated time bucket for a single service.
 *
 * A bucket summarizes some number of probe runs over its time span. Its
 * `status` is derived from the worst probe contained, `probes.healthy` is
 * the count of probe runs that returned Healthy, and the latency object
 * carries percentile statistics.
 */
export interface Bucket {
  /** ISO-8601 timestamp marking the start of the bucket's span. */
  readonly t: string;
  /** Rolled-up health status for the bucket (worst-of its probes). */
  readonly status: HealthStatus;
  /** Probe-run counts. Invariant: `healthy <= total`, both non-negative. */
  readonly probes: {readonly healthy: number; readonly total: number};
  /**
   * Latency percentiles. `p50` and `p99` are required for every bucket
   * (stable contract since v1). `p75` and `p95` are additive: emitted by
   * aggregate runs from 2026-04 onward, absent on buckets retained from
   * earlier runs. Consumers MUST treat missing values as `undefined` and
   * fall back to the p50/p99 look.
   */
  readonly latency: {
    readonly p50: number;
    readonly p75?: number;
    readonly p95?: number;
    readonly p99: number;
  };
  /** Representative HTTP status code for the bucket (usually the last probe). */
  readonly httpStatus?: number;
  /** Optional worst sub-check summary carried through for tooltip rendering. */
  readonly worstSubCheck?: SubCheckSummary;
  /**
   * Total time span (ms) this bucket covers. For base buckets this equals the
   * bucketSize (30m/1h/1d). When buckets are merged (e.g. downsampled in
   * UptimeBar), this represents the combined span so consumers can render the
   * accurate end-of-range without needing the original bucketSize.
   */
  readonly spanMs?: number;
}

/**
 * Full time-series for one service: a main bucket list plus optional
 * named sub-series (one bucket list per sub-check).
 *
 * Invariant (enforced by the aggregator & preserved by sliceWindow):
 * buckets are sorted ascending by timestamp, so `buckets[length - 1]` is
 * always the most recent.
 */
export interface ServiceSeries {
  readonly service: ServiceId;
  readonly buckets: readonly Bucket[];
  readonly subSeries?: Record<string, readonly Bucket[]>;
}

/**
 * AggregateFile is discriminated on the (bucketSize, windowDays) pair.
 * Only three pairs are valid; the union makes invalid combinations
 * unrepresentable at the type level.
 */
export type AggregateWindow =
  | {readonly bucketSize: "30m"; readonly windowDays: 14}
  | {readonly bucketSize: "1h"; readonly windowDays: 90}
  | {readonly bucketSize: "1d"; readonly windowDays: 365};

/**
 * Full file written to `status-data/data/{fine|hourly|daily}.json`. One per
 * granularity, each carrying the same four services with their bucketed
 * time-series at that granularity.
 */
export type AggregateFile = {
  /** ISO-8601 wall-clock time the aggregate was produced. */
  readonly generatedAt: string;
  readonly services: readonly ServiceSeries[];
} & AggregateWindow;

/** Whether an incident is still active or has been resolved. */
export type IncidentStatus = "open" | "resolved";

/** Severity level of an incident (Healthy is never an incident). */
export type IncidentSeverity = "Degraded" | "Unhealthy";

/** Fields shared by both open and resolved incidents. */
interface IncidentCommon {
  /** Stable incident identifier (e.g. `inc-042`). */
  readonly id: string;
  readonly service: ServiceId;
  /** Optional sub-check name when the incident is scoped to a sub-check. */
  readonly subCheck?: string;
  /** ISO-8601 time the incident started. */
  readonly startedAt: string;
  readonly severity: IncidentSeverity;
  /** Short human-readable summary of the cause. */
  readonly reason: string;
  /** Number of probe samples observed while in the degraded/unhealthy state. */
  readonly probeCount: number;
}

/**
 * Incident is discriminated on `status`. When resolved, `resolvedAt` and
 * `durationMs` are required (not optional) — the type narrows those in
 * `if (inc.status === "resolved") { … }` branches.
 */
export type Incident =
  | (IncidentCommon & {readonly status: "open"})
  | (IncidentCommon & {
      readonly status: "resolved";
      readonly resolvedAt: string;
      readonly durationMs: number;
    });

/**
 * Full file written to `status-data/data/incidents.json`. A flat list of
 * incidents across all services (both open and resolved), newest-first.
 */
export interface IncidentsFile {
  readonly generatedAt: string;
  readonly incidents: readonly Incident[];
}

/**
 * UI filter window options. The keys of `WINDOW_CONFIGS` — extracted as a
 * union here so individual components can type their filter prop without
 * referencing the config record.
 */
export type FilterWindow =
  | "1d" | "3d" | "7d" | "14d" | "30d" | "60d" | "90d" | "180d" | "365d";

/**
 * Per-window configuration. Single source of truth for anything the UI / logic
 * needs to know about a given `FilterWindow`:
 *
 * - `days` — duration of the window in days (cutoff math, axis labels).
 * - `granularity` — which aggregate file this window reads from
 *   (`fine` → 30m buckets / 14d file, `hourly` → 1h / 90d, `daily` → 1d / 365d).
 * - `showWeekday` — whether the weekday-uptime chart is meaningful at this
 *   zoom (≥14 days of history; shorter windows are too coarse).
 *
 * Iteration order of the record keys is the UI's canonical filter order
 * (1d → 365d), driving `FILTER_WINDOWS`.
 */
export interface WindowConfig {
  readonly days: number;
  readonly granularity: "fine" | "hourly" | "daily";
  readonly showWeekday: boolean;
}

/**
 * Canonical per-window settings. Windows up to 14d read the 30m-bucket file;
 * 30-90d read the 1h-bucket file; 180-365d read the 1d-bucket file. The
 * `showWeekday` cutoff is at 14d so the weekday-uptime chart always has at
 * least two probes per bar.
 */
export const WINDOW_CONFIGS: Record<FilterWindow, WindowConfig> = {
  "1d":   {days: 1,   granularity: "fine",   showWeekday: false},
  "3d":   {days: 3,   granularity: "fine",   showWeekday: false},
  "7d":   {days: 7,   granularity: "fine",   showWeekday: false},
  "14d":  {days: 14,  granularity: "fine",   showWeekday: true},
  "30d":  {days: 30,  granularity: "hourly", showWeekday: true},
  "60d":  {days: 60,  granularity: "hourly", showWeekday: true},
  "90d":  {days: 90,  granularity: "hourly", showWeekday: true},
  "180d": {days: 180, granularity: "daily",  showWeekday: true},
  "365d": {days: 365, granularity: "daily",  showWeekday: true},
};

/** Canonical filter-window order for UI iteration and keyboard `1..9` jumps. */
export const FILTER_WINDOWS = Object.keys(WINDOW_CONFIGS) as readonly FilterWindow[];
