/**
 * Network-facing data layer for the status page. Handles aggregate-file and
 * incidents-file fetching with a two-tier cache (in-memory + `localStorage`),
 * schema validation, and a local-dev mock-data shortcut.
 *
 * Caching strategy:
 *  1. In-memory map (`memory`, `incidentsMemory`) — primary, fastest.
 *  2. `localStorage` — persists across reloads, with a 30-minute TTL.
 *  3. Network — `status-data` branch on GitHub raw content.
 *
 * A "hard reload" (user pressed Ctrl+Shift+R, not served from disk cache)
 * purges the localStorage cache on module load, giving users a way to force
 * a fresh read without tooling.
 *
 * Mock shortcut: on localhost / `isLocalHost()`, both fetch entry points
 * return synthesized data instead of hitting the network — see `mockData.ts`.
 * The E2E `?mocks=off` escape hatch bypasses this shortcut.
 */

import {isAggregateFile, isIncidentsFile} from "../types/guards";
import type {AggregateFile, IncidentsFile} from "../types/status";
import {generateMockAggregate, generateMockIncidents, isLocalHost} from "./mockData";

/** GitHub raw content base URL for the `status-data` branch (aggregator output). */
const DATA_BASE = "https://raw.githubusercontent.com/arolariu/arolariu.ro/status-data/data";

/** Cache TTL — 30 minutes, matching the upstream aggregator's cron cadence. */
const CACHE_TTL_MS = 30 * 60 * 1000;

/** localStorage key prefix. Keys are `{prefix}{granularity}`. */
const CACHE_PREFIX = "status.arolariu.ro/cache:";

/** Which aggregate file to fetch (`fine` / `hourly` / `daily`). */
type Granularity = "fine" | "hourly" | "daily";

/** An aggregate file plus the wall-clock time it was fetched (for TTL checks). */
interface CachedAggregate {
  readonly data: AggregateFile;
  readonly fetchedAt: number;
}

/** In-memory aggregate cache keyed by granularity. */
const memory = new Map<Granularity, CachedAggregate>();

/** In-memory incidents cache (single file, no keying). */
let incidentsMemory: {data: IncidentsFile; fetchedAt: number} | null = null;

/**
 * Error class thrown by fetch helpers on non-2xx responses or schema failures.
 * Distinct from generic `Error` so the UI can branch on it without pulling in
 * `instanceof` chains across bundles.
 */
export class StatusDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StatusDataError";
  }
}

/**
 * True when the current page load is a user-initiated hard reload (not a
 * back/forward navigation or soft refresh served from the browser cache).
 * Safe to call during SSR — returns false when `window` is absent.
 */
function isHardReload(): boolean {
  /* v8 ignore next 2 */
  if (typeof window === "undefined") return false;
  const entries = performance.getEntriesByType?.("navigation") ?? [];
  const entry = entries[0] as PerformanceNavigationTiming | undefined;
  /* v8 ignore next 2 */
  if (!entry || entry.type !== "reload") return false;
  const fromCache = (entry as PerformanceNavigationTiming & {deliveryType?: string}).deliveryType === "cache" || entry.transferSize === 0;
  return !fromCache;
}

// Module-load-time side effect: a hard reload clears the localStorage cache,
// forcing the next fetch to go to the network. Skipped on SSR.
if (typeof window !== "undefined" && isHardReload()) {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(CACHE_PREFIX)) keysToRemove.push(k);
  }
  for (const k of keysToRemove) localStorage.removeItem(k);
}

/**
 * Fetch the aggregate file for a given granularity. Resolution order:
 *  1. Local-dev mock shortcut (`isLocalHost()` true).
 *  2. In-memory cache hit (fresh within `CACHE_TTL_MS`).
 *  3. localStorage cache hit (fresh within TTL + schema-valid).
 *  4. Network fetch from the `status-data` branch.
 *
 * On network success both caches are populated. Schema mismatches throw
 * `StatusDataError("schema mismatch")`; HTTP failures throw
 * `StatusDataError("HTTP {status}")`.
 */
export async function fetchAggregate(granularity: Granularity): Promise<AggregateFile> {
  // Local dev / preview shortcut: synthesize data relative to Date.now() so
  // the UI always shows "recent" timestamps without hitting the network.
  // The production Azure SWA hostname never matches isLocalHost().
  /* v8 ignore next */
  if (isLocalHost()) return generateMockAggregate(granularity);

  const mem = memory.get(granularity);
  if (mem && Date.now() - mem.fetchedAt < CACHE_TTL_MS) return mem.data;

  const storageKey = `${CACHE_PREFIX}${granularity}`;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as {fetchedAt?: number; data?: unknown};
      if (typeof parsed.fetchedAt === "number" && Date.now() - parsed.fetchedAt < CACHE_TTL_MS && isAggregateFile(parsed.data)) {
        memory.set(granularity, {data: parsed.data, fetchedAt: parsed.fetchedAt});
        return parsed.data;
      }
    }
  } catch {
    /* localStorage unavailable */
  }

  const response = await fetch(`${DATA_BASE}/${granularity}.json`, {cache: "no-store"});
  if (!response.ok) throw new StatusDataError(`HTTP ${response.status}`);
  const json: unknown = await response.json();
  if (!isAggregateFile(json)) throw new StatusDataError("schema mismatch");

  const fetchedAt = Date.now();
  memory.set(granularity, {data: json, fetchedAt});
  try {
    localStorage.setItem(storageKey, JSON.stringify({fetchedAt, data: json}));
  } catch {
    /* quota exceeded */
  }

  return json;
}

/**
 * Fetch the incidents file. Simpler than `fetchAggregate` — single file, so
 * only the in-memory cache + network path is used (no localStorage: the
 * incidents file is small and fresh-critical, so we don't want stale
 * incident entries surviving across sessions).
 *
 * Same error semantics as `fetchAggregate` — throws `StatusDataError` on
 * HTTP failure or schema mismatch.
 */
export async function fetchIncidents(): Promise<IncidentsFile> {
  /* v8 ignore next */
  if (isLocalHost()) return generateMockIncidents();

  if (incidentsMemory && Date.now() - incidentsMemory.fetchedAt < CACHE_TTL_MS) {
    return incidentsMemory.data;
  }
  const response = await fetch(`${DATA_BASE}/incidents.json`, {cache: "no-store"});
  if (!response.ok) throw new StatusDataError(`HTTP ${response.status}`);
  const json: unknown = await response.json();
  if (!isIncidentsFile(json)) throw new StatusDataError("schema mismatch");
  incidentsMemory = {data: json, fetchedAt: Date.now()};
  return json;
}

/**
 * Drop every cached aggregate + incidents entry, both in-memory and
 * localStorage. Used by the refresh button (keyboard shortcut `r`) and
 * by the double-click-refresh affordance.
 */
export function invalidateAllCaches(): void {
  memory.clear();
  incidentsMemory = null;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) keysToRemove.push(k);
    }
    for (const k of keysToRemove) localStorage.removeItem(k);
  } catch {
    /* localStorage unavailable */
  }
}
