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

    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0, 0, 0]});

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

    const results = await runProbe({dataDir, now: new Date(), sampleDelaysMs: [0, 0, 0]});
    const api = results.find(r => r.service === "api.arolariu.ro")!;
    expect(api.overall).toBe("Unhealthy");
    expect(api.error).toContain("ECONNREFUSED");
    const others = results.filter(r => r.service !== "api.arolariu.ro");
    expect(others.every(r => r.overall === "Healthy")).toBe(true);
  });

  it("appends to existing JSONL file on same day", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({status: "Healthy"}), {status: 200})) as typeof fetch;
    await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0, 0, 0]});
    await runProbe({dataDir, now: new Date("2026-04-19T14:30:00Z"), sampleDelaysMs: [0, 0, 0]});
    const file = join(dataDir, "raw", "2026-04-19.jsonl");
    const lines = readFileSync(file, "utf8").trim().split("\n");
    expect(lines).toHaveLength(8);
  });

  it("records 200 OK with malformed JSON body as Degraded (not crash)", async () => {
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("arolariu.ro/api/health")) {
        return new Response("not json {{{", {status: 200});
      }
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    const results = await runProbe({dataDir, now: new Date(), sampleDelaysMs: [0, 0, 0]});
    const arolariu = results.find(r => r.service === "arolariu.ro")!;
    expect(arolariu.overall).toBe("Degraded");
    expect(arolariu.httpStatus).toBe(200);
    expect(results).toHaveLength(4);  // all 4 still probed
  });

  it("total outage (all 4 services fail) produces 4 Unhealthy results, still writes JSONL", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;

    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0, 0, 0]});
    expect(results).toHaveLength(4);
    expect(results.every(r => r.overall === "Unhealthy")).toBe(true);
    expect(results.every(r => r.error?.includes("ECONNREFUSED"))).toBe(true);
    // JSONL still written
    const file = join(dataDir, "raw", "2026-04-19.jsonl");
    expect(existsSync(file)).toBe(true);
  });

  it("takes N samples per service per run (one fetch per delay)", async () => {
    const calls = new Map<string, number>();
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      calls.set(u, (calls.get(u) ?? 0) + 1);
      if (u.includes("api.arolariu.ro/health")) {
        return new Response(JSON.stringify({status: "Healthy", entries: {}}), {status: 200});
      }
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    const delays = [0, 0, 0, 0, 0];  // five samples, zero wait in-test
    await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: delays});

    // Four unique URLs, one fetch per delay entry
    expect(calls.size).toBe(4);
    for (const [url, count] of calls.entries()) {
      expect(count, `${url} should be probed ${delays.length} times`).toBe(delays.length);
    }
  });

  it("one transient failure among samples still records Unhealthy (worst-wins aggregation)", async () => {
    let apiCalls = 0;
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("api.arolariu.ro/health")) {
        apiCalls++;
        // Fail only the middle sample, succeed on the surrounding ones
        if (apiCalls === 2) throw new Error("ECONNREFUSED");
        return new Response(JSON.stringify({status: "Healthy", entries: {}}), {status: 200});
      }
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0, 0, 0]});
    const api = results.find(r => r.service === "api.arolariu.ro")!;
    expect(api.overall).toBe("Unhealthy");  // worst of [Healthy, Unhealthy, Healthy]
    expect(api.error).toContain("ECONNREFUSED");
  });

  it("all samples healthy → aggregated result is Healthy with median latency", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({status: "Healthy"}), {status: 200})) as typeof fetch;

    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0, 0, 0]});
    expect(results.every(r => r.overall === "Healthy")).toBe(true);
    expect(results.every(r => typeof r.latencyMs === "number" && r.latencyMs >= 0)).toBe(true);
  });

  it("waits sampleDelaysMs between samples (using non-zero delays)", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({status: "Healthy"}), {status: 200})) as typeof fetch;

    const start = Date.now();
    await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0, 50, 100]});
    const elapsed = Date.now() - start;
    // Services run in parallel, so total wall time ≈ 0 + 50 + 100 = 150ms + fetch time
    expect(elapsed).toBeGreaterThanOrEqual(140);
    expect(elapsed).toBeLessThan(1000);  // upper bound to catch regressions
  });
});
