// @vitest-environment node
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import type {ProbeResult} from "../src/lib/types/status";
import {readRawProbes} from "./rawProbes";

function mkProbe(service: string, ts: string): ProbeResult {
  return {
    service: service as ProbeResult["service"],
    timestamp: ts,
    latencyMs: 100,
    httpStatus: 200,
    overall: "Healthy",
  };
}

describe("readRawProbes", () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "status-raw-"));
  });
  afterEach(() => {
    rmSync(dataDir, {recursive: true, force: true});
  });

  it("returns empty array when raw directory does not exist", () => {
    expect(readRawProbes(dataDir)).toEqual([]);
  });

  it("skips non-.jsonl files in raw directory", () => {
    mkdirSync(join(dataDir, "raw"));
    writeFileSync(join(dataDir, "raw", "notes.txt"), "should be ignored");
    writeFileSync(join(dataDir, "raw", "2026-04-19.jsonl"), JSON.stringify(mkProbe("arolariu.ro", "2026-04-19T14:00:00Z")) + "\n");
    const probes = readRawProbes(dataDir);
    expect(probes).toHaveLength(1);
    expect(probes[0]!.service).toBe("arolariu.ro");
  });

  it("skips malformed (non-JSON) lines silently", () => {
    mkdirSync(join(dataDir, "raw"));
    const valid = JSON.stringify(mkProbe("arolariu.ro", "2026-04-19T14:00:00Z"));
    writeFileSync(join(dataDir, "raw", "2026-04-19.jsonl"), `${valid}\n{bad json\n${valid}\n`);
    const probes = readRawProbes(dataDir);
    expect(probes).toHaveLength(2);
  });

  it("skips blank lines", () => {
    mkdirSync(join(dataDir, "raw"));
    const line = JSON.stringify(mkProbe("arolariu.ro", "2026-04-19T14:00:00Z"));
    writeFileSync(join(dataDir, "raw", "2026-04-19.jsonl"), `\n\n${line}\n\n`);
    const probes = readRawProbes(dataDir);
    expect(probes).toHaveLength(1);
  });

  it("reads files in sorted (chronological) order", () => {
    mkdirSync(join(dataDir, "raw"));
    writeFileSync(join(dataDir, "raw", "2026-04-20.jsonl"), JSON.stringify(mkProbe("arolariu.ro", "2026-04-20T00:00:00Z")) + "\n");
    writeFileSync(join(dataDir, "raw", "2026-04-18.jsonl"), JSON.stringify(mkProbe("arolariu.ro", "2026-04-18T00:00:00Z")) + "\n");
    const probes = readRawProbes(dataDir);
    expect(probes[0]!.timestamp).toBe("2026-04-18T00:00:00Z");
    expect(probes[1]!.timestamp).toBe("2026-04-20T00:00:00Z");
  });
});
