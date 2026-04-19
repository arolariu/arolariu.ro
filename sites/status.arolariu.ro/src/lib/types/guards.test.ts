import {describe, it, expect} from "vitest";
import {
  isHealthStatus, isServiceId, isSubCheck, isProbeResult, isBucket,
  isServiceSeries, isAggregateFile, isIncident, isIncidentsFile,
} from "./guards";

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
  it("accepts minimal valid", () => {
    expect(isSubCheck({name: "mssql", status: "Healthy", durationMs: 12})).toBe(true);
  });
  it("rejects missing fields", () => {
    expect(isSubCheck({name: "mssql", status: "Healthy"})).toBe(false);
  });
  it("rejects wrong types", () => {
    expect(isSubCheck({name: "mssql", status: "bad", durationMs: 12})).toBe(false);
  });
});

describe("isProbeResult", () => {
  const valid = {
    service: "api.arolariu.ro", timestamp: "2026-04-19T14:00:00Z",
    latencyMs: 142, httpStatus: 200, overall: "Healthy",
  };
  it("accepts valid", () => { expect(isProbeResult(valid)).toBe(true); });
  it("accepts with subChecks", () => {
    expect(isProbeResult({...valid, subChecks: [{name: "x", status: "Healthy", durationMs: 5}]})).toBe(true);
  });
  it("rejects invalid subChecks array", () => {
    expect(isProbeResult({...valid, subChecks: [{name: "x"}]})).toBe(false);
  });
});

describe("isBucket", () => {
  const valid = {
    t: "2026-04-19T14:00:00Z", status: "Healthy",
    probes: {healthy: 2, total: 2}, latency: {p50: 100, p99: 300},
  };
  it("accepts valid", () => { expect(isBucket(valid)).toBe(true); });
  it("rejects missing latency fields", () => {
    expect(isBucket({...valid, latency: {p50: 100}})).toBe(false);
  });
});

describe("isServiceSeries", () => {
  const buckets = [{
    t: "2026-04-19T14:00:00Z", status: "Healthy",
    probes: {healthy: 1, total: 1}, latency: {p50: 10, p99: 20},
  }];
  it("accepts minimal", () => {
    expect(isServiceSeries({service: "arolariu.ro", buckets})).toBe(true);
  });
  it("accepts with subSeries", () => {
    expect(isServiceSeries({service: "api.arolariu.ro", buckets, subSeries: {mssql: buckets}})).toBe(true);
  });
});

describe("isAggregateFile", () => {
  const valid = {generatedAt: "2026-04-19T14:00:00Z", bucketSize: "30m", windowDays: 14, services: []};
  it("accepts valid", () => { expect(isAggregateFile(valid)).toBe(true); });
  it("rejects wrong bucketSize", () => {
    expect(isAggregateFile({...valid, bucketSize: "5m"})).toBe(false);
  });
  it("rejects windowDays not in set", () => {
    expect(isAggregateFile({...valid, windowDays: 30})).toBe(false);
  });
});

describe("isIncident", () => {
  const valid = {
    id: "inc-1", service: "api.arolariu.ro", status: "open",
    startedAt: "2026-04-19T14:00:00Z", severity: "Degraded",
    reason: "slow", probeCount: 2,
  };
  it("accepts valid", () => { expect(isIncident(valid)).toBe(true); });
  it("accepts resolved", () => {
    expect(isIncident({...valid, status: "resolved", resolvedAt: "2026-04-19T15:00:00Z", durationMs: 3600000})).toBe(true);
  });
});

describe("isIncidentsFile", () => {
  it("accepts empty", () => {
    expect(isIncidentsFile({generatedAt: "2026-04-19T14:00:00Z", incidents: []})).toBe(true);
  });
  it("rejects missing incidents array", () => {
    expect(isIncidentsFile({generatedAt: "2026-04-19T14:00:00Z"})).toBe(false);
  });
});
