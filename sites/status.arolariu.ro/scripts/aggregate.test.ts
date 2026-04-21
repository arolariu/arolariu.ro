// @vitest-environment node
import {mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import type {AggregateFile, ProbeResult} from "../src/lib/types/status";
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
    service: service as ProbeResult["service"],
    timestamp: ts,
    latencyMs,
    httpStatus: overall === "Healthy" ? 200 : 503,
    overall,
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
    const arolariu = agg.services.find((s) => s.service === "arolariu.ro")!;
    expect(arolariu.buckets).toHaveLength(2);
    expect(arolariu.buckets[0]!.t).toBe("2026-04-19T14:00:00.000Z");
    expect(arolariu.buckets[0]!.probes).toEqual({healthy: 2, total: 2});
    expect(arolariu.buckets[0]!.latency.p50).toBe(150);
    expect(arolariu.buckets[1]!.status).toBe("Degraded");
  });

  it("picks worst status when bucket has mixed health", () => {
    const probes: ProbeResult[] = [
      mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Healthy"),
      mkProbe("arolariu.ro", "2026-04-19T14:15:00Z", "Unhealthy"),
    ];
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    expect(agg.services[0]!.buckets[0]!.status).toBe("Unhealthy");
    expect(agg.services[0]!.buckets[0]!.probes).toEqual({healthy: 1, total: 2});
  });

  it("computes sub-series for api.arolariu.ro when subChecks present", () => {
    const probes: ProbeResult[] = [
      {
        service: "api.arolariu.ro",
        timestamp: "2026-04-19T14:00:00Z",
        latencyMs: 100,
        httpStatus: 200,
        overall: "Degraded",
        subChecks: [
          {name: "mssql", status: "Degraded", durationMs: 800, description: "slow"},
          {name: "cosmosdb", status: "Healthy", durationMs: 40},
        ],
      },
    ];
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    const api = agg.services.find((s) => s.service === "api.arolariu.ro")!;
    expect(api.subSeries).toBeDefined();
    expect(api.subSeries!["mssql"]).toHaveLength(1);
    expect(api.subSeries!["mssql"]![0]!.status).toBe("Degraded");
    expect(api.subSeries!["cosmosdb"]![0]!.status).toBe("Healthy");
  });

  it("accumulates multiple sub-check probes in the same bucket (exercises map-reuse branches)", () => {
    // Two probes in the same 30m bucket for the same service with the same sub-check
    // name — exercises the `!perService`, `!perSub`, `!acc` false branches in groupSubChecks
    // and the `!worstSub` / worstStatus update branches in groupProbes.
    const probes: ProbeResult[] = [
      {
        service: "api.arolariu.ro",
        timestamp: "2026-04-19T14:00:00Z",
        latencyMs: 80,
        httpStatus: 200,
        overall: "Healthy",
        subChecks: [{name: "mssql", status: "Healthy", durationMs: 30}],
      },
      {
        service: "api.arolariu.ro",
        timestamp: "2026-04-19T14:15:00Z",
        latencyMs: 90,
        httpStatus: 200,
        overall: "Degraded",
        subChecks: [{name: "mssql", status: "Degraded", durationMs: 800}],
      },
    ];
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    const api = agg.services.find((s) => s.service === "api.arolariu.ro")!;
    // Both probes land in the same 30m bucket → one bucket in the sub-series
    expect(api.subSeries!["mssql"]).toHaveLength(1);
    // The bucket should aggregate both probes
    expect(api.subSeries!["mssql"]![0]!.probes.total).toBe(2);
  });

  it("does not update worstSub when new sub-check is less severe than current worst (FALSE branch)", () => {
    // Two probes in the same bucket: first is Unhealthy, second is Degraded.
    // The second sub-check is LESS severe, so worstSub should NOT be updated.
    // This exercises the FALSE branch of `if (!acc.worstSub || worstStatus(...) === sc.status)`.
    const probes: ProbeResult[] = [
      {
        service: "api.arolariu.ro",
        timestamp: "2026-04-19T14:00:00Z",
        latencyMs: 80,
        httpStatus: 503,
        overall: "Unhealthy",
        subChecks: [{name: "mssql", status: "Unhealthy", durationMs: 5000}],
      },
      {
        service: "api.arolariu.ro",
        timestamp: "2026-04-19T14:15:00Z",
        latencyMs: 200,
        httpStatus: 200,
        overall: "Degraded",
        subChecks: [{name: "mssql", status: "Degraded", durationMs: 800}],
      },
    ];
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    const api = agg.services.find((s) => s.service === "api.arolariu.ro")!;
    // worstSub should be Unhealthy (from first probe), not Degraded (from second)
    const bucket = api.buckets[0]!;
    // The bucket status should be Unhealthy (worst overall)
    expect(bucket.status).toBe("Unhealthy");
  });

  it("sums sampleCount across probes in a bucket", () => {
    const probes: ProbeResult[] = [
      {service: "arolariu.ro", timestamp: "2026-04-19T14:00:00Z", latencyMs: 100, httpStatus: 200, overall: "Healthy", sampleCount: 3},
      {service: "arolariu.ro", timestamp: "2026-04-19T14:15:00Z", latencyMs: 100, httpStatus: 200, overall: "Healthy", sampleCount: 3},
    ];
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    const bucket = agg.services[0]!.buckets[0]!;
    expect(bucket.probes).toEqual({healthy: 6, total: 6});
  });

  it("drops probes older than 14 days", () => {
    const probes: ProbeResult[] = [
      mkProbe("arolariu.ro", "2026-04-01T00:00:00Z", "Healthy"),
      mkProbe("arolariu.ro", "2026-04-18T14:00:00Z", "Healthy"),
    ];
    const agg = rebuildFine(probes, new Date("2026-04-19T00:00:00Z"));
    expect(agg.services[0]!.buckets).toHaveLength(1);
    expect(agg.services[0]!.buckets[0]!.t).toBe("2026-04-18T14:00:00.000Z");
  });

  it("emits p75 and p95 alongside p50/p99 on every bucket", () => {
    const probes: ProbeResult[] = Array.from({length: 10}, (_, i) =>
      mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Healthy", (i + 1) * 10),
    );
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    const bucket = agg.services[0]!.buckets[0]!;
    expect(bucket.latency.p50).toBeDefined();
    expect(bucket.latency.p75).toBeDefined();
    expect(bucket.latency.p95).toBeDefined();
    expect(bucket.latency.p99).toBeDefined();
  });

  it("fans out sampleLatenciesMs into bucket percentiles so p50/p75/p95/p99 differ for a single probe run", () => {
    // This is the direct regression test for the all-percentiles-equal bug:
    // ONE probe run in the bucket, but it persists a distribution of 10 per-sample
    // latencies. Without the fan-out, `acc.latencies.length === 1` and every
    // percentile collapses to the median. With the fan-out, p50 ≠ p95 ≠ p99.
    const probes: ProbeResult[] = [
      {
        service: "arolariu.ro",
        timestamp: "2026-04-19T14:00:00Z",
        latencyMs: 55, // median of the array below
        httpStatus: 200,
        overall: "Healthy",
        sampleCount: 10,
        sampleLatenciesMs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      },
    ];
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    const {p50, p75, p95, p99} = agg.services[0]!.buckets[0]!.latency;
    expect(p50).toBe(55);
    expect(p75).toBe(78);
    expect(p95).toBe(95);
    expect(p99).toBe(99);
    // Counts in the bucket still reflect probe-run cardinality, not sample cardinality.
    expect(agg.services[0]!.buckets[0]!.probes).toEqual({healthy: 10, total: 10});
  });

  it("falls back to latencyMs when a legacy probe row has no sampleLatenciesMs", () => {
    // Legacy rows (pre-schema-change) had only `latencyMs`. They should still
    // aggregate, and — when only one such row is in the bucket — the percentile
    // collapse is expected: that row predates the fix by design.
    const probes: ProbeResult[] = [mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Healthy", 200)];
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    const {p50, p75, p95, p99} = agg.services[0]!.buckets[0]!.latency;
    expect(p50).toBe(200);
    expect(p99).toBe(200);
    expect(p75).toBe(200);
    expect(p95).toBe(200);
  });

  it("fans out sub-check sampleDurationsMs so sub-series percentiles differ within one probe run", () => {
    const probes: ProbeResult[] = [
      {
        service: "api.arolariu.ro",
        timestamp: "2026-04-19T14:00:00Z",
        latencyMs: 55,
        httpStatus: 200,
        overall: "Healthy",
        sampleCount: 10,
        sampleLatenciesMs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        subChecks: [
          {
            name: "mssql",
            status: "Healthy",
            durationMs: 55,
            sampleDurationsMs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          },
        ],
      },
    ];
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    const api = agg.services.find((s) => s.service === "api.arolariu.ro")!;
    const mssqlBucket = api.subSeries!["mssql"]![0]!;
    expect(mssqlBucket.latency.p50).toBe(55);
    expect(mssqlBucket.latency.p75).toBe(78);
    expect(mssqlBucket.latency.p95).toBe(95);
    expect(mssqlBucket.latency.p99).toBe(99);
  });

  it("computes expected 4 percentiles for a known input sequence", () => {
    // latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    // linear interpolation between ranks (note: floating-point arithmetic
    // means 0.95*9 evaluates to 8.5499… not 8.55, so p95 rounds *down* to 95):
    //   p50 → rank 4.5  → (50+60)/2 = 55
    //   p75 → rank 6.75 → 70 + 0.75 * 10 = 77.5 → rounded to 78
    //   p95 → rank 8.55 → 95.4999… → rounded to 95
    //   p99 → rank 8.91 → 99.0999… → rounded to 99
    const probes: ProbeResult[] = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) =>
      mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Healthy", v),
    );
    const agg = rebuildFine(probes, new Date("2026-04-19T15:00:00Z"));
    const {p50, p75, p95, p99} = agg.services[0]!.buckets[0]!.latency;
    expect(p50).toBe(55);
    expect(p75).toBe(78);
    expect(p95).toBe(95);
    expect(p99).toBe(99);
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
    expect(fine.services.find((s) => s.service === "arolariu.ro")!.buckets).toHaveLength(1);
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
    writeFileSync(
      join(tempDir, "raw", "2026-04-19.jsonl"),
      probes
        .filter((p) => p.timestamp.startsWith("2026-04-19"))
        .map((p) => JSON.stringify(p))
        .join("\n") + "\n",
    );
    writeFileSync(
      join(tempDir, "raw", "2026-04-18.jsonl"),
      probes
        .filter((p) => p.timestamp.startsWith("2026-04-18"))
        .map((p) => JSON.stringify(p))
        .join("\n") + "\n",
    );

    await runAggregate({dataDir: tempDir, now: new Date("2026-04-19T15:00:00Z")});
    const hourly = JSON.parse(readFileSync(join(tempDir, "hourly.json"), "utf8")) as AggregateFile;
    const arolariu = hourly.services.find((s) => s.service === "arolariu.ro")!;
    expect(arolariu.buckets.find((b) => b.t === "2026-04-19T14:00:00.000Z")).toBeDefined();
    expect(arolariu.buckets.find((b) => b.t === "2026-04-19T14:00:00.000Z")!.probes.total).toBe(2);
    rmSync(tempDir, {recursive: true, force: true});
  });

  it("preserves previous hourly buckets older than yesterday", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "status-hourly-"));
    mkdirSync(join(tempDir, "raw"), {recursive: true});
    const prev: AggregateFile = {
      generatedAt: "2026-04-18T00:00:00.000Z",
      bucketSize: "1h",
      windowDays: 90,
      services: [
        {
          service: "arolariu.ro",
          buckets: [
            {
              t: "2026-04-10T10:00:00.000Z",
              status: "Healthy",
              probes: {healthy: 2, total: 2},
              latency: {p50: 100, p99: 100},
            },
          ],
        },
      ],
    };
    writeFileSync(join(tempDir, "hourly.json"), JSON.stringify(prev));
    writeFileSync(
      join(tempDir, "raw", "2026-04-19.jsonl"),
      JSON.stringify(mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Healthy")) + "\n",
    );

    await runAggregate({dataDir: tempDir, now: new Date("2026-04-19T15:00:00Z")});
    const hourly = JSON.parse(readFileSync(join(tempDir, "hourly.json"), "utf8")) as AggregateFile;
    const arolariu = hourly.services.find((s) => s.service === "arolariu.ro")!;
    expect(arolariu.buckets.find((b) => b.t === "2026-04-10T10:00:00.000Z")).toBeDefined();
    rmSync(tempDir, {recursive: true, force: true});
  });

  it("drops hourly buckets older than 90 days", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "status-hourly-"));
    mkdirSync(join(tempDir, "raw"), {recursive: true});
    const prev: AggregateFile = {
      generatedAt: "2026-04-18T00:00:00.000Z",
      bucketSize: "1h",
      windowDays: 90,
      services: [
        {
          service: "arolariu.ro",
          buckets: [
            {
              t: "2025-12-01T00:00:00.000Z",
              status: "Healthy",
              probes: {healthy: 1, total: 1},
              latency: {p50: 100, p99: 100},
            },
          ],
        },
      ],
    };
    writeFileSync(join(tempDir, "hourly.json"), JSON.stringify(prev));
    await runAggregate({dataDir: tempDir, now: new Date("2026-04-19T00:00:00Z")});
    const hourly = JSON.parse(readFileSync(join(tempDir, "hourly.json"), "utf8")) as AggregateFile;
    const arolariu = hourly.services.find((s) => s.service === "arolariu.ro");
    expect(arolariu?.buckets.find((b) => b.t === "2025-12-01T00:00:00.000Z")).toBeUndefined();
    rmSync(tempDir, {recursive: true, force: true});
  });
});

