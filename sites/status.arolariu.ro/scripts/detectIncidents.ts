/**
 * Incident detection pipeline. Reads raw probes, extracts per-track signals
 * (one for the main service + one per sub-check), folds them through the
 * incident state machine, and writes the merged `incidents.json`.
 *
 * Uses a `generatedAt` cursor on the previous `IncidentsFile` so repeated
 * cron runs do not re-process the same probes and inflate `probeCount` /
 * `severity` on incidents that were already recorded.
 */
import {mkdirSync, existsSync, readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import type {Incident, IncidentsFile, ProbeResult} from "../src/lib/types/status";
import {isIncidentsFile} from "../src/lib/types/guards";
import {readRawProbes} from "./rawProbes";
import {applyTrackSignals, type TrackSignal} from "./detectIncidentsCommon";
import {serviceSignal} from "./detectIncidentsServices";
import {subCheckSignals} from "./detectIncidentsSubChecks";

const MS_PER_DAY = 86_400_000;
/** How long resolved incidents linger in `incidents.json` before they are pruned. */
const RESOLVED_RETENTION_DAYS = 90;

/**
 * Expand one probe into every `TrackSignal` it feeds: the main-service
 * signal plus one per sub-check. Sub-check-less probes return a single
 * element.
 */
function signalsFromProbe(probe: ProbeResult): TrackSignal[] {
  return [serviceSignal(probe), ...subCheckSignals(probe)];
}

/**
 * Time-sort the given probes, flatten them into track signals, and fold
 * them through {@link applyTrackSignals}.
 *
 * @param prev   - The previous `IncidentsFile` (or just `{incidents}` on first run).
 * @param probes - Probes to apply. Caller decides whether these are "fresh only" or "everything".
 * @returns The updated incidents file with a fresh `generatedAt`.
 */
export function updateIncidentState(
  prev: IncidentsFile | {incidents: Incident[]},
  probes: readonly ProbeResult[],
): IncidentsFile {
  const sortedProbes = [...probes].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const signals = sortedProbes.flatMap(signalsFromProbe);
  return applyTrackSignals(prev, signals);
}

/**
 * Drop resolved incidents whose `resolvedAt` is older than
 * {@link RESOLVED_RETENTION_DAYS}. Open incidents are always retained
 * regardless of age.
 */
function pruneResolved(file: IncidentsFile, now: Date): IncidentsFile {
  const cutoffMs = now.getTime() - RESOLVED_RETENTION_DAYS * MS_PER_DAY;
  const kept = file.incidents.filter(inc =>
    inc.status === "open" || (inc.resolvedAt !== undefined && Date.parse(inc.resolvedAt) >= cutoffMs)
  );
  return {...file, incidents: kept};
}

/**
 * Load the previous `incidents.json`. Returns an epoch-0 empty file on
 * first run so callers don't need a null check on `generatedAt`.
 *
 * A corrupt file throws rather than silently becoming empty — otherwise
 * open incidents and 90 days of resolved history would vanish on the
 * next write.
 */
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

/** Options accepted by {@link runDetectIncidents}. */
export interface RunDetectIncidentsOptions {
  /** Base directory containing `raw/*.jsonl` input and `incidents.json` output. */
  readonly dataDir: string;
  /** Clock override for deterministic tests; defaults to `new Date()`. */
  readonly now?: Date;
}

/**
 * Cron entry point: incrementally process probes newer than the previous
 * run's `generatedAt`, update the incident state machine, prune old
 * resolved incidents, and persist `incidents.json`.
 */
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
