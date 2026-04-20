import type {HealthStatus, Incident, IncidentSeverity, IncidentsFile,
  ServiceId} from "../src/lib/types/status";

/**
 * Shared state-machine helpers for incident detection. Neither the
 * service-signal nor the sub-check-signal module has anything
 * incident-specific beyond the signal extraction — the actual
 * streak-counting, open/resolve, and severity-escalation logic is here.
 */

/**
 * Opaque identifier for a "track" — the logical failure stream that the
 * state machine follows independently of others. There is one track per
 * main service and one per (service, sub-check) pair.
 */
export type TrackKey = string;

/** Stable key for the state-machine tracks — one per (service, subCheck?). */
export function trackKey(service: ServiceId, subCheck?: string): TrackKey {
  return subCheck ? `${service}::${subCheck}` : service;
}

/** Worse-of-two severity: Unhealthy dominates Degraded. */
export function worstSeverity(a: IncidentSeverity, b: IncidentSeverity): IncidentSeverity {
  return a === "Unhealthy" || b === "Unhealthy" ? "Unhealthy" : "Degraded";
}

/** HealthStatus → IncidentSeverity (Healthy maps to Degraded as a neutral default). */
export function toSeverity(status: HealthStatus): IncidentSeverity {
  return status === "Unhealthy" ? "Unhealthy" : "Degraded";
}

/** Deterministic incident id based on start time + service (+ sub-check). */
export function buildIncidentId(startedAt: string, service: ServiceId, subCheck?: string): string {
  const slug = startedAt.replace(/[:.]/g, "-");
  return subCheck ? `inc-${slug}-${service}-${subCheck}` : `inc-${slug}-${service}`;
}

/**
 * A per-probe health signal fed into the state machine. Both main-service
 * signals and sub-check signals share this shape — the state machine below
 * doesn't need to distinguish them beyond the `subCheck` field being
 * present/absent.
 */
export interface TrackSignal {
  /** Track identifier returned by {@link trackKey}; groups signals into per-track streams. */
  readonly key: TrackKey;
  /** Service this signal belongs to (persisted on the resulting incident). */
  readonly service: ServiceId;
  /** Sub-check name when this is a sub-check-level signal; absent for main-service signals. */
  readonly subCheck?: string;
  /** ISO timestamp of the originating probe. */
  readonly timestamp: string;
  /** Health outcome for this tick. */
  readonly status: HealthStatus;
  /** Human-readable explanation surfaced on the incident when it opens (or when severity escalates). */
  readonly reason: string;
}

/**
 * Internal per-track bookkeeping. Tracks the consecutive-failure streak and
 * remembers the first failure signal so we can backdate `startedAt` to it
 * once we hit the 2-failure open threshold.
 */
interface TrackState {
  /** First failure in the current streak; discarded as soon as an incident opens or the streak resets. */
  previousFailure?: TrackSignal;
  /** Number of consecutive non-Healthy signals observed on this track. */
  streak: number;
}

/**
 * Core incident state machine: folds a stream of `TrackSignal`s into the
 * previous incident log, opening new incidents after 2 consecutive
 * failures, resolving them on the first healthy signal, and escalating
 * severity when worse statuses arrive mid-incident. Pure function.
 *
 * Invariants:
 *  - Signals must arrive in chronological order per track (caller sorts).
 *  - An incident opens only after two failures in a row; singleton
 *    failures never produce an open incident on their own.
 *  - Already-open incidents from `prev` are resumed, not duplicated — their
 *    `probeCount` becomes the initial streak count.
 *  - Severity is monotonic mid-incident: it can escalate Degraded→Unhealthy
 *    but never relax back down until the incident resolves.
 *
 * @param prev            - Prior incidents to extend; `incidents` array is cloned, not mutated.
 * @param signalsInOrder  - Time-sorted signals to apply.
 * @returns The updated `IncidentsFile` with a fresh `generatedAt`.
 */
export function applyTrackSignals(
  prev: IncidentsFile | {incidents: Incident[]},
  signalsInOrder: readonly TrackSignal[],
): IncidentsFile {
  const incidents = [...prev.incidents];
  const tracks = new Map<TrackKey, TrackState>();
  const openByKey = new Map<TrackKey, number>();

  for (let i = 0; i < incidents.length; i++) {
    const inc = incidents[i]!;
    if (inc.status === "open") {
      openByKey.set(trackKey(inc.service, inc.subCheck), i);
      tracks.set(trackKey(inc.service, inc.subCheck), {streak: inc.probeCount});
    }
  }

  for (const sig of signalsInOrder) {
    const state = tracks.get(sig.key) ?? {streak: 0};
    const openIdx = openByKey.get(sig.key);

    if (sig.status === "Healthy") {
      if (openIdx !== undefined) {
        const open = incidents[openIdx]!;
        incidents[openIdx] = {
          ...open, status: "resolved",
          resolvedAt: sig.timestamp,
          durationMs: Date.parse(sig.timestamp) - Date.parse(open.startedAt),
        };
        openByKey.delete(sig.key);
      }
      tracks.set(sig.key, {streak: 0});
      continue;
    }

    const newStreak = state.streak + 1;
    if (openIdx !== undefined) {
      const open = incidents[openIdx]!;
      const nextSeverity = worstSeverity(open.severity, toSeverity(sig.status));
      // If severity escalated (e.g. Degraded → Unhealthy), refresh `reason`
      // to reflect the new signature. A stale "slow response" reason on an
      // incident that has since escalated to a full outage is misleading in
      // post-mortems.
      const escalated = nextSeverity !== open.severity;
      incidents[openIdx] = {
        ...open,
        probeCount: open.probeCount + 1,
        severity: nextSeverity,
        ...(escalated ? {reason: sig.reason} : {}),
      };
      tracks.set(sig.key, {streak: newStreak});
    } else if (newStreak === 1) {
      tracks.set(sig.key, {streak: 1, previousFailure: sig});
    } else if (newStreak >= 2 && state.previousFailure) {
      const startSig = state.previousFailure;
      const incident: Incident = {
        id: buildIncidentId(startSig.timestamp, sig.service, sig.subCheck),
        service: sig.service,
        status: "open",
        startedAt: startSig.timestamp,
        severity: worstSeverity(toSeverity(startSig.status), toSeverity(sig.status)),
        reason: startSig.reason,
        probeCount: 2,
        ...(sig.subCheck !== undefined ? {subCheck: sig.subCheck} : {}),
      };
      incidents.push(incident);
      openByKey.set(sig.key, incidents.length - 1);
      tracks.set(sig.key, {streak: 2});
    }
  }

  incidents.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return {generatedAt: new Date().toISOString(), incidents};
}
