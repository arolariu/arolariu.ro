import {isAggregateFile, isIncidentsFile} from "../types/guards";
import type {AggregateFile, IncidentsFile} from "../types/status";

const DATA_BASE = "https://raw.githubusercontent.com/arolariu/arolariu.ro/status-data/data";
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_PREFIX = "status.arolariu.ro/cache:";

type Granularity = "fine" | "hourly" | "daily";

interface CachedAggregate {
  readonly data: AggregateFile;
  readonly fetchedAt: number;
}

const memory = new Map<Granularity, CachedAggregate>();
let incidentsMemory: {data: IncidentsFile; fetchedAt: number} | null = null;

export class StatusDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StatusDataError";
  }
}

function isHardReload(): boolean {
  if (typeof window === "undefined") return false;
  const entries = performance.getEntriesByType?.("navigation") ?? [];
  const entry = entries[0] as PerformanceNavigationTiming | undefined;
  if (!entry || entry.type !== "reload") return false;
  const fromCache = (entry as PerformanceNavigationTiming & {deliveryType?: string}).deliveryType === "cache"
    || entry.transferSize === 0;
  return !fromCache;
}

if (typeof window !== "undefined" && isHardReload()) {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(CACHE_PREFIX)) keysToRemove.push(k);
  }
  for (const k of keysToRemove) localStorage.removeItem(k);
}

export async function fetchAggregate(granularity: Granularity): Promise<AggregateFile> {
  const mem = memory.get(granularity);
  if (mem && Date.now() - mem.fetchedAt < CACHE_TTL_MS) return mem.data;

  const storageKey = `${CACHE_PREFIX}${granularity}`;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as {fetchedAt?: number; data?: unknown};
      if (typeof parsed.fetchedAt === "number"
          && Date.now() - parsed.fetchedAt < CACHE_TTL_MS
          && isAggregateFile(parsed.data)) {
        memory.set(granularity, {data: parsed.data, fetchedAt: parsed.fetchedAt});
        return parsed.data;
      }
    }
  } catch { /* localStorage unavailable */ }

  const response = await fetch(`${DATA_BASE}/${granularity}.json`, {cache: "no-store"});
  if (!response.ok) throw new StatusDataError(`HTTP ${response.status}`);
  const json: unknown = await response.json();
  if (!isAggregateFile(json)) throw new StatusDataError("schema mismatch");

  const fetchedAt = Date.now();
  memory.set(granularity, {data: json, fetchedAt});
  try {
    localStorage.setItem(storageKey, JSON.stringify({fetchedAt, data: json}));
  } catch { /* quota exceeded */ }

  return json;
}

export async function fetchIncidents(): Promise<IncidentsFile> {
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
  } catch { /* localStorage unavailable */ }
}
