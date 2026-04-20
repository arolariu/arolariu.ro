/**
 * Parser for the SvelteKit CV site at `cv.arolariu.ro`. The site is a
 * static/SSR page with no dedicated health endpoint, so we probe the
 * root and derive health purely from the HTTP status class:
 *   2xx/3xx → Healthy, 4xx → Degraded, 5xx → Unhealthy.
 *
 * Redirects (2xx/3xx) count as Healthy because Azure Static Web Apps
 * canonicalises hostnames and trailing slashes via 301s.
 */
import type {ProbeResult} from "../../src/lib/types/status";
import type {ProbeContext, RawResponse} from "./arolariuRo";

/**
 * Parse a root-page fetch of `https://cv.arolariu.ro/` into a
 * `ProbeResult`. Body is ignored — the service config sets
 * `parseBody: false` so `raw.body` is always `null` here.
 */
export function parseCvArolariuRo(raw: RawResponse, ctx: ProbeContext): ProbeResult {
  const {status, error} = raw;
  const base = {
    service: "cv.arolariu.ro" as const,
    timestamp: ctx.timestamp,
    latencyMs: ctx.latencyMs,
    httpStatus: status,
  };

  if (status === 0) {
    return {...base, overall: "Unhealthy", error: error ?? "transport error"};
  }
  if (status >= 200 && status < 400) {
    return {...base, overall: "Healthy"};
  }
  if (status >= 400 && status < 500) {
    return {...base, overall: "Degraded", error: `HTTP ${status}`};
  }
  return {...base, overall: "Unhealthy", error: `HTTP ${status}`};
}
