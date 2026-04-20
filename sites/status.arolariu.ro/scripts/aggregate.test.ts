// @vitest-environment node
import {describe, it, expect, beforeEach, afterEach} from "vitest";
import {mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import type {ProbeResult, AggregateFile} from "../src/lib/types/status";
import {bucketStart, rebuildFine, runAggregate} from "./aggregate";

describe("bucketStart", () => {
  it("rounds to 30-min boundaries", () => {
    expect(bucketStart(new Date("2026-04-19T14:17:12Z"), "30m")).toBe("2026-04-19T14:00:00.000Z");
    expect(bucketStart(new Date("2026-04-19T14:45:12Z"), "30m")).toBe("2026-04-19T14:30:00.000Z");
  });
  it("rounds to hour", () => {
    expect(bucketStart(new Date("2026-04-19T14:45:12Z"), "1h")).toBe("2026-04-19T14:00:00.000Z");
  });
  it("rounds to day", () => {
    expect(bucketStart(new Date("2026-04-19T14:45:12Z"), "1d")).toBe("2026-04-19T00:00:00.000Z");
  });
});

function mkProbe(service: string, ts: string, overall: "Healthy" | "Degraded" | "Unhealthy", latencyMs = 100): ProbeResult {
  return {
    service: service as ProbeResult["service"], timestamp: ts, latencyMs,
    httpStatus: overall === "Healthy" ? 200 : 503, overall,
  };
}

describe("rebuildFine", () => {
  it("groups probes into 30-min buckets per service", () => {
    const probes: ProbeResult[] = [
      mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Healthy", 100),
      mkProbe("arolariu.ro", "2026-04-19T14:15:00Z", "Healthy", 200),
      mkProbe("arolariu.ro", "2026-04-19T14:45:00Z", "Degraded", 500),
    ];
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    expect(agg.bucketSize).toBe("30m");
    expect(agg.windowDays).toBe(14);
    const arolariu = agg.services.find(s => s.service === "arolariu.ro")!;
    expect(arolariu.buckets).toHaveLength(2);
    expect(arolariu.buckets[0].t).toBe("2026-04-19T14:00:00.000Z");
    expect(arolariu.buckets[0].probes).toEqual({healthy: 2, total: 2});
    expect(arolariu.buckets[0].latency.p50).toBe(150);
    expect(arolariu.buckets[1].status).toBe("Degraded");
  });

  it("picks worst status when bucket has mixed health", () => {
    const probes: ProbeResult[] = [
      mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Healthy"),
      mkProbe("arolariu.ro", "2026-04-19T14:15:00Z", "Unhealthy"),
    ];
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    expect(agg.services[0].buckets[0].status).toBe("Unhealthy");
    expect(agg.services[0].buckets[0].probes).toEqual({healthy: 1, total: 2});
  });

  it("computes sub-series for api.arolariu.ro when subChecks present", () => {
    const probes: ProbeResult[] = [{
      service: "api.arolariu.ro", timestamp: "2026-04-19T14:00:00Z", latencyMs: 100,
      httpStatus: 200, overall: "Degraded",
      subChecks: [
        {name: "mssql", status: "Degraded", durationMs: 800, description: "slow"},
        {name: "cosmosdb", status: "Healthy", durationMs: 40},
      ],
    }];
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    const api = agg.services.find(s => s.service === "api.arolariu.ro")!;
    expect(api.subSeries).toBeDefined();
    expect(api.subSeries!.mssql).toHaveLength(1);
    expect(api.subSeries!.mssql[0].status).toBe("Degraded");
    expect(api.subSeries!.cosmosdb[0].status).toBe("Healthy");
  });

  it("sums sampleCount across probes in a bucket", () => {
    const probes: ProbeResult[] = [
      {service: "arolariu.ro", timestamp: "2026-04-19T14:00:00Z", latencyMs: 100, httpStatus: 200, overall: "Healthy", sampleCount: 3},
      {service: "arolariu.ro", timestamp: "2026-04-19T14:15:00Z", latencyMs: 100, httpStatus: 200, overall: "Healthy", sampleCount: 3},
    ];
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    const bucket = agg.services[0].buckets[0];
    expect(bucket.probes).toEqual({healthy: 6, total: 6});
  });

  it("drops probes older than 14 days", () => {
    const probes: ProbeResult[] = [
      mkProbe("arolariu.ro", "2026-04-01T00:00:00Z", "Healthy"),
      mkProbe("arolariu.ro", "2026-04-18T14:00:00Z", "Healthy"),
    ];
    const agg = rebuildFine(probes, new Date("2026-04-19T00:00:00Z"));
    expect(agg.services[0].buckets).toHaveLength(1);
    expect(agg.services[0].buckets[0].t).toBe("2026-04-18T14:00:00.000Z");
  });
});

describe("runAggregate (fine.json path)", () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "status-agg-"));
    mkdirSync(join(dataDir, "raw"), {recursive: true});
  });
  afterEach(() => {
    rmSync(dataDir, {recursive: true, force: true});
  });

  it("reads raw JSONL files and writes fine.json", async () => {
    const probe = mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Healthy");
    writeFileSync(join(dataDir, "raw", "2026-04-19.jsonl"), JSON.stringify(probe) + "\n");
    await runAggregate({dataDir, now: new Date("2026-04-19T14:30:00Z")});
    const fine = JSON.parse(readFileSync(join(dataDir, "fine.json"), "utf8")) as AggregateFile;
    expect(fine.bucketSize).toBe("30m");
    expect(fine.services.find(s => s.service === "arolariu.ro")!.buckets).toHaveLength(1);
  });
});

