import {describe, it, expect, vi, beforeEach} from "vitest";
import type {AggregateFile} from "../types/status";

const validAggregate: AggregateFile = {
  generatedAt: "2026-04-19T14:00:00Z",
  bucketSize: "30m", windowDays: 14,
  services: [{service: "arolariu.ro", buckets: []}],
};

function setupFetch(body: unknown, status = 200) {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify(body), {status})) as typeof fetch;
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
});

describe("fetchAggregate", () => {
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
    globalThis.fetch = vi.fn(async () => new Response("", {status: 500})) as typeof fetch;
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

  it("localStorage quota exceeded is silently tolerated", async () => {
    setupFetch(validAggregate);
    const orig = localStorage.setItem;
    localStorage.setItem = () => { throw new Error("QuotaExceeded"); };
    const {fetchAggregate} = await import("./fetchStatusData");
    await expect(fetchAggregate("fine")).resolves.toEqual(validAggregate);
    localStorage.setItem = orig;
  });
});

describe("fetchIncidents", () => {
  it("fetches and validates incidents", async () => {
    setupFetch({generatedAt: "2026-04-19T14:00:00Z", incidents: []});
    const {fetchIncidents} = await import("./fetchStatusData");
    const result = await fetchIncidents();
    expect(result.incidents).toEqual([]);
  });
});
