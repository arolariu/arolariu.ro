import {describe, expect, it} from "vitest";
import {
  isAggregateFile,
  isBucket,
  isHealthStatus,
  isIncident,
  isIncidentsFile,
  isProbeResult,
  isServiceId,
  isServiceSeries,
  isSubCheck,
} from "./guards.ts";

describe("isHealthStatus", () => {
  it("accepts Healthy, Degraded, Unhealthy", () => {
    expect(isHealthStatus("Healthy")).toBe(true);
    expect(isHealthStatus("Degraded")).toBe(true);
    expect(isHealthStatus("Unhealthy")).toBe(true);
  });
  it("rejects other strings and non-strings", () => {
    expect(isHealthStatus("healthy")).toBe(false);
    expect(isHealthStatus(null)).toBe(false);
    expect(isHealthStatus(42)).toBe(false);
  });
});

describe("isServiceId", () => {
  it("accepts known service ids", () => {
    expect(isServiceId("arolariu.ro")).toBe(true);
    expect(isServiceId("api.arolariu.ro")).toBe(true);
  });
  it("rejects unknown service ids", () => {
    expect(isServiceId("docs.arolariu.ro")).toBe(false);
  });
});

describe("isSubCheck", () => {
  it("rejects a null sub-check before reading its fields", () => {
    expect(isSubCheck(null)).toBe(false);
  });

  it("accepts minimal valid", () => {
    expect(isSubCheck({name: "mssql", status: "Healthy", durationMs: 12})).toBe(true);
  });
  it("rejects missing fields", () => {
    expect(isSubCheck({name: "mssql", status: "Healthy"})).toBe(false);
  });
  it("rejects wrong types", () => {
    expect(isSubCheck({name: "mssql", status: "bad", durationMs: 12})).toBe(false);
  });
  it("accepts valid sampleDurationsMs array", () => {
    expect(isSubCheck({name: "mssql", status: "Healthy", durationMs: 12, sampleDurationsMs: [10, 11, 12, 13]})).toBe(true);
  });
  it("accepts empty sampleDurationsMs array", () => {
    expect(isSubCheck({name: "mssql", status: "Healthy", durationMs: 12, sampleDurationsMs: []})).toBe(true);
  });
  it("rejects non-array sampleDurationsMs", () => {
    expect(isSubCheck({name: "mssql", status: "Healthy", durationMs: 12, sampleDurationsMs: 12})).toBe(false);
  });
  it("rejects negative values inside sampleDurationsMs", () => {
    expect(isSubCheck({name: "mssql", status: "Healthy", durationMs: 12, sampleDurationsMs: [10, -1, 12]})).toBe(false);
  });
  it("rejects malformed optional sub-check descriptions", () => {
    expect(isSubCheck({name: "mssql", status: "Healthy", durationMs: 12, description: 42})).toBe(false);
  });
});

describe("isProbeResult", () => {
  const valid = {
    service: "api.arolariu.ro",
    timestamp: "2026-04-19T14:00:00Z",
    latencyMs: 142,
    httpStatus: 200,
    overall: "Healthy",
  };
  it("accepts valid", () => {
    expect(isProbeResult(valid)).toBe(true);
  });
  it("rejects a null probe before reading its fields", () => {
    expect(isProbeResult(null)).toBe(false);
  });
  it("accepts with subChecks", () => {
    expect(isProbeResult({...valid, subChecks: [{name: "x", status: "Healthy", durationMs: 5}]})).toBe(true);
  });
  it("rejects invalid subChecks array", () => {
    expect(isProbeResult({...valid, subChecks: [{name: "x"}]})).toBe(false);
  });
  it("accepts valid sampleCount", () => {
    expect(isProbeResult({...valid, sampleCount: 3})).toBe(true);
  });
  it("rejects non-numeric sampleCount", () => {
    expect(isProbeResult({...valid, sampleCount: "3"})).toBe(false);
  });
  it("rejects sampleCount < 1", () => {
    expect(isProbeResult({...valid, sampleCount: 0})).toBe(false);
  });
  it("accepts valid sampleLatenciesMs array", () => {
    expect(isProbeResult({...valid, sampleLatenciesMs: [100, 120, 140]})).toBe(true);
  });
  it("rejects non-array sampleLatenciesMs", () => {
    expect(isProbeResult({...valid, sampleLatenciesMs: 120})).toBe(false);
  });
  it("rejects negative values inside sampleLatenciesMs", () => {
    expect(isProbeResult({...valid, sampleLatenciesMs: [100, -1, 140]})).toBe(false);
  });
});