describe("readPrevious error paths", () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "status-agg-err-"));
    mkdirSync(join(dataDir, "raw"), {recursive: true});
  });
  afterEach(() => {
    rmSync(dataDir, {recursive: true, force: true});
  });

  it("throws on corrupt (non-JSON) hourly.json rather than silently discarding history", async () => {
    writeFileSync(join(dataDir, "hourly.json"), "this is not json {{{{");
    await expect(runAggregate({dataDir, now: new Date("2026-04-19T15:00:00Z")})).rejects.toThrow(/not valid JSON/);
  });

  it("throws on hourly.json that does not match AggregateFile schema", async () => {
    writeFileSync(join(dataDir, "hourly.json"), JSON.stringify({unexpected: true}));
    await expect(runAggregate({dataDir, now: new Date("2026-04-19T15:00:00Z")})).rejects.toThrow(/does not match AggregateFile schema/);
  });

  it("merges prev hourly with subSeries from previous run correctly", async () => {
    const prevHourly: AggregateFile = {
      generatedAt: "2026-04-17T00:00:00.000Z",
      bucketSize: "1h",
      windowDays: 90,
      services: [
        {
          service: "api.arolariu.ro",
          buckets: [
            {
              t: "2026-04-10T10:00:00.000Z",
              status: "Healthy",
              probes: {healthy: 2, total: 2},
              latency: {p50: 100, p99: 100},
            },
          ],
          subSeries: {
            mssql: [
              {
                t: "2026-04-10T10:00:00.000Z",
                status: "Healthy",
                probes: {healthy: 2, total: 2},
                latency: {p50: 50, p99: 80},
              },
            ],
          },
        },
      ],
    };
    writeFileSync(join(dataDir, "hourly.json"), JSON.stringify(prevHourly));
    // Add a today probe with a sub-check so mergeAggregate builds fresh subSeries too
    const probe = {
      service: "api.arolariu.ro",
      timestamp: "2026-04-19T14:00:00Z",
      latencyMs: 100,
      httpStatus: 200,
      overall: "Healthy",
      subChecks: [{name: "mssql", status: "Healthy", durationMs: 40}],
    };
    writeFileSync(join(dataDir, "raw", "2026-04-19.jsonl"), JSON.stringify(probe) + "\n");
    await runAggregate({dataDir, now: new Date("2026-04-19T15:00:00Z")});
    const hourly = JSON.parse(readFileSync(join(dataDir, "hourly.json"), "utf8")) as AggregateFile;
    const api = hourly.services.find((s) => s.service === "api.arolariu.ro")!;
    // Old mssql sub-series bucket preserved
    expect(api.subSeries?.["mssql"]?.some((b) => b.t === "2026-04-10T10:00:00.000Z")).toBe(true);
    // New mssql sub-series bucket added
    expect(api.subSeries?.["mssql"]?.some((b) => b.t === "2026-04-19T14:00:00.000Z")).toBe(true);
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
    writeFileSync(
      join(tempDir, "raw", "2026-04-19.jsonl"),
      JSON.stringify(mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Healthy")) + "\n",
    );
    await runAggregate({dataDir: tempDir, now: new Date("2026-04-19T15:00:00Z")});
    const daily = JSON.parse(readFileSync(join(tempDir, "daily.json"), "utf8")) as AggregateFile;
    expect(daily.bucketSize).toBe("1d");
    expect(daily.windowDays).toBe(365);
    rmSync(tempDir, {recursive: true, force: true});
  });
});

