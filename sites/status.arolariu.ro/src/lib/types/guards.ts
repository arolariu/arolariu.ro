/**
 * Runtime type guards for the status domain model. Every network read
 * (cache or fetch) passes through one of the `isAggregateFile` /
 * `isIncidentsFile` predicates — a schema mismatch throws
 * `StatusDataError` in `fetchStatusData.ts`, keeping bad data from ever
 * reaching a component's reactive state.
 *
 * Each predicate is a conservative "accept only what we can consume"
 * validator: optional fields are checked when present, additive fields
 * tolerate missing values. Additions to the domain model that happen on
 * the aggregator side must be mirrored here, or older UI bundles will
 * reject the newer JSON until they're redeployed.
 */

import {
  SERVICE_IDS,
  type AggregateFile,
  type Bucket,
  type HealthStatus,
  type Incident,
  type IncidentsFile,
  type ProbeResult,
  type ServiceId,
  type ServiceSeries,
  type SubCheck,
} from "./status";

type SubCheckCandidate = Partial<Record<keyof SubCheck, unknown>>;
type ProbeResultCandidate = Partial<Record<keyof ProbeResult, unknown>>;
type BucketCandidate = Partial<Record<keyof Bucket, unknown>>;
type ServiceSeriesCandidate = Partial<Record<keyof ServiceSeries, unknown>>;
type IncidentsFileCandidate = Partial<Record<keyof IncidentsFile, unknown>>;
type AggregateFileCandidate = Partial<Record<keyof AggregateFile, unknown>>;

interface ProbeCountsCandidate {
  readonly healthy?: unknown;
  readonly total?: unknown;
}

interface LatencyCandidate {
  readonly p50?: unknown;
  readonly p75?: unknown;
  readonly p95?: unknown;
  readonly p99?: unknown;
}

interface WorstSubCheckCandidate {
  readonly name?: unknown;
  readonly status?: unknown;
  readonly description?: unknown;
}

interface IncidentCandidate {
  readonly id?: unknown;
  readonly service?: unknown;
  readonly subCheck?: unknown;
  readonly status?: unknown;
  readonly startedAt?: unknown;
  readonly severity?: unknown;
  readonly reason?: unknown;
  readonly probeCount?: unknown;
  readonly resolvedAt?: unknown;
  readonly durationMs?: unknown;
}

/** True when `value` is a plain object (not an array, not `null`). */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True when `value` is a finite, non-negative number. */
function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isOptionalNumberArray(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.every(isNonNegativeNumber));
}

function hasValidProbeCounts(value: unknown): value is ProbeCountsCandidate {
  if (!isObject(value)) return false;
  const candidate = value as ProbeCountsCandidate;
  return (
    isNonNegativeNumber(candidate.healthy) &&
    isNonNegativeNumber(candidate.total) &&
    candidate.healthy <= candidate.total
  );
}

function hasValidLatency(value: unknown): value is LatencyCandidate {
  if (!isObject(value)) return false;
  const candidate = value as LatencyCandidate;
  return (
    isNonNegativeNumber(candidate.p50) &&
    isNonNegativeNumber(candidate.p99) &&
    candidate.p50 <= candidate.p99 &&
    (candidate.p75 === undefined || isNonNegativeNumber(candidate.p75)) &&
    (candidate.p95 === undefined || isNonNegativeNumber(candidate.p95))
  );
}

/** Guard for the `HealthStatus` union. */
export function isHealthStatus(value: unknown): value is HealthStatus {
  return value === "Healthy" || value === "Degraded" || value === "Unhealthy";
}

function isWorstSubCheck(value: unknown): value is WorstSubCheckCandidate {
  if (!isObject(value)) return false;
  const candidate = value as WorstSubCheckCandidate;
  return typeof candidate.name === "string" && isHealthStatus(candidate.status) && isOptionalString(candidate.description);
}

/** Guard for a known `ServiceId`. Strings outside the union are rejected. */
export function isServiceId(value: unknown): value is ServiceId {
  return typeof value === "string" && (SERVICE_IDS as readonly string[]).includes(value);
}

/** Validates a sub-check shape: required name/status/durationMs, optional description/sampleDurationsMs. */
export function isSubCheck(value: unknown): value is SubCheck {
  if (!isObject(value)) return false;
  const candidate = value as SubCheckCandidate;
  const {name, status, durationMs, description, sampleDurationsMs} = candidate;
  return (
    typeof name === "string" &&
    isHealthStatus(status) &&
    isNonNegativeNumber(durationMs) &&
    isOptionalString(description) &&
    isOptionalNumberArray(sampleDurationsMs)
  );
}

/**
 * Validates a probe result. Accepts legacy shape (no `sampleCount`) and the
 * current multi-sample shape (`sampleCount >= 1`). `subChecks`, when present,
 * must be an array of valid sub-checks — one bad entry rejects the whole probe.
 */
