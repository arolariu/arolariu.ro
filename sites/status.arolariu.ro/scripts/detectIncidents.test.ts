// @vitest-environment node
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import type {ProbeResult} from "../src/lib/types/status";
import {runDetectIncidents, updateIncidentState} from "./detectIncidents";

function mkProbe(service: string, ts: string, overall: "Healthy" | "Degraded" | "Unhealthy", error?: string): ProbeResult {
  const base: ProbeResult = {
    service: service as ProbeResult["service"],
    timestamp: ts,
    latencyMs: 100,
    httpStatus: overall === "Healthy" ? 200 : 503,
    overall,
  };
  return error !== undefined ? {...base, error} : base;
}

describe("updateIncidentState (state machine)", () => {
  it("1 failure does not open an incident", () => {
    const state = updateIncidentState({incidents: []}, [mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Degraded", "slow")]);
    expect(state.incidents.filter((i) => i.status === "open")).toHaveLength(0);
  });

  it("2 consecutive failures open an incident", () => {
    const state = updateIncidentState({incidents: []}, [
      mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Degraded", "slow"),
      mkProbe("arolariu.ro", "2026-04-19T14:30:00Z", "Degraded", "still slow"),
    ]);
    const open = state.incidents.filter((i) => i.status === "open");
    expect(open).toHaveLength(1);
    expect(open[0]!.service).toBe("arolariu.ro");
    expect(open[0]!.severity).toBe("Degraded");
    expect(open[0]!.startedAt).toBe("2026-04-19T14:00:00Z");
    expect(open[0]!.probeCount).toBe(2);
  });

  it("3rd failure increments probeCount, does not open second incident", () => {
    const state = updateIncidentState({incidents: []}, [
      mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Degraded"),
      mkProbe("arolariu.ro", "2026-04-19T14:30:00Z", "Degraded"),
      mkProbe("arolariu.ro", "2026-04-19T15:00:00Z", "Unhealthy"),
    ]);
    const open = state.incidents.filter((i) => i.status === "open");
    expect(open).toHaveLength(1);
    expect(open[0]!.probeCount).toBe(3);
    expect(open[0]!.severity).toBe("Unhealthy");
  });

  it("Healthy probe closes the open incident", () => {
    const state = updateIncidentState({incidents: []}, [
      mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Degraded", "x"),
      mkProbe("arolariu.ro", "2026-04-19T14:30:00Z", "Degraded", "x"),
      mkProbe("arolariu.ro", "2026-04-19T15:00:00Z", "Healthy"),
    ]);
    expect(state.incidents.filter((i) => i.status === "open")).toHaveLength(0);
    const resolved = state.incidents.find((i) => i.status === "resolved")!;
    expect(resolved.resolvedAt).toBe("2026-04-19T15:00:00Z");
    expect(resolved.durationMs).toBe(3600_000);
  });

  it("flapping service does not spam incidents", () => {
    const state = updateIncidentState({incidents: []}, [
      mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Degraded"),
      mkProbe("arolariu.ro", "2026-04-19T14:30:00Z", "Healthy"),
      mkProbe("arolariu.ro", "2026-04-19T15:00:00Z", "Degraded"),
      mkProbe("arolariu.ro", "2026-04-19T15:30:00Z", "Healthy"),
    ]);
    expect(state.incidents).toHaveLength(0);
  });

  it("sub-check incidents tracked independently from parent", () => {
    const withSubs: ProbeResult[] = [
      {
        service: "api.arolariu.ro",
        timestamp: "2026-04-19T14:00:00Z",
        latencyMs: 100,
        httpStatus: 200,
        overall: "Healthy",
        subChecks: [
          {name: "mssql", status: "Degraded", durationMs: 500, description: "slow"},
          {name: "cosmosdb", status: "Healthy", durationMs: 40},
        ],
      },
      {
        service: "api.arolariu.ro",
        timestamp: "2026-04-19T14:30:00Z",
        latencyMs: 100,
        httpStatus: 200,
        overall: "Healthy",
        subChecks: [
          {name: "mssql", status: "Degraded", durationMs: 500, description: "slow"},
          {name: "cosmosdb", status: "Healthy", durationMs: 40},
        ],
      },
    ];
    const state = updateIncidentState({incidents: []}, withSubs);
    const open = state.incidents.filter((i) => i.status === "open");
    expect(open).toHaveLength(1);
    expect(open[0]!.subCheck).toBe("mssql");
  });

  it("reason is refreshed when severity escalates from Degraded to Unhealthy", () => {
    const state = updateIncidentState({incidents: []}, [
      mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Degraded", "slow response"),
      mkProbe("arolariu.ro", "2026-04-19T14:30:00Z", "Degraded", "still slow"),
      mkProbe("arolariu.ro", "2026-04-19T15:00:00Z", "Unhealthy", "connection refused"),
    ]);
    const open = state.incidents.filter((i) => i.status === "open");
    expect(open).toHaveLength(1);
    expect(open[0]!.severity).toBe("Unhealthy");
    // Reason should reflect the escalation, not the initial Degraded signature.
    expect(open[0]!.reason).toBe("connection refused");
  });

  it("reason stays put when severity does not change", () => {
    const state = updateIncidentState({incidents: []}, [
      mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Degraded", "initial reason"),
      mkProbe("arolariu.ro", "2026-04-19T14:30:00Z", "Degraded", "later reason"),
      mkProbe("arolariu.ro", "2026-04-19T15:00:00Z", "Degraded", "yet another reason"),
    ]);
    const open = state.incidents.filter((i) => i.status === "open");
    expect(open).toHaveLength(1);
    // Severity never changed, so reason stays at the incident's initial signature.
    expect(open[0]!.reason).toBe("initial reason");
  });

  it("same service failing after resolve creates a new incident with new id", () => {
    const first = updateIncidentState({incidents: []}, [
      mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Degraded", "x"),
      mkProbe("arolariu.ro", "2026-04-19T14:30:00Z", "Degraded", "x"),
      mkProbe("arolariu.ro", "2026-04-19T15:00:00Z", "Healthy"),
    ]);
    const second = updateIncidentState(first, [
      mkProbe("arolariu.ro", "2026-04-20T14:00:00Z", "Degraded", "y"),
      mkProbe("arolariu.ro", "2026-04-20T14:30:00Z", "Degraded", "y"),
    ]);
    expect(second.incidents).toHaveLength(2);
    expect(second.incidents[0]!.id).not.toBe(second.incidents[1]!.id);
  });
});

describe("runDetectIncidents (CLI-style)", () => {
  let dataDir: string;
  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "status-inc-"));
  });
  afterEach(() => {
    rmSync(dataDir, {recursive: true, force: true});
  });

  it("writes incidents.json with reverse-chron order", async () => {
    const {writeFileSync, mkdirSync} = await import("node:fs");
    mkdirSync(join(dataDir, "raw"), {recursive: true});
    const probes = [mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Degraded"), mkProbe("arolariu.ro", "2026-04-19T14:30:00Z", "Degraded")];
    writeFileSync(join(dataDir, "raw", "2026-04-19.jsonl"), probes.map((p) => JSON.stringify(p)).join("\n") + "\n");

    await runDetectIncidents({dataDir, now: new Date("2026-04-19T15:00:00Z")});
    expect(existsSync(join(dataDir, "incidents.json"))).toBe(true);
    const file = JSON.parse(readFileSync(join(dataDir, "incidents.json"), "utf8"));
    expect(file.incidents).toHaveLength(1);
    expect(file.incidents[0].status).toBe("open");
  });

  it("re-running against the same raw probes does not inflate probeCount (regression: reviewer C1)", async () => {
    const {writeFileSync, mkdirSync} = await import("node:fs");
    mkdirSync(join(dataDir, "raw"), {recursive: true});
    const probes = [mkProbe("arolariu.ro", "2026-04-19T14:00:00Z", "Degraded"), mkProbe("arolariu.ro", "2026-04-19T14:30:00Z", "Degraded")];
    writeFileSync(join(dataDir, "raw", "2026-04-19.jsonl"), probes.map((p) => JSON.stringify(p)).join("\n") + "\n");

    await runDetectIncidents({dataDir, now: new Date("2026-04-19T15:00:00Z")});
    const first = JSON.parse(readFileSync(join(dataDir, "incidents.json"), "utf8"));
    expect(first.incidents[0].probeCount).toBe(2);

    // Second run, same raw probes, no new data appended — probeCount must stay 2.
    await runDetectIncidents({dataDir, now: new Date("2026-04-19T15:30:00Z")});
    const second = JSON.parse(readFileSync(join(dataDir, "incidents.json"), "utf8"));
    expect(second.incidents[0].probeCount).toBe(2);
    expect(second.incidents[0].severity).toBe("Degraded");

    // Appending an NEW failing probe should increment exactly once.
    writeFileSync(
      join(dataDir, "raw", "2026-04-19.jsonl"),
      [...probes, mkProbe("arolariu.ro", "2026-04-19T16:00:00Z", "Unhealthy")].map((p) => JSON.stringify(p)).join("\n") + "\n",
    );
    await runDetectIncidents({dataDir, now: new Date("2026-04-19T16:30:00Z")});
    const third = JSON.parse(readFileSync(join(dataDir, "incidents.json"), "utf8"));
    expect(third.incidents[0].probeCount).toBe(3);
    expect(third.incidents[0].severity).toBe("Unhealthy");
  });
});

