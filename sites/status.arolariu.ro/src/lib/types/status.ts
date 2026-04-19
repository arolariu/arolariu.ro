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
}

export interface ServiceSeries {
  readonly service: ServiceId;
  readonly buckets: readonly Bucket[];
  readonly subSeries?: Record<string, readonly Bucket[]>;
}

export interface AggregateFile {
  readonly generatedAt: string;
  readonly bucketSize: BucketSize;
  readonly windowDays: 14 | 90 | 365;
  readonly services: readonly ServiceSeries[];
}

export type IncidentStatus = "open" | "resolved";
export type IncidentSeverity = "Degraded" | "Unhealthy";

export interface Incident {
  readonly id: string;
  readonly service: ServiceId;
  readonly subCheck?: string;
  readonly status: IncidentStatus;
  readonly startedAt: string;
  readonly resolvedAt?: string;
  readonly durationMs?: number;
  readonly severity: IncidentSeverity;
  readonly reason: string;
  readonly probeCount: number;
}

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