describe("isBucket", () => {
  const valid = {
    t: "2026-04-19T14:00:00Z",
    status: "Healthy",
    probes: {healthy: 2, total: 2},
    latency: {p50: 100, p99: 300},
  };
  it("rejects missing latency fields", () => {
    expect(isBucket({...valid, latency: {p50: 100}})).toBe(false);
  });
  it("accepts legacy 2-percentile latency shape (p50, p99 only)", () => {
    expect(isBucket(valid)).toBe(true);
  });
  it("accepts new 4-percentile latency shape (p50, p75, p95, p99)", () => {
    expect(isBucket({...valid, latency: {p50: 100, p75: 180, p95: 250, p99: 300}})).toBe(true);
  });
  it("rejects malformed optional percentiles (p75 non-numeric)", () => {
    expect(isBucket({...valid, latency: {p50: 100, p75: "slow", p99: 300}})).toBe(false);
  });

  it("accepts a failed HTTP status and a sub-check summary without a description", () => {
    const failed = {...valid, status: "Unhealthy", httpStatus: 503, worstSubCheck: {name: "mssql", status: "Unhealthy"}};

    expect(isBucket(failed)).toBe(true);
  });

  it.each([
    ["array-shaped probe counts", {probes: []}],
    ["a missing latency object", {latency: null}],
    ["a non-finite upper percentile", {latency: {p50: 100, p95: Infinity, p99: 300}}],
    ["a nonnumeric HTTP status", {httpStatus: "503"}],
    ["a non-object sub-check summary", {worstSubCheck: null}],
    ["a missing sub-check name", {worstSubCheck: {status: "Unhealthy"}}],
    ["an unknown sub-check status", {worstSubCheck: {name: "mssql", status: "Unknown"}}],
    ["a non-text sub-check description", {worstSubCheck: {name: "mssql", status: "Unhealthy", description: 503}}],
  ])("rejects a bucket with %s", (_condition, invalid) => {
    const candidate = {...valid, ...invalid};

    expect(isBucket(candidate)).toBe(false);
  });
});

describe("isServiceSeries", () => {
  const buckets = [
    {
      t: "2026-04-19T14:00:00Z",
      status: "Healthy",
      probes: {healthy: 1, total: 1},
      latency: {p50: 10, p99: 20},
    },
  ];
  it("accepts minimal", () => {
    expect(isServiceSeries({service: "arolariu.ro", buckets})).toBe(true);
  });
  it("accepts with subSeries", () => {
    expect(isServiceSeries({service: "api.arolariu.ro", buckets, subSeries: {mssql: buckets}})).toBe(true);
  });
  it("rejects subSeries entries that are not bucket arrays", () => {
    expect(isServiceSeries({service: "api.arolariu.ro", buckets, subSeries: {mssql: {not: "an array"}}})).toBe(false);
  });

  it("rejects a series containing malformed child history", () => {
    const childBucket = {...buckets[0], latency: {p50: 25, p99: 20}};
    const candidate = {service: "api.arolariu.ro", buckets, subSeries: {mssql: [childBucket]}};

    expect(isServiceSeries(candidate)).toBe(false);
  });

  it.each([
    ["a missing parent history", {buckets: null}],
    ["an unknown service identifier", {service: "unknown.example"}],
    ["an array instead of a sub-series map", {subSeries: []}],
  ])("rejects a service series with %s", (_condition, invalid) => {
    const candidate = {service: "api.arolariu.ro", buckets, ...invalid};

    expect(isServiceSeries(candidate)).toBe(false);
  });
});

describe("isAggregateFile", () => {
  const valid30m = {generatedAt: "2026-04-19T14:00:00Z", bucketSize: "30m", windowDays: 14, services: []};
  const valid1h = {generatedAt: "2026-04-19T14:00:00Z", bucketSize: "1h", windowDays: 90, services: []};
  const valid1d = {generatedAt: "2026-04-19T14:00:00Z", bucketSize: "1d", windowDays: 365, services: []};
  it("accepts each valid (bucketSize, windowDays) pair", () => {
    expect(isAggregateFile(valid30m)).toBe(true);
    expect(isAggregateFile(valid1h)).toBe(true);
    expect(isAggregateFile(valid1d)).toBe(true);
  });
  it("rejects wrong bucketSize", () => {
    expect(isAggregateFile({...valid30m, bucketSize: "5m"})).toBe(false);
  });
  it("rejects mismatched (bucketSize, windowDays) pairs", () => {
    expect(isAggregateFile({...valid30m, windowDays: 90})).toBe(false); // 30m must pair with 14
    expect(isAggregateFile({...valid1h, windowDays: 14})).toBe(false); // 1h must pair with 90
    expect(isAggregateFile({...valid1d, windowDays: 90})).toBe(false); // 1d must pair with 365
  });

  it.each([
    ["an array instead of the envelope", []],
    ["a non-text generation timestamp", {...valid30m, generatedAt: 0}],
    ["a non-text bucket size", {...valid30m, bucketSize: 30}],
    ["a non-array service list", {...valid30m, services: null}],
    ["a null service entry", {...valid30m, services: [null]}],
    ["a null measurement", {...valid30m, services: [{service: "arolariu.ro", buckets: [null]}]}],
  ])("rejects a history response with %s", (_condition, response) => {
    expect(isAggregateFile(response)).toBe(false);
  });
});

