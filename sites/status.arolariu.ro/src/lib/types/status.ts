export type ServiceId =
  | "arolariu.ro"
  | "api.arolariu.ro"
  | "exp.arolariu.ro"
  | "cv.arolariu.ro";

export const SERVICE_IDS: readonly ServiceId[] = [
  "arolariu.ro",
  "api.arolariu.ro",
  "exp.arolariu.ro",
  "cv.arolariu.ro",
];

export type HealthStatus = "Healthy" | "Degraded" | "Unhealthy";

export interface SubCheck {
  readonly name: string;
  readonly status: HealthStatus;
  readonly durationMs: number;
  readonly description?: string;
}

export interface ProbeResult {
  readonly service: ServiceId;
  readonly timestamp: string;
  readonly latencyMs: number;
  readonly httpStatus: number;
  readonly overall: HealthStatus;
  readonly subChecks?: readonly SubCheck[];
  readonly error?: string;
  /** Number of HTTP samples aggregated into this result. Defaults to 1 when absent (legacy). */
  readonly sampleCount?: number;
}

export type BucketSize = "30m" | "1h" | "1d";

/** BucketSize → millisecond duration. Used for x-axis math, tooltip spans,
 *  and "minutes per bucket" readouts. Single source of truth — any place
 *  that needs to convert a BucketSize to a duration must use this map. */
export const BUCKET_SIZE_TO_MS: Record<BucketSize, number> = {
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

export interface SubCheckSummary {
  readonly name: string;
  readonly status: HealthStatus;
  readonly description?: string;
}

export interface Bucket {
  readonly t: string;
  readonly status: HealthStatus;
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
  readonly httpStatus?: number;
  readonly worstSubCheck?: SubCheckSummary;
  /**
   * Total time span (ms) this bucket covers. For base buckets this equals the
   * bucketSize (30m/1h/1d). When buckets are merged (e.g. downsampled in
   * UptimeBar), this represents the combined span so consumers can render the
   * accurate end-of-range without needing the original bucketSize.
   */
  readonly spanMs?: number;
}

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

export type AggregateFile = {
  readonly generatedAt: string;
  readonly services: readonly ServiceSeries[];
} & AggregateWindow;

export type IncidentStatus = "open" | "resolved";
export type IncidentSeverity = "Degraded" | "Unhealthy";

interface IncidentCommon {
  readonly id: string;
  readonly service: ServiceId;
  readonly subCheck?: string;
  readonly startedAt: string;
  readonly severity: IncidentSeverity;
  readonly reason: string;
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

export interface IncidentsFile {
  readonly generatedAt: string;
  readonly incidents: readonly Incident[];
}

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
