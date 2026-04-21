import {afterEach, describe, expect, it, vi} from "vitest";
import {isAggregateFile, isIncidentsFile} from "../types/guards";
import {generateMockAggregate, generateMockIncidents, isLocalHost} from "./mockData";

describe("isLocalHost", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false under SSR (no window)", () => {
    // jsdom provides window, but we can stub it
    vi.stubGlobal("window", undefined);
    expect(isLocalHost()).toBe(false);
  });

  it("returns true for localhost", () => {
    // jsdom's location.hostname is 'localhost' by default
    expect(isLocalHost()).toBe(true);
  });

  it("returns false when ?mocks=off is present", () => {
    // Override search to include mocks=off
    vi.stubGlobal("window", {
      location: {hostname: "localhost", search: "?mocks=off"},
    });
    expect(isLocalHost()).toBe(false);
  });

  it("returns true for 127.0.0.1", () => {
    vi.stubGlobal("window", {
      location: {hostname: "127.0.0.1", search: ""},
    });
    expect(isLocalHost()).toBe(true);
  });

  it("returns true for ::1 (IPv6 loopback)", () => {
    vi.stubGlobal("window", {
      location: {hostname: "::1", search: ""},
    });
    expect(isLocalHost()).toBe(true);
  });

  it("returns false for production hostname", () => {
    vi.stubGlobal("window", {
      location: {hostname: "status.arolariu.ro", search: ""},
    });
    expect(isLocalHost()).toBe(false);
  });
});

describe("generateMockAggregate", () => {
  it("generates valid AggregateFile for 'fine' granularity", () => {
    const result = generateMockAggregate("fine");
    expect(isAggregateFile(result)).toBe(true);
    expect(result.bucketSize).toBe("30m");
    expect(result.windowDays).toBe(14);
    expect(result.services).toHaveLength(4);
  });

  it("generates valid AggregateFile for 'hourly' granularity", () => {
    const result = generateMockAggregate("hourly");
    expect(isAggregateFile(result)).toBe(true);
    expect(result.bucketSize).toBe("1h");
    expect(result.windowDays).toBe(90);
  });

  it("generates valid AggregateFile for 'daily' granularity", () => {
    const result = generateMockAggregate("daily");
    expect(isAggregateFile(result)).toBe(true);
    expect(result.bucketSize).toBe("1d");
    expect(result.windowDays).toBe(365);
  });

  it("all services are present in output", () => {
    const result = generateMockAggregate("fine");
    const services = result.services.map((s) => s.service).sort();
    expect(services).toEqual(["api.arolariu.ro", "arolariu.ro", "cv.arolariu.ro", "exp.arolariu.ro"]);
  });

  it("api.arolariu.ro has subSeries (mssql and cosmosdb)", () => {
    const result = generateMockAggregate("fine");
    const api = result.services.find((s) => s.service === "api.arolariu.ro")!;
    expect(api.subSeries).toBeDefined();
    expect(api.subSeries!["mssql"]).toBeDefined();
    expect(api.subSeries!["cosmosdb"]).toBeDefined();
  });

  it("buckets are in descending time order (newest-first, from now backwards)", () => {
    const result = generateMockAggregate("fine");
    const arolariu = result.services.find((s) => s.service === "arolariu.ro")!;
    // generateBucketsFor walks backwards from now, so bucket[0] is newest
    for (let i = 1; i < arolariu.buckets.length; i++) {
      expect(arolariu.buckets[i]!.t <= arolariu.buckets[i - 1]!.t).toBe(true);
    }
  });

  it("all bucket statuses are valid HealthStatus values", () => {
    const result = generateMockAggregate("fine");
    const validStatuses = new Set(["Healthy", "Degraded", "Unhealthy"]);
    for (const svc of result.services) {
      for (const bucket of svc.buckets) {
        expect(validStatuses.has(bucket.status)).toBe(true);
      }
    }
  });

  it("includes at least one non-Healthy bucket (blips active) across services", () => {
    const result = generateMockAggregate("fine");
    const hasNonHealthy = result.services.some((s) => s.buckets.some((b) => b.status !== "Healthy"));
    expect(hasNonHealthy).toBe(true);
  });

  it("generatedAt is a recent ISO timestamp", () => {
    const before = Date.now();
    const result = generateMockAggregate("fine");
    const after = Date.now();
    const ts = Date.parse(result.generatedAt);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("daily granularity has 365 buckets for arolariu.ro", () => {
    const result = generateMockAggregate("daily");
    const arolariu = result.services.find((s) => s.service === "arolariu.ro")!;
    expect(arolariu.buckets).toHaveLength(365);
  });
});

describe("generateMockIncidents", () => {
  it("generates valid IncidentsFile", () => {
    const result = generateMockIncidents();
    expect(isIncidentsFile(result)).toBe(true);
  });

  it("contains both open and resolved incidents", () => {
    const result = generateMockIncidents();
    const open = result.incidents.filter((i) => i.status === "open");
    const resolved = result.incidents.filter((i) => i.status === "resolved");
    expect(open.length).toBeGreaterThan(0);
    expect(resolved.length).toBeGreaterThan(0);
  });

  it("resolved incidents have resolvedAt and durationMs", () => {
    const result = generateMockIncidents();
    for (const incident of result.incidents) {
      if (incident.status === "resolved") {
        expect(incident.resolvedAt).toBeDefined();
        expect(incident.durationMs).toBeGreaterThan(0);
      }
    }
  });

  it("open incidents do not have resolvedAt", () => {
    const result = generateMockIncidents();
    for (const incident of result.incidents) {
      if (incident.status === "open") {
        // The `open` variant of the Incident union doesn't declare `resolvedAt`,
        // so TS narrows the property away. This assertion exists to verify the
        // *runtime* shape matches that type-level invariant — widen the view
        // just for the read.
        const maybeResolved = (incident as {resolvedAt?: string}).resolvedAt;
        expect(maybeResolved).toBeUndefined();
      }
    }
  });

  it("all incidents have required fields", () => {
    const result = generateMockIncidents();
    for (const incident of result.incidents) {
      expect(incident.id).toBeTruthy();
      expect(incident.service).toBeTruthy();
      expect(incident.severity).toMatch(/^(Degraded|Unhealthy)$/);
      expect(incident.startedAt).toBeTruthy();
      expect(incident.probeCount).toBeGreaterThan(0);
    }
  });

  it("includes sub-check incidents (e.g. mssql)", () => {
    const result = generateMockIncidents();
    const subCheckIncident = result.incidents.find((i) => i.subCheck !== undefined);
    expect(subCheckIncident).toBeDefined();
  });

  it("incidents are sorted newest-first (lowest ageHours first)", () => {
    const result = generateMockIncidents();
    const incidents = result.incidents;
    // The open incident (ageHours=3) should appear before the 12h one
    const expOpenIdx = incidents.findIndex((i) => i.status === "open" && i.service === "exp.arolariu.ro");
    const expResolvedIdx = incidents.findIndex((i) => i.status === "resolved" && i.service === "exp.arolariu.ro");
    if (expOpenIdx !== -1 && expResolvedIdx !== -1) {
      expect(expOpenIdx).toBeLessThan(expResolvedIdx);
    }
  });
});
