import {mkdirSync, existsSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import type {Incident, IncidentsFile, ProbeResult} from "../src/lib/types/status";
import {isIncidentsFile} from "../src/lib/types/guards";
import {readRawProbes} from "./rawProbes";
import {applyTrackSignals, type TrackSignal} from "./detectIncidentsCommon";
import {serviceSignal} from "./detectIncidentsServices";
import {subCheckSignals} from "./detectIncidentsSubChecks";

const MS_PER_DAY = 86_400_000;
const RESOLVED_RETENTION_DAYS = 90;

/**
 * Orchestrates incident detection: reads raw probes, extracts main-service
 * and sub-check signals, time-sorts, folds them through the state machine,
 * prunes stale resolved incidents, and writes `incidents.json`.
 */
function signalsFromProbe(probe: ProbeResult): TrackSignal[] {
  return [serviceSignal(probe), ...subCheckSignals(probe)];
}

export function updateIncidentState(
  prev: IncidentsFile | {incidents: Incident[]},
  probes: readonly ProbeResult[],
): IncidentsFile {
  const sortedProbes = [...probes].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const signals = sortedProbes.flatMap(signalsFromProbe);
  return applyTrackSignals(prev, signals);
}

function pruneResolved(file: IncidentsFile, now: Date): IncidentsFile {
  const cutoffMs = now.getTime() - RESOLVED_RETENTION_DAYS * MS_PER_DAY;
  const kept = file.incidents.filter(inc =>
    inc.status === "open" || (inc.resolvedAt !== undefined && Date.parse(inc.resolvedAt) >= cutoffMs)
  );
  return {...file, incidents: kept};
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