describe("readPreviousIncidents error paths", () => {
  let dataDir: string;
  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "status-inc-err-"));
    mkdirSync(join(dataDir, "raw"), {recursive: true});
  });
  afterEach(() => {
    rmSync(dataDir, {recursive: true, force: true});
  });

  it("throws on corrupt (non-JSON) incidents.json rather than silently discarding history", async () => {
    writeFileSync(join(dataDir, "incidents.json"), "not json {{{{");
    await expect(runDetectIncidents({dataDir, now: new Date("2026-04-19T15:00:00Z")})).rejects.toThrow(/not valid JSON/);
  });

  it("throws on incidents.json that does not match IncidentsFile schema", async () => {
    writeFileSync(join(dataDir, "incidents.json"), JSON.stringify({unexpected: true}));
    await expect(runDetectIncidents({dataDir, now: new Date("2026-04-19T15:00:00Z")})).rejects.toThrow(
      /does not match IncidentsFile schema/,
    );
  });

  it("pruneResolved drops resolved incidents older than 90 days", async () => {
    // Seed an incidents.json with an old resolved incident and a recent open one
    const old = new Date("2026-04-19T15:00:00Z");
    const cutoffBefore = new Date(old.getTime() - 91 * 86_400_000).toISOString();
    const incidentsPayload = {
      generatedAt: new Date(old.getTime() - 1).toISOString(),
      incidents: [
        {
          id: "old-resolved",
          service: "arolariu.ro",
          status: "resolved",
          severity: "Degraded",
          startedAt: cutoffBefore,
          resolvedAt: cutoffBefore,
          probeCount: 2,
          durationMs: 1800000,
          reason: "test",
        },
        {
          id: "recent-open",
          service: "arolariu.ro",
          status: "open",
          severity: "Degraded",
          startedAt: new Date(old.getTime() - 2 * 3600_000).toISOString(),
          probeCount: 3,
          reason: "still ongoing",
        },
      ],
    };
    writeFileSync(join(dataDir, "incidents.json"), JSON.stringify(incidentsPayload));
    await runDetectIncidents({dataDir, now: old});
    const result = JSON.parse(readFileSync(join(dataDir, "incidents.json"), "utf8"));
    // Old resolved incident should be pruned
    expect(result.incidents.find((i: {id: string}) => i.id === "old-resolved")).toBeUndefined();
    // Open incident always kept
    expect(result.incidents.find((i: {id: string}) => i.id === "recent-open")).toBeDefined();
  });

  it("uses real Date when opts.now is omitted (now ?? new Date() branch)", async () => {
    // No `now` provided — exercises the `opts.now ?? new Date()` false branch
    await expect(runDetectIncidents({dataDir})).resolves.toBeUndefined();
    const file = join(dataDir, "incidents.json");
    expect(existsSync(file)).toBe(true);
  });
});
