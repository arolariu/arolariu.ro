/**
 * Parser for the FastAPI experimental service at `exp.arolariu.ro`. The
 * endpoint follows a similar `{status}` convention to the main site, with
 * one extra value: `"NotReady"` (emitted during warmup/cold-start) maps
 * to `Unhealthy` rather than `Degraded` — a NotReady instance cannot
 * serve traffic.
 */
import type {HealthStatus, ProbeResult} from "../../src/lib/types/status";
import type {ProbeContext, RawResponse} from "./arolariuRo";
import {reconcileBodyVsHttp} from "./shared";

/**
 * Body→HealthStatus coercion specific to `exp.arolariu.ro`:
 *   - `Healthy`/`Degraded`/`Unhealthy` pass through.
 *   - `NotReady` → `Unhealthy` (FastAPI startup/shutdown signal).
 *   - Any other string → `Degraded` (reachable but unexpected dialect).
 *   - Missing `status` field → `null` (caller falls back to HTTP code).
 */
function coerceOverall(body: unknown): HealthStatus | null {
  if (body && typeof body === "object" && "status" in body) {
    const s = (body as {status: unknown}).status;
    if (s === "Healthy") return "Healthy";
    if (s === "Degraded") return "Degraded";
    if (s === "Unhealthy" || s === "NotReady") return "Unhealthy";
    if (typeof s === "string") return "Degraded";
  }
  return null;
}

/**
 * Parse a response from `https://exp.arolariu.ro/api/health` into a
 * `ProbeResult`. Same decision flow as {@link parseArolariuRo} but uses
 * the `NotReady`-aware coercion above.
 */
export function parseExpArolariuRo(raw: RawResponse, ctx: ProbeContext): ProbeResult {
  const {status, body, error} = raw;
  const base = {
    service: "exp.arolariu.ro" as const,
    timestamp: ctx.timestamp,
    latencyMs: ctx.latencyMs,
    httpStatus: status,
  };

  if (status === 0) {
    return {...base, overall: "Unhealthy", error: error ?? "transport error"};
  }

  const bodyStatus = coerceOverall(body);
  if (bodyStatus !== null) {
    const {status: overall, error: overrideError} = reconcileBodyVsHttp(bodyStatus, status);
    return overrideError
      ? {...base, overall, error: overrideError}
      : {...base, overall};
  }

  if (status >= 200 && status < 300) {
    return {...base, overall: "Degraded", error: "unrecognized response shape"};
  }
  return {...base, overall: "Unhealthy", error: `HTTP ${status}`};
}