describe("isIncident", () => {
  const validOpen = {
    id: "inc-1",
    service: "api.arolariu.ro",
    status: "open",
    startedAt: "2026-04-19T14:00:00Z",
    severity: "Degraded",
    reason: "slow",
    probeCount: 2,
  };
  const validResolved = {
    ...validOpen,
    status: "resolved",
    resolvedAt: "2026-04-19T15:00:00Z",
    durationMs: 3600000,
  };
  it("accepts valid open", () => {
    expect(isIncident(validOpen)).toBe(true);
  });
  it("accepts valid resolved", () => {
    expect(isIncident(validResolved)).toBe(true);
  });
  it("rejects open that carries resolvedAt (invariant: resolved iff resolvedAt set)", () => {
    expect(isIncident({...validOpen, resolvedAt: "2026-04-19T15:00:00Z"})).toBe(false);
  });
  it("rejects resolved without resolvedAt", () => {
    const {resolvedAt: _rm, ...noResolvedAt} = validResolved;
    expect(isIncident(noResolvedAt)).toBe(false);
  });
  it("rejects resolved without durationMs", () => {
    const {durationMs: _dm, ...noDuration} = validResolved;
    expect(isIncident(noDuration)).toBe(false);
  });
  it("rejects negative probeCount", () => {
    expect(isIncident({...validOpen, probeCount: -1})).toBe(false);
  });
  it("rejects incidents with an unsupported status", () => {
    expect(isIncident({...validOpen, status: "paused"})).toBe(false);
  });

  it.each([
    ["a numeric identifier", {id: 42}],
    ["an unknown affected service", {service: "unknown.example"}],
    ["a non-text start time", {startedAt: null}],
    ["a healthy severity", {severity: "Healthy"}],
    ["a non-text reason", {reason: {message: "failed"}}],
  ])("rejects an open incident with %s", (_condition, invalid) => {
    const candidate = {...validOpen, ...invalid};

    expect(isIncident(candidate)).toBe(false);
  });
});

describe("isBucket invariant enforcement", () => {
  const valid = {
    t: "2026-04-19T14:00:00Z",
    status: "Healthy",
    probes: {healthy: 1, total: 2},
    latency: {p50: 100, p99: 300},
  };
  it("rejects healthy > total", () => {
    expect(isBucket({...valid, probes: {healthy: 3, total: 2}})).toBe(false);
  });
  it("rejects negative probes.healthy", () => {
    expect(isBucket({...valid, probes: {healthy: -1, total: 1}})).toBe(false);
  });
  it("rejects p50 > p99", () => {
    expect(isBucket({...valid, latency: {p50: 500, p99: 100}})).toBe(false);
  });
  it("rejects negative p50", () => {
    expect(isBucket({...valid, latency: {p50: -1, p99: 100}})).toBe(false);
  });
});

describe("isIncidentsFile", () => {
  it("accepts empty", () => {
    expect(isIncidentsFile({generatedAt: "2026-04-19T14:00:00Z", incidents: []})).toBe(true);
  });
  it("rejects missing incidents array", () => {
    expect(isIncidentsFile({generatedAt: "2026-04-19T14:00:00Z"})).toBe(false);
  });

  it.each([
    ["a null envelope", null],
    ["a null timeline entry", {generatedAt: "2026-04-19T14:00:00Z", incidents: [null]}],
  ])("rejects an incident response with %s", (_condition, response) => {
    expect(isIncidentsFile(response)).toBe(false);
  });

  it("rejects a mixed feed containing a child incident with a non-text sub-check", () => {
    const base = {
      service: "api.arolariu.ro",
      status: "open",
      startedAt: "2026-04-19T13:30:00Z",
      severity: "Unhealthy",
      reason: "Connection failed",
      probeCount: 2,
    };
    const valid = {...base, id: "mssql", subCheck: "mssql"};
    const invalid = {...base, id: "redis", subCheck: {name: "redis"}};
    const generatedAt = "2026-04-19T14:00:00Z";

    expect(isIncidentsFile({generatedAt, incidents: [valid]})).toBe(true);
    expect(isIncidentsFile({generatedAt, incidents: [valid, invalid]})).toBe(false);
  });
});
