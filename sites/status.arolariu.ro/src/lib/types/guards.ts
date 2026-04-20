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
  SERVICE_IDS, type AggregateFile, type Bucket, type HealthStatus,
  type Incident, type IncidentsFile, type ProbeResult, type ServiceId,
  type ServiceSeries, type SubCheck,
} from "./status";

/** True when `v` is a plain object (not an array, not `null`). */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** True when `v` is a finite, non-negative number. */
function isNonNegativeNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

/** Guard for the `HealthStatus` union. */
export function isHealthStatus(v: unknown): v is HealthStatus {
  return v === "Healthy" || v === "Degraded" || v === "Unhealthy";
}

/** Guard for a known `ServiceId`. Strings outside the union are rejected. */
export function isServiceId(v: unknown): v is ServiceId {
  return typeof v === "string" && (SERVICE_IDS as readonly string[]).includes(v);
}

/** Validates a sub-check shape: required name/status/durationMs, optional description. */
export function isSubCheck(v: unknown): v is SubCheck {
  if (!isObject(v)) return false;
  if (typeof v["name"] !== "string") return false;
  if (!isHealthStatus(v["status"])) return false;
  if (!isNonNegativeNumber(v["durationMs"])) return false;
  if (v["description"] !== undefined && typeof v["description"] !== "string") return false;
  return true;
}

/**
 * Validates a probe result. Accepts legacy shape (no `sampleCount`) and the
 * current multi-sample shape (`sampleCount >= 1`). `subChecks`, when present,
 * must be an array of valid sub-checks — one bad entry rejects the whole probe.
 */
export function isProbeResult(v: unknown): v is ProbeResult {
  if (!isObject(v)) return false;
  if (!isServiceId(v["service"])) return false;
  if (typeof v["timestamp"] !== "string") return false;
  if (!isNonNegativeNumber(v["latencyMs"])) return false;
  if (!isNonNegativeNumber(v["httpStatus"])) return false;
  if (!isHealthStatus(v["overall"])) return false;
  if (v["error"] !== undefined && typeof v["error"] !== "string") return false;
  const subs = v["subChecks"];
  if (subs !== undefined) {
    if (!Array.isArray(subs)) return false;
    if (!subs.every(isSubCheck)) return false;
  }
  if (v["sampleCount"] !== undefined) {
    if (typeof v["sampleCount"] !== "number" || !Number.isFinite(v["sampleCount"]) || v["sampleCount"] < 1) return false;
  }
  return true;
}

/**
 * Validates a Bucket. Enforces invariants at the validation layer:
 *  - `probes.healthy <= probes.total` (sane probe counts)
 *  - `latency.p50 <= latency.p99` (monotonic percentiles)
 *  - Additive `p75` / `p95` accepted when absent (legacy buckets),
 *    validated as finite non-negative numbers when present.
 *  - Optional `worstSubCheck` shape matches `SubCheckSummary` when carried.
 */
export function isBucket(v: unknown): v is Bucket {
  if (!isObject(v)) return false;
  if (typeof v["t"] !== "string") return false;
  if (!isHealthStatus(v["status"])) return false;
  const probes = v["probes"];
  if (!isObject(probes)) return false;
  if (!isNonNegativeNumber(probes["healthy"]) || !isNonNegativeNumber(probes["total"])) return false;
  if (probes["healthy"] > probes["total"]) return false; // invariant
  const latency = v["latency"];
  if (!isObject(latency)) return false;
  if (!isNonNegativeNumber(latency["p50"]) || !isNonNegativeNumber(latency["p99"])) return false;
  if (latency["p50"] > latency["p99"]) return false; // invariant
  // p75 / p95 are additive: accept when absent (legacy buckets),
  // validate as finite non-negative numbers when present.
  if (latency["p75"] !== undefined && !isNonNegativeNumber(latency["p75"])) return false;
  if (latency["p95"] !== undefined && !isNonNegativeNumber(latency["p95"])) return false;
  if (v["httpStatus"] !== undefined && !isNonNegativeNumber(v["httpStatus"])) return false;
  const worst = v["worstSubCheck"];
  if (worst !== undefined) {
    if (!isObject(worst)) return false;
    if (typeof worst["name"] !== "string") return false;
    if (!isHealthStatus(worst["status"])) return false;
    if (worst["description"] !== undefined && typeof worst["description"] !== "string") return false;
  }
  return true;
}

/** Validates a single service's series, including optional sub-series map. */
export function isServiceSeries(v: unknown): v is ServiceSeries {
  if (!isObject(v)) return false;
  if (!isServiceId(v["service"])) return false;
  if (!Array.isArray(v["buckets"])) return false;
  if (!v["buckets"].every(isBucket)) return false;
  const sub = v["subSeries"];
  if (sub !== undefined) {
    if (!isObject(sub)) return false;
    for (const key of Object.keys(sub)) {
      const series = sub[key];
      if (!Array.isArray(series) || !series.every(isBucket)) return false;
    }
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
export function isAggregateFile(v: unknown): v is AggregateFile {
  if (!isObject(v)) return false;
  if (typeof v["generatedAt"] !== "string") return false;
  const bucketSize = v["bucketSize"];
  if (typeof bucketSize !== "string") return false;
  const expectedWindowDays = VALID_AGGREGATE_PAIRS.get(bucketSize);
  if (expectedWindowDays === undefined) return false; // unknown bucketSize
  if (v["windowDays"] !== expectedWindowDays) return false; // mismatched pair
  if (!Array.isArray(v["services"])) return false;
  if (!v["services"].every(isServiceSeries)) return false;
  return true;
}

/**
 * Validates an incident record. Discriminates on `status`:
 *  - `open` incidents must NOT carry `resolvedAt` / `durationMs`.
 *  - `resolved` incidents MUST carry both (`resolvedAt` as ISO-8601 string,
 *    `durationMs` as non-negative number).
 *  - Any other `status` value is rejected.
 */
export function isIncident(v: unknown): v is Incident {
  if (!isObject(v)) return false;
  if (typeof v["id"] !== "string") return false;
  if (!isServiceId(v["service"])) return false;
  if (v["subCheck"] !== undefined && typeof v["subCheck"] !== "string") return false;
  if (typeof v["startedAt"] !== "string") return false;
  if (v["severity"] !== "Degraded" && v["severity"] !== "Unhealthy") return false;
  if (typeof v["reason"] !== "string") return false;
  if (!isNonNegativeNumber(v["probeCount"])) return false;

  // Discriminated on status: open incidents must NOT carry resolvedAt/durationMs;
  // resolved incidents MUST carry both.
  if (v["status"] === "open") {
    if (v["resolvedAt"] !== undefined) return false;
    if (v["durationMs"] !== undefined) return false;
    return true;
  }
  if (v["status"] === "resolved") {
    if (typeof v["resolvedAt"] !== "string") return false;
    if (!isNonNegativeNumber(v["durationMs"])) return false;
    return true;
  }
  return false;
}

/** Validates the top-level incidents file (generatedAt + array of incidents). */
export function isIncidentsFile(v: unknown): v is IncidentsFile {
  if (!isObject(v)) return false;
  if (typeof v["generatedAt"] !== "string") return false;
  if (!Array.isArray(v["incidents"])) return false;
  if (!v["incidents"].every(isIncident)) return false;
  return true;
}
