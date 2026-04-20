import type {ProbeResult} from "../src/lib/types/status";
import {trackKey, type TrackSignal} from "./detectIncidentsCommon";

/**
 * Extract one `TrackSignal` per sub-check on a probe. Probes without
 * sub-checks contribute nothing here (the main-service signal is produced
 * separately in `detectIncidentsServices.ts`).
 */
export function subCheckSignals(probe: ProbeResult): TrackSignal[] {
  if (!probe.subChecks) return [];
  return probe.subChecks.map(sc => ({
    key: trackKey(probe.service, sc.name),
    service: probe.service,
    subCheck: sc.name,
    timestamp: probe.timestamp,
    status: sc.status,
    reason: sc.description ?? `${sc.name} ${sc.status}`,
  }));
}
