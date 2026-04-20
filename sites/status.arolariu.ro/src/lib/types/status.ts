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

export interface SubCheckSummary {
  readonly name: string;
  readonly status: HealthStatus;
  readonly description?: string;
}

export interface Bucket {
  readonly t: string;
  readonly status: HealthStatus;
  readonly probes: {readonly healthy: number; readonly total: number};
  readonly latency: {readonly p50: number; readonly p99: number};
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

export const FILTER_WINDOWS: readonly FilterWindow[] = [
  "1d", "3d", "7d", "14d", "30d", "60d", "90d", "180d", "365d",
];

export const WINDOW_TO_GRANULARITY: Record<FilterWindow, "fine" | "hourly" | "daily"> = {
  "1d": "fine", "3d": "fine", "7d": "fine", "14d": "fine",
  "30d": "hourly", "60d": "hourly", "90d": "hourly",
  "180d": "daily", "365d": "daily",
};

export const WINDOW_TO_DAYS: Record<FilterWindow, number> = {
  "1d": 1, "3d": 3, "7d": 7, "14d": 14,
  "30d": 30, "60d": 60, "90d": 90,
  "180d": 180, "365d": 365,
};
