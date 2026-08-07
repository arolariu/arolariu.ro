import type {ProbeResult} from "../src/lib/types/status.ts";
import {trackKey, type TrackSignal} from "./detectIncidentsCommon.ts";

/**
 * Extract the main-service (`overall`) health signal from a probe result.
 * The reason string prefers `probe.error`, falls back to the first unhealthy
 * sub-check description, and as a last resort includes the HTTP status.
 */
export function serviceSignal(probe: ProbeResult): TrackSignal {
  return {
    key: trackKey(probe.service),
    service: probe.service,
    timestamp: probe.timestamp,
    status: probe.overall,
    reason: probe.error ?? probe.subChecks?.find((s) => s.status !== "Healthy")?.description ?? `HTTP ${probe.httpStatus}`,
  };
}
