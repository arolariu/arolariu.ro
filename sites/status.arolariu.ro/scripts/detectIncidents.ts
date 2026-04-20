import {mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import type {HealthStatus, Incident, IncidentSeverity, IncidentsFile,
  ProbeResult, ServiceId} from "../src/lib/types/status";
import {isIncidentsFile} from "../src/lib/types/guards";

const MS_PER_DAY = 86_400_000;
const RESOLVED_RETENTION_DAYS = 90;

type TrackKey = string;

function trackKey(service: ServiceId, subCheck?: string): TrackKey {
  return subCheck ? `${service}::${subCheck}` : service;
}

function worstSeverity(a: IncidentSeverity, b: IncidentSeverity): IncidentSeverity {
  return a === "Unhealthy" || b === "Unhealthy" ? "Unhealthy" : "Degraded";
}

function toSeverity(status: HealthStatus): IncidentSeverity {
  return status === "Unhealthy" ? "Unhealthy" : "Degraded";
}

function buildIncidentId(startedAt: string, service: ServiceId, subCheck?: string): string {
  const slug = startedAt.replace(/[:.]/g, "-");
  return subCheck ? `inc-${slug}-${service}-${subCheck}` : `inc-${slug}-${service}`;
}

interface TrackSignal {
  readonly key: TrackKey;
  readonly service: ServiceId;
  readonly subCheck?: string;
  readonly timestamp: string;
  readonly status: HealthStatus;
  readonly reason: string;
}

function signalsFromProbe(probe: ProbeResult): TrackSignal[] {
  const signals: TrackSignal[] = [{
    key: trackKey(probe.service),
    service: probe.service,
    timestamp: probe.timestamp,
    status: probe.overall,
    reason: probe.error ?? probe.subChecks?.find(s => s.status !== "Healthy")?.description ?? `HTTP ${probe.httpStatus}`,
  }];
  if (probe.subChecks) {
    for (const sc of probe.subChecks) {
      signals.push({
        key: trackKey(probe.service, sc.name),
        service: probe.service,
        subCheck: sc.name,
        timestamp: probe.timestamp,
        status: sc.status,
        reason: sc.description ?? `${sc.name} ${sc.status}`,
      });
    }
  }
  return signals;
}

interface TrackState {
  previousFailure?: TrackSignal;
  streak: number;
}

export function updateIncidentState(
  prev: IncidentsFile | {incidents: Incident[]},
  probes: readonly ProbeResult[],
): IncidentsFile {
  const incidents = [...prev.incidents];
  const tracks = new Map<TrackKey, TrackState>();
  const openByKey = new Map<TrackKey, number>();

  for (let i = 0; i < incidents.length; i++) {
    const inc = incidents[i];
    if (inc.status === "open") {
      openByKey.set(trackKey(inc.service, inc.subCheck), i);
      tracks.set(trackKey(inc.service, inc.subCheck), {streak: inc.probeCount});
    }
  }

  const sortedProbes = [...probes].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  for (const probe of sortedProbes) {
    for (const sig of signalsFromProbe(probe)) {
      const state = tracks.get(sig.key) ?? {streak: 0};
      const openIdx = openByKey.get(sig.key);

      if (sig.status === "Healthy") {
        if (openIdx !== undefined) {
          const open = incidents[openIdx];
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
        const open = incidents[openIdx];
        incidents[openIdx] = {
          ...open,
          probeCount: open.probeCount + 1,
          severity: worstSeverity(open.severity, toSeverity(sig.status)),
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
  }

  incidents.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return {generatedAt: new Date().toISOString(), incidents};
}

function pruneResolved(file: IncidentsFile, now: Date): IncidentsFile {
  const cutoffMs = now.getTime() - RESOLVED_RETENTION_DAYS * MS_PER_DAY;
  const kept = file.incidents.filter(inc =>
    inc.status === "open" || (inc.resolvedAt !== undefined && Date.parse(inc.resolvedAt) >= cutoffMs)
  );
  return {...file, incidents: kept};
}

function readRawProbes(dataDir: string): ProbeResult[] {
  const rawDir = join(dataDir, "raw");
  if (!existsSync(rawDir)) return [];
  const probes: ProbeResult[] = [];
  for (const f of readdirSync(rawDir).sort()) {
    if (!f.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(rawDir, f), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { probes.push(JSON.parse(line) as ProbeResult); } catch { /* skip */ }
    }
  }
  return probes;
}

function readPreviousIncidents(dataDir: string): IncidentsFile {
  const path = join(dataDir, "incidents.json");
  if (!existsSync(path)) return {generatedAt: new Date(0).toISOString(), incidents: []};
  // Same loud-failure rationale as aggregate.ts readPrevious: a corrupt
  // incidents.json must not silently become an empty file (losing open
  // incidents and 90 days of resolved history).
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(`readPreviousIncidents: ${path} exists but is not valid JSON — refusing to overwrite history. ${err instanceof Error ? err.message : ""}`);
  }
  if (!isIncidentsFile(parsed)) {
    throw new Error(`readPreviousIncidents: ${path} does not match IncidentsFile schema — refusing to overwrite history.`);
  }
  return parsed;
}

export interface RunDetectIncidentsOptions {
  readonly dataDir: string;
  readonly now?: Date;
}

export async function runDetectIncidents(opts: RunDetectIncidentsOptions): Promise<void> {
  const now = opts.now ?? new Date();
  const previous = readPreviousIncidents(opts.dataDir);

  // Only feed probes newer than the last run through the state machine —
  // otherwise every cron re-processes 14 days of raw probes and ratchets
  // probeCount/severity on already-counted incidents (reviewer C1).
  // readPreviousIncidents always returns a valid ISO string (epoch-0 on
  // first run), so cursorMs is always finite — no guard needed.
  const cursorMs = Date.parse(previous.generatedAt);
  const allProbes = readRawProbes(opts.dataDir);
  const fresh = allProbes.filter(p => Date.parse(p.timestamp) > cursorMs);

  const updated = updateIncidentState(previous, fresh);
  const pruned = pruneResolved(updated, now);
  const final: IncidentsFile = {...pruned, generatedAt: now.toISOString()};

  mkdirSync(opts.dataDir, {recursive: true});
  writeFileSync(join(opts.dataDir, "incidents.json"), JSON.stringify(final), "utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dataDir = process.env["DATA_DIR"] ?? "./data";
  runDetectIncidents({dataDir}).catch(err => {
    console.error("detectIncidents failed:", err);
    process.exit(1);
  });
}