export function isProbeResult(value: unknown): value is ProbeResult {
  if (!isObject(value)) return false;
  const candidate = value as ProbeResultCandidate;
  const {service, timestamp, latencyMs, httpStatus, overall, error, subChecks, sampleCount, sampleLatenciesMs} = candidate;

  return (
    isServiceId(service) &&
    typeof timestamp === "string" &&
    isNonNegativeNumber(latencyMs) &&
    isNonNegativeNumber(httpStatus) &&
    isHealthStatus(overall) &&
    isOptionalString(error) &&
    (subChecks === undefined || (Array.isArray(subChecks) && subChecks.every(isSubCheck))) &&
    (sampleCount === undefined || (typeof sampleCount === "number" && Number.isFinite(sampleCount) && sampleCount >= 1)) &&
    isOptionalNumberArray(sampleLatenciesMs)
  );
}

/**
 * Validates a Bucket. Enforces invariants at the validation layer:
 *  - `probes.healthy <= probes.total` (sane probe counts)
 *  - `latency.p50 <= latency.p99` (monotonic percentiles)
 *  - Additive `p75` / `p95` accepted when absent (legacy buckets),
 *    validated as finite non-negative numbers when present.
 *  - Optional `worstSubCheck` shape matches `SubCheckSummary` when carried.
 */
export function isBucket(value: unknown): value is Bucket {
  if (!isObject(value)) return false;
  const candidate = value as BucketCandidate;
  const {t: timestamp, status, probes, latency, httpStatus, worstSubCheck} = candidate;

  return (
    typeof timestamp === "string" &&
    isHealthStatus(status) &&
    hasValidProbeCounts(probes) &&
    hasValidLatency(latency) &&
    (httpStatus === undefined || isNonNegativeNumber(httpStatus)) &&
    (worstSubCheck === undefined || isWorstSubCheck(worstSubCheck))
  );
}

/** Validates a single service's series, including optional sub-series map. */
export function isServiceSeries(value: unknown): value is ServiceSeries {
  if (!isObject(value)) return false;
  const candidate = value as ServiceSeriesCandidate;
  const {service, buckets, subSeries} = candidate;

  if (!isServiceId(service)) return false;
  if (!Array.isArray(buckets) || !buckets.every(isBucket)) return false;
  if (subSeries === undefined) return true;
  if (!isObject(subSeries)) return false;

  for (const series of Object.values(subSeries)) {
    if (!Array.isArray(series) || !series.every(isBucket)) return false;
  }
  return true;
}

/**
 * Allowed (bucketSize, windowDays) pairings for an AggregateFile. Any other
 * combination is rejected — this is the runtime counterpart to the
 * `AggregateWindow` discriminated union in `status.ts`.
 */
const VALID_AGGREGATE_PAIRS: ReadonlyMap<string, 14 | 90 | 365> = new Map([
  ["30m", 14],
  ["1h", 90],
  ["1d", 365],
]);

/**
 * Validates a full aggregate file. Ensures the bucketSize/windowDays pair
 * is one of the three canonical combinations (reject mismatched pairs) and
 * that every service's series passes `isServiceSeries`.
 */
export function isAggregateFile(value: unknown): value is AggregateFile {
  if (!isObject(value)) return false;
  const candidate = value as AggregateFileCandidate;
  const {generatedAt, bucketSize, windowDays, services} = candidate;
  if (typeof generatedAt !== "string") return false;
  if (typeof bucketSize !== "string") return false;
  const expectedWindowDays = VALID_AGGREGATE_PAIRS.get(bucketSize);
  // Unknown bucketSize.
  if (expectedWindowDays === undefined) return false;
  // Mismatched pair.
  if (windowDays !== expectedWindowDays) return false;
  return Array.isArray(services) && services.every(isServiceSeries);
}

/**
 * Validates an incident record. Discriminates on `status`:
 *  - `open` incidents must NOT carry `resolvedAt` / `durationMs`.
 *  - `resolved` incidents MUST carry both (`resolvedAt` as ISO-8601 string,
 *    `durationMs` as non-negative number).
 *  - Any other `status` value is rejected.
 */
export function isIncident(value: unknown): value is Incident {
  if (!isObject(value)) return false;
  const candidate = value as IncidentCandidate;
  const {id, service, subCheck, startedAt, severity, reason, probeCount, status, resolvedAt, durationMs} = candidate;

  if (typeof id !== "string") return false;
  if (!isServiceId(service)) return false;
  if (subCheck !== undefined && typeof subCheck !== "string") return false;
  if (typeof startedAt !== "string") return false;
  if (severity !== "Degraded" && severity !== "Unhealthy") return false;
  if (typeof reason !== "string") return false;
  if (!isNonNegativeNumber(probeCount)) return false;

  // Discriminated on status: open incidents must NOT carry resolvedAt/durationMs;
  // Resolved incidents MUST carry both.
  if (status === "open") {
    return resolvedAt === undefined && durationMs === undefined;
  }

  if (status === "resolved") {
    return typeof resolvedAt === "string" && isNonNegativeNumber(durationMs);
  }

  return false;
}

/** Validates the top-level incidents file (generatedAt + array of incidents). */
export function isIncidentsFile(value: unknown): value is IncidentsFile {
  if (!isObject(value)) return false;
  const candidate = value as IncidentsFileCandidate;
  return typeof candidate.generatedAt === "string" && Array.isArray(candidate.incidents) && candidate.incidents.every(isIncident);
}