describe("mergeHourly", () => {
  it("creates hourly buckets from today+yesterday probes", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "status-hourly-"));
    mkdirSync(join(tempDir, "raw"), {recursive: true});
    const probes = [
      mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Healthy", 100),
      mkProbe("arolariu.ro", "2026-04-19T14:30:00Z", "Healthy", 200),
      mkProbe("arolariu.ro", "2026-04-18T10:00:00Z", "Degraded", 300),
    ];
    writeFileSync(join(tempDir, "raw", "2026-04-19.jsonl"),
      probes.filter(p => p.timestamp.startsWith("2026-04-19")).map(p => JSON.stringify(p)).join("\n") + "\n");
    writeFileSync(join(tempDir, "raw", "2026-04-18.jsonl"),
      probes.filter(p => p.timestamp.startsWith("2026-04-18")).map(p => JSON.stringify(p)).join("\n") + "\n");

    await runAggregate({dataDir: tempDir, now: new Date("2026-04-19T15:00:00Z")});
    const hourly = JSON.parse(readFileSync(join(tempDir, "hourly.json"), "utf8")) as AggregateFile;
    const arolariu = hourly.services.find(s => s.service === "arolariu.ro")!;
    expect(arolariu.buckets.find(b => b.t === "2026-04-19T14:00:00.000Z")).toBeDefined();
    expect(arolariu.buckets.find(b => b.t === "2026-04-19T14:00:00.000Z")!.probes.total).toBe(2);
    rmSync(tempDir, {recursive: true, force: true});
  });

  it("preserves previous hourly buckets older than yesterday", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "status-hourly-"));
    mkdirSync(join(tempDir, "raw"), {recursive: true});
    const prev: AggregateFile = {
      generatedAt: "2026-04-18T00:00:00.000Z",
      bucketSize: "1h", windowDays: 90,
      services: [{
        service: "arolariu.ro",
        buckets: [{
          t: "2026-04-10T10:00:00.000Z", status: "Healthy",
          probes: {healthy: 2, total: 2}, latency: {p50: 100, p99: 100},
        }],
      }],
    };
    writeFileSync(join(tempDir, "hourly.json"), JSON.stringify(prev));
    writeFileSync(join(tempDir, "raw", "2026-04-19.jsonl"),
      JSON.stringify(mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Healthy")) + "\n");

    await runAggregate({dataDir: tempDir, now: new Date("2026-04-19T15:00:00Z")});
    const hourly = JSON.parse(readFileSync(join(tempDir, "hourly.json"), "utf8")) as AggregateFile;
    const arolariu = hourly.services.find(s => s.service === "arolariu.ro")!;
    expect(arolariu.buckets.find(b => b.t === "2026-04-10T10:00:00.000Z")).toBeDefined();
    rmSync(tempDir, {recursive: true, force: true});
  });

  it("drops hourly buckets older than 90 days", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "status-hourly-"));
    mkdirSync(join(tempDir, "raw"), {recursive: true});
    const prev: AggregateFile = {
      generatedAt: "2026-04-18T00:00:00.000Z",
      bucketSize: "1h", windowDays: 90,
      services: [{
        service: "arolariu.ro",
        buckets: [{
          t: "2025-12-01T00:00:00.000Z", status: "Healthy",
          probes: {healthy: 1, total: 1}, latency: {p50: 100, p99: 100},
        }],
      }],
    };
    writeFileSync(join(tempDir, "hourly.json"), JSON.stringify(prev));
    await runAggregate({dataDir: tempDir, now: new Date("2026-04-19T00:00:00Z")});
    const hourly = JSON.parse(readFileSync(join(tempDir, "hourly.json"), "utf8")) as AggregateFile;
    const arolariu = hourly.services.find(s => s.service === "arolariu.ro");
    expect(arolariu?.buckets.find(b => b.t === "2025-12-01T00:00:00.000Z")).toBeUndefined();
    rmSync(tempDir, {recursive: true, force: true});
  });
});

describe("prune raw files older than 14 days", () => {
  it("deletes raw JSONL files with date >14 days old", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "status-prune-"));
    mkdirSync(join(tempDir, "raw"), {recursive: true});
    writeFileSync(join(tempDir, "raw", "2026-04-01.jsonl"), "");
    writeFileSync(join(tempDir, "raw", "2026-04-10.jsonl"), "");
    await runAggregate({dataDir: tempDir, now: new Date("2026-04-19T00:00:00Z")});
    const remaining = readdirSync(join(tempDir, "raw"));
    expect(remaining).not.toContain("2026-04-01.jsonl");
    expect(remaining).toContain("2026-04-10.jsonl");
    rmSync(tempDir, {recursive: true, force: true});
  });
});

describe("mergeDaily", () => {
  it("creates daily buckets from today+yesterday probes and writes daily.json", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "status-daily-"));
    mkdirSync(join(tempDir, "raw"), {recursive: true});
    writeFileSync(join(tempDir, "raw", "2026-04-19.jsonl"),
      JSON.stringify(mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Healthy")) + "\n");
    await runAggregate({dataDir: tempDir, now: new Date("2026-04-19T15:00:00Z")});
    const daily = JSON.parse(readFileSync(join(tempDir, "daily.json"), "utf8")) as AggregateFile;
    expect(daily.bucketSize).toBe("1d");
    expect(daily.windowDays).toBe(365);
    rmSync(tempDir, {recursive: true, force: true});
  });
});
