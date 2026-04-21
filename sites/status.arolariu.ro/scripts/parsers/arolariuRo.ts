/**
 * Parser for the main Next.js site (`arolariu.ro`). Health is reported via
 * `/api/health` as `{status: "Healthy" | "Degraded" | "Unhealthy"}`; no
 * sub-checks are exposed.
 *
 * This module also owns the shared `RawResponse`/`ProbeContext` shapes
 * because it was the first parser written — the other parsers re-import
 * them from here rather than a dedicated types module.
 */
import type {HealthStatus, ProbeResult} from "../../src/lib/types/status";
import {reconcileBodyVsHttp} from "./shared";

/**
 * Normalised shape of a single HTTP probe response handed to every parser.
 * `status: 0` is the convention for transport failure (DNS, connect,
 * timeout, parse error) — parsers treat it as Unhealthy regardless of
 * body.
 */
export interface RawResponse {
  /** HTTP status code, or `0` when the fetch itself failed. */
  readonly status: number;
  /** Already-parsed JSON body, or `null` when the service is not configured to parse bodies / parse failed. */
  readonly body: unknown;
  /** Transport-level error message; populated only when `status === 0`. */
  readonly error?: string;
}

/**
 * Probe-invariant context threaded through every parser so the
 * synthesized `ProbeResult` can inherit the probe's wall-clock timestamp
 * and measured latency without the parser needing its own clock.
 */
export interface ProbeContext {
  /** ISO timestamp of when the probe batch started. */
  readonly timestamp: string;
  /** Measured round-trip latency of the sample in ms. */
  readonly latencyMs: number;
}

/**
 * Lenient body→HealthStatus coercion: accepts the three exact strings,
 * falls back to `"Degraded"` for any other string (service is reachable
 * but speaking an unexpected dialect), returns `null` when the body has
 * no usable `status` field at all.
 */
function coerceOverallFromBody(body: unknown): HealthStatus | null {
  if (body && typeof body === "object" && "status" in body) {
    const s = (body as {status: unknown}).status;
    if (s === "Healthy" || s === "Degraded" || s === "Unhealthy") return s;
    if (typeof s === "string") return "Degraded";
  }
  return null;
}

/**
 * Parse a response from `https://arolariu.ro/api/health` into a
 * `ProbeResult`. Decision order:
 *   1. `status === 0` → Unhealthy transport error.
 *   2. Body reports a recognisable status → reconcile against HTTP code.
 *   3. 2xx but unrecognised body → Degraded ("unrecognized response shape").
 *   4. Anything else → Unhealthy with `HTTP <status>` reason.
 */
export function parseArolariuRo(raw: RawResponse, ctx: ProbeContext): ProbeResult {
  const {status, body, error} = raw;
  const base = {
    service: "arolariu.ro" as const,
    timestamp: ctx.timestamp,
    latencyMs: ctx.latencyMs,
    httpStatus: status,
  };

  if (status === 0) {
    return {...base, overall: "Unhealthy", error: error ?? "transport error"};
  }

  const bodyStatus = coerceOverallFromBody(body);
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
