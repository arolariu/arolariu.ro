import {
  SERVICE_IDS, type AggregateFile, type Bucket, type HealthStatus,
  type Incident, type IncidentsFile, type ProbeResult, type ServiceId,
  type ServiceSeries, type SubCheck,
} from "./status";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonNegativeNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

export function isHealthStatus(v: unknown): v is HealthStatus {
  return v === "Healthy" || v === "Degraded" || v === "Unhealthy";
}

export function isServiceId(v: unknown): v is ServiceId {
  return typeof v === "string" && (SERVICE_IDS as readonly string[]).includes(v);
}

export function isSubCheck(v: unknown): v is SubCheck {
  if (!isObject(v)) return false;
  if (typeof v["name"] !== "string") return false;
  if (!isHealthStatus(v["status"])) return false;
  if (!isNonNegativeNumber(v["durationMs"])) return false;
  if (v["description"] !== undefined && typeof v["description"] !== "string") return false;
  return true;
}

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
  return true;
}

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

const VALID_AGGREGATE_PAIRS: ReadonlyMap<string, 14 | 90 | 365> = new Map([
  ["30m", 14],
  ["1h", 90],
  ["1d", 365],
]);

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

export function isIncidentsFile(v: unknown): v is IncidentsFile {
  if (!isObject(v)) return false;
  if (typeof v["generatedAt"] !== "string") return false;
  if (!Array.isArray(v["incidents"])) return false;
  if (!v["incidents"].every(isIncident)) return false;
  return true;
}
