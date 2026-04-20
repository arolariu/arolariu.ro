import type {HealthStatus} from "../../src/lib/types/status";

/**
 * Reconciles a body-reported health status against the HTTP status code.
 *
 * If the server body claims "Healthy" but the HTTP response carries a 5xx
 * status, we treat that as a genuine outage (the transport layer already
 * failed, regardless of what the application wrote into the payload).
 *
 * Returns the adjusted status, along with an optional error string to propagate.
 */
export function reconcileBodyVsHttp(
  bodyStatus: HealthStatus,
  httpStatus: number,
): {status: HealthStatus; error?: string} {
  if (bodyStatus === "Healthy" && httpStatus >= 500) {
    return {status: "Unhealthy", error: `HTTP ${httpStatus}`};
  }
  return {status: bodyStatus};
}
