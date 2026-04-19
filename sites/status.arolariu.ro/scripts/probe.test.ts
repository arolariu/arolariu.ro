// @vitest-environment node
import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {mkdtempSync, rmSync, readFileSync, existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {runProbe} from "./probe";

describe("runProbe", () => {
  let dataDir: string;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "status-probe-"));
  });
  afterEach(() => {
    rmSync(dataDir, {recursive: true, force: true});
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("probes all 4 services in parallel and writes raw JSONL", async () => {
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("arolariu.ro/api/health")) {
        return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
      }
      if (u.includes("api.arolariu.ro/health")) {
        return new Response(JSON.stringify({status: "Healthy", entries: {}}), {status: 200});
      }
      if (u.includes("exp.arolariu.ro/api/health")) {
        return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
      }
      return new Response("", {status: 200});
    }) as typeof fetch;

    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z")});

    expect(results).toHaveLength(4);
    const services = results.map(r => r.service).sort();
    expect(services).toEqual(["api.arolariu.ro", "arolariu.ro", "cv.arolariu.ro", "exp.arolariu.ro"]);
    expect(results.every(r => r.overall === "Healthy")).toBe(true);

    const file = join(dataDir, "raw", "2026-04-19.jsonl");
    expect(existsSync(file)).toBe(true);
    const lines = readFileSync(file, "utf8").trim().split("\n");
    expect(lines).toHaveLength(4);
  });

  it("records transport error when fetch rejects, other services still probed", async () => {
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      if (String(url).includes("api.arolariu.ro")) throw new Error("ECONNREFUSED");
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    const results = await runProbe({dataDir, now: new Date()});
    const api = results.find(r => r.service === "api.arolariu.ro")!;
    expect(api.overall).toBe("Unhealthy");
    expect(api.error).toContain("ECONNREFUSED");
    const others = results.filter(r => r.service !== "api.arolariu.ro");
    expect(others.every(r => r.overall === "Healthy")).toBe(true);
  });

  it("appends to existing JSONL file on same day", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({status: "Healthy"}), {status: 200})) as typeof fetch;
    await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z")});
    await runProbe({dataDir, now: new Date("2026-04-19T14:30:00Z")});
    const file = join(dataDir, "raw", "2026-04-19.jsonl");
    const lines = readFileSync(file, "utf8").trim().split("\n");
    expect(lines).toHaveLength(8);
  });
});
