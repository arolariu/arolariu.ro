import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {isAggregateFile, isIncidentsFile} from "../types/guards";
import type {AggregateFile} from "../types/status";

const performanceNow = performance.now.bind(performance);

const validAggregate: AggregateFile = {
  generatedAt: "2026-04-19T14:00:00Z",
  bucketSize: "30m",
  windowDays: 14,
  services: [{service: "arolariu.ro", buckets: []}],
};
const aggregateCacheKey = "status.arolariu.ro/cache:fine";
const fetchMock = vi.fn<typeof fetch>();

function setupFetch(body: unknown, status = 200) {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify(body), {status}));
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  // Use the site's existing opt-out from localhost sample data.
  window.history.replaceState(null, "", "/?mocks=off");
  fetchMock.mockRejectedValue(new Error("Unexpected status data request"));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("fetchAggregate", () => {
  it("uses local sample data until the URL opts out", async () => {
    window.history.replaceState(null, "", "/");
    setupFetch(validAggregate);
    const {fetchAggregate} = await import("./fetchStatusData");

    const sample = await fetchAggregate("fine");

    expect(isAggregateFile(sample)).toBe(true);
    expect(sample.services.some(({buckets}) => buckets.length > 0)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    window.history.replaceState(null, "", "/?mocks=off");
    await expect(fetchAggregate("fine")).resolves.toEqual(validAggregate);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("https://raw.githubusercontent.com/arolariu/arolariu.ro/status-data/data/fine.json", {
      cache: "no-store",
    });
  });

  it("fetches from network on first call", async () => {
    setupFetch(validAggregate);
    const {fetchAggregate} = await import("./fetchStatusData");
    const result = await fetchAggregate("fine");
    expect(result).toEqual(validAggregate);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns from in-memory cache on second call within TTL", async () => {
    setupFetch(validAggregate);
    const {fetchAggregate} = await import("./fetchStatusData");
    await fetchAggregate("fine");
    await fetchAggregate("fine");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("writes to localStorage on network fetch", async () => {
    setupFetch(validAggregate);
    const {fetchAggregate} = await import("./fetchStatusData");
    await fetchAggregate("fine");
    expect(localStorage.getItem("status.arolariu.ro/cache:fine")).not.toBeNull();
  });

  it("throws StatusDataError on non-ok HTTP", async () => {
    fetchMock.mockResolvedValue(new Response("", {status: 500}));
    const {fetchAggregate, StatusDataError} = await import("./fetchStatusData");
    await expect(fetchAggregate("fine")).rejects.toBeInstanceOf(StatusDataError);
  });

  it("throws StatusDataError on schema mismatch", async () => {
    setupFetch({bogus: true});
    const {fetchAggregate, StatusDataError} = await import("./fetchStatusData");
    await expect(fetchAggregate("fine")).rejects.toBeInstanceOf(StatusDataError);
  });

  it("invalidateAllCaches forces next fetch to hit network", async () => {
    setupFetch(validAggregate);
    const {fetchAggregate, invalidateAllCaches} = await import("./fetchStatusData");
    await fetchAggregate("fine");
    invalidateAllCaches();
    await fetchAggregate("fine");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("invalidateAllCaches skips localStorage keys without cache prefix (false branch of k?.startsWith)", async () => {
    // Add a key that doesn't start with CACHE_PREFIX before calling invalidateAllCaches
    // This exercises the false branch of `if (k?.startsWith(CACHE_PREFIX))`
    setupFetch(validAggregate);
    const {fetchAggregate, invalidateAllCaches} = await import("./fetchStatusData");
    await fetchAggregate("fine"); // populates cache
    localStorage.setItem("unrelated-key", "some-value"); // non-prefixed key
    invalidateAllCaches();
    // Unrelated key should still be in localStorage (not removed)
    expect(localStorage.getItem("unrelated-key")).toBe("some-value");
    localStorage.removeItem("unrelated-key");
  });

  it("respects 30-min TTL boundary: expired entry triggers fresh network fetch", async () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1_700_000_000_000);
    setupFetch(validAggregate);
    const {fetchAggregate} = await import("./fetchStatusData");

    await fetchAggregate("fine");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // advance time by exactly TTL (30 min) — should still hit cache (< not <=)
    nowSpy.mockReturnValue(1_700_000_000_000 + 30 * 60 * 1000 - 1);
    await fetchAggregate("fine");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // advance past TTL → fresh fetch
    nowSpy.mockReturnValue(1_700_000_000_000 + 30 * 60 * 1000 + 1);
    await fetchAggregate("fine");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    nowSpy.mockRestore();
  });

  it("localStorage with stale-schema payload falls through to network fetch", async () => {
    // Seed localStorage with a value that looks like an old cache entry but
    // has a shape isAggregateFile rejects.
    localStorage.setItem("status.arolariu.ro/cache:fine", JSON.stringify({fetchedAt: Date.now(), data: {legacy: true, missing: "fields"}}));
    setupFetch(validAggregate);
    const {fetchAggregate} = await import("./fetchStatusData");

    const result = await fetchAggregate("fine");
    expect(result).toEqual(validAggregate);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1); // fell through to network
  });

  it("retries after corrupted storage and an HTTP failure, then caches the successful payload", async () => {
    const now = Date.parse("2026-04-19T14:15:00Z");
    vi.spyOn(Date, "now").mockReturnValue(now);
    localStorage.setItem(aggregateCacheKey, "invalid JSON");
    fetchMock.mockResolvedValueOnce(new Response("", {status: 503})).mockResolvedValueOnce(Response.json(validAggregate));
    const {fetchAggregate} = await import("./fetchStatusData");

    await expect(fetchAggregate("fine")).rejects.toThrow("HTTP 503");
    expect(localStorage.getItem(aggregateCacheKey)).toBe("invalid JSON");

    await expect(fetchAggregate("fine")).resolves.toEqual(validAggregate);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(aggregateCacheKey)).toBe(JSON.stringify({fetchedAt: now, data: validAggregate}));
  });

  it("localStorage quota exceeded is silently tolerated", async () => {
    setupFetch(validAggregate);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Cache is full", "QuotaExceededError");
    });
    const {fetchAggregate} = await import("./fetchStatusData");

    await expect(fetchAggregate("fine")).resolves.toEqual(validAggregate);
    expect(localStorage.getItem(aggregateCacheKey)).toBeNull();
  });
});