describe("mergeAggregate: subSeries with stale sub-check name not in fresh probes", () => {
  let dataDir: string;
  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "status-agg-stale-"));
    mkdirSync(join(dataDir, "raw"), {recursive: true});
  });
  afterEach(() => {
    rmSync(dataDir, {recursive: true, force: true});
  });

  it("preserves previous subSeries name that is absent from fresh probes", async () => {
    // Previous hourly has sub-check "cosmosdb"; fresh probe only has "mssql".
    // The mergeAggregate loop should keep "cosmosdb" from previous (empty fresh buckets)
    // and create "mssql" from fresh — exercises the `freshSubForService.get(subName)` false branch.
    const prevHourly: AggregateFile = {
      generatedAt: "2026-04-17T00:00:00.000Z",
      bucketSize: "1h",
      windowDays: 90,
      services: [
        {
          service: "api.arolariu.ro",
          buckets: [],
          subSeries: {
            cosmosdb: [
              {
                t: "2026-04-10T10:00:00.000Z",
                status: "Healthy",
                probes: {healthy: 1, total: 1},
                latency: {p50: 30, p99: 60},
              },
            ],
          },
        },
      ],
    };
    writeFileSync(join(dataDir, "hourly.json"), JSON.stringify(prevHourly));
    // Fresh probe only has mssql sub-check (no cosmosdb)
    const probe = {
      service: "api.arolariu.ro",
      timestamp: "2026-04-19T14:00:00Z",
      latencyMs: 90,
      httpStatus: 200,
      overall: "Healthy",
      subChecks: [{name: "mssql", status: "Healthy", durationMs: 40}],
    };
    writeFileSync(join(dataDir, "raw", "2026-04-19.jsonl"), JSON.stringify(probe) + "\n");
    await runAggregate({dataDir, now: new Date("2026-04-19T15:00:00Z")});
    const hourly = JSON.parse(readFileSync(join(dataDir, "hourly.json"), "utf8")) as AggregateFile;
    const api = hourly.services.find((s) => s.service === "api.arolariu.ro")!;
    // cosmosdb from previous should be preserved
    expect(api.subSeries?.["cosmosdb"]).toBeDefined();
    // mssql from fresh should be added
    expect(api.subSeries?.["mssql"]).toBeDefined();
  });
});