describe("fetchIncidents", () => {
  it("does not fetch incidents from the network while local sample data is active", async () => {
    window.history.replaceState(null, "", "/");
    const {fetchIncidents} = await import("./fetchStatusData");

    const sample = await fetchIncidents();

    expect(isIncidentsFile(sample)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches and validates incidents", async () => {
    setupFetch({generatedAt: "2026-04-19T14:00:00Z", incidents: []});
    const {fetchIncidents} = await import("./fetchStatusData");
    const result = await fetchIncidents();
    expect(result.incidents).toEqual([]);
  });

  it("returns from in-memory cache on second call within TTL", async () => {
    setupFetch({generatedAt: "2026-04-19T14:00:00Z", incidents: []});
    const {fetchIncidents} = await import("./fetchStatusData");
    await fetchIncidents();
    await fetchIncidents();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws StatusDataError on non-ok HTTP for incidents", async () => {
    fetchMock.mockResolvedValue(new Response("", {status: 503}));
    const {fetchIncidents, StatusDataError} = await import("./fetchStatusData");
    await expect(fetchIncidents()).rejects.toBeInstanceOf(StatusDataError);
  });

  it("throws StatusDataError on schema mismatch for incidents", async () => {
    setupFetch({not: "an incidents file"});
    const {fetchIncidents, StatusDataError} = await import("./fetchStatusData");
    await expect(fetchIncidents()).rejects.toBeInstanceOf(StatusDataError);
  });
});

describe("localStorage cache from previous session", () => {
  it("reads valid cached aggregate from localStorage (fast path)", async () => {
    const validAggregate2 = {
      generatedAt: "2026-04-19T14:00:00Z",
      bucketSize: "fine" as const,
      windowDays: 14 as const,
      services: [{service: "arolariu.ro", buckets: []}],
    };
    const fresh = {
      generatedAt: "2026-04-19T14:00:00Z",
      bucketSize: "30m" as const,
      windowDays: 14 as const,
      services: [{service: "arolariu.ro", buckets: []}],
    };
    localStorage.setItem("status.arolariu.ro/cache:fine", JSON.stringify({fetchedAt: Date.now(), data: fresh}));
    const {fetchAggregate} = await import("./fetchStatusData");
    const result = await fetchAggregate("fine");
    // Should come from localStorage, not network
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(result.bucketSize).toBe("30m");
    void validAggregate2;
  });
});

describe("isHardReload branches (module-load side effect)", () => {
  it("preserves the cache when a reload is served from disk", async () => {
    const cached = JSON.stringify({fetchedAt: Date.now(), data: validAggregate});
    localStorage.setItem(aggregateCacheKey, cached);
    const navigation = {type: "reload", transferSize: 0};
    vi.stubGlobal("performance", {
      now: performanceNow,
      getEntriesByType: (type: string) => (type === "navigation" ? [navigation] : []),
    });

    await import("./fetchStatusData");

    expect(localStorage.getItem(aggregateCacheKey)).toBe(cached);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears localStorage cache keys when navigation type is reload (hard reload path)", async () => {
    // Seed a cache entry so the clear loop has something to remove
    localStorage.setItem("status.arolariu.ro/cache:fine", JSON.stringify({fetchedAt: Date.now(), data: validAggregate}));
    localStorage.setItem("other-key", "keep-me");

    // Simulate a reload navigation entry with non-zero transferSize (not from cache)
    const reloadEntry = {type: "reload", transferSize: 1024};
    vi.stubGlobal("performance", {
      now: performanceNow,
      getEntriesByType: (type: string) => (type === "navigation" ? [reloadEntry] : []),
    });

    // Re-import triggers module-load side effect
    const {fetchAggregate} = await import("./fetchStatusData");
    void fetchAggregate;

    // Cache key should have been removed by the hard-reload clear loop
    expect(localStorage.getItem("status.arolariu.ro/cache:fine")).toBeNull();
    // Non-cache keys should be untouched
    expect(localStorage.getItem("other-key")).toBe("keep-me");
    vi.unstubAllGlobals();
  });

  it("does NOT clear localStorage when navigation type is not reload", async () => {
    localStorage.setItem("status.arolariu.ro/cache:fine", JSON.stringify({fetchedAt: Date.now(), data: validAggregate}));

    // Simulate navigate (not reload)
    const navigateEntry = {type: "navigate", transferSize: 0};
    vi.stubGlobal("performance", {
      now: performanceNow,
      getEntriesByType: (type: string) => (type === "navigation" ? [navigateEntry] : []),
    });

    await import("./fetchStatusData");

    // Cache key should remain intact
    expect(localStorage.getItem("status.arolariu.ro/cache:fine")).not.toBeNull();
    vi.unstubAllGlobals();
  });

  it("does not throw during module-load cache clearing when localStorage access throws", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const reloadEntry = {type: "reload", transferSize: 1024};
    const blockedStorage = vi.fn(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    vi.stubGlobal("performance", {
      now: performanceNow,
      getEntriesByType: (type: string) => (type === "navigation" ? [reloadEntry] : []),
    });

    Object.defineProperty(globalThis, "localStorage", {configurable: true, get: blockedStorage});
    try {
      await expect(import("./fetchStatusData")).resolves.toHaveProperty("fetchAggregate");
      expect(blockedStorage).toHaveBeenCalled();
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
      else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
});
