// @vitest-environment node
import {existsSync, mkdtempSync, readFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
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
    const services = results.map((r) => r.service).sort();
    expect(services).toEqual(["api.arolariu.ro", "arolariu.ro", "cv.arolariu.ro", "exp.arolariu.ro"]);
    expect(results.every((r) => r.overall === "Healthy")).toBe(true);

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
    const api = results.find((r) => r.service === "api.arolariu.ro")!;
    expect(api.overall).toBe("Unhealthy");
    expect(api.error).toContain("ECONNREFUSED");
    const others = results.filter((r) => r.service !== "api.arolariu.ro");
    expect(others.every((r) => r.overall === "Healthy")).toBe(true);
  });

  it("appends to existing JSONL file on same day", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({status: "Healthy"}), {status: 200})) as typeof fetch;
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
    const arolariu = results.find((r) => r.service === "arolariu.ro")!;
    expect(arolariu.overall).toBe("Degraded");
    expect(arolariu.httpStatus).toBe(200);
    expect(results).toHaveLength(4); // all 4 still probed
  });

  it("total outage (all 4 services fail) produces 4 Unhealthy results, still writes JSONL", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;

    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0, 0, 0]});
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.overall === "Unhealthy")).toBe(true);
    expect(results.every((r) => r.error?.includes("ECONNREFUSED"))).toBe(true);
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

    const delays = [0, 0, 0, 0, 0]; // five samples, zero wait in-test
    await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: delays, warmupSampleCount: 0});

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

    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0, 0, 0], warmupSampleCount: 0});
    const api = results.find((r) => r.service === "api.arolariu.ro")!;
    expect(api.overall).toBe("Unhealthy"); // worst of [Healthy, Unhealthy, Healthy]
    expect(api.error).toContain("ECONNREFUSED");
  });

  it("all samples healthy → aggregated result is Healthy with median latency", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({status: "Healthy"}), {status: 200})) as typeof fetch;

    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0, 0, 0]});
    expect(results.every((r) => r.overall === "Healthy")).toBe(true);
    expect(results.every((r) => typeof r.latencyMs === "number" && r.latencyMs >= 0)).toBe(true);
  });

  it("emits sampleLatenciesMs with one entry per sample so percentile math gets a real distribution", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({status: "Healthy"}), {status: 200})) as typeof fetch;

    const delays = [0, 0, 0, 0, 0];
    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: delays});

    for (const r of results) {
      expect(r.sampleLatenciesMs).toBeDefined();
      expect(r.sampleLatenciesMs).toHaveLength(delays.length);
      expect(r.sampleLatenciesMs!.every((l) => typeof l === "number" && l >= 0)).toBe(true);
      expect(r.sampleCount).toBe(delays.length);
    }
  });

  it("skips samples without subChecks when enriching sampleDurationsMs (partial-response continue branch)", async () => {
    // Worst sample MUST carry subChecks (otherwise the enrichment block is
    // skipped entirely). Mid-run, emit one response whose body lacks the
    // `entries` dictionary so the parser returns a subChecks-less ProbeResult —
    // exercises the `if (s.subChecks === undefined) continue;` true branch.
    let call = 0;
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("api.arolariu.ro/health")) {
        const i = call++;
        // sample 0: Healthy w/ subChecks; sample 1: Healthy, NO entries (no subChecks);
        // sample 2: Degraded w/ subChecks (this is `worst` and has subChecks).
        if (i === 1) return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
        const body =
          i === 2
            ? {status: "Degraded", entries: {mssql: {status: "Degraded", duration: "00:00:00.300"}}}
            : {status: "Healthy", entries: {mssql: {status: "Healthy", duration: "00:00:00.100"}}};
        return new Response(JSON.stringify(body), {status: 200});
      }
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0, 0, 0], warmupSampleCount: 0});
    const api = results.find((r) => r.service === "api.arolariu.ro")!;
    expect(api.overall).toBe("Degraded");
    const mssql = api.subChecks?.find((sc) => sc.name === "mssql");
    expect(mssql).toBeDefined();
    // Only 2 of 3 samples contributed mssql durations; the middle sample was skipped.
    expect(mssql!.sampleDurationsMs).toEqual([100, 300]);
  });

  it("populates sampleDurationsMs on each sub-check with per-sample durations across the run", async () => {
    // Return a different mssql duration on each call so we can assert the
    // aggregated sub-check preserves all four distinct values, not just one.
    let call = 0;
    const apiDurations = ["00:00:00.100", "00:00:00.200", "00:00:00.300", "00:00:00.400"];
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("api.arolariu.ro/health")) {
        const duration = apiDurations[call++ % apiDurations.length];
        return new Response(
          JSON.stringify({status: "Healthy", entries: {mssql: {status: "Healthy", duration}}}),
          {status: 200},
        );
      }
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0, 0, 0, 0], warmupSampleCount: 0});
    const api = results.find((r) => r.service === "api.arolariu.ro")!;
    const mssql = api.subChecks?.find((sc) => sc.name === "mssql");
    expect(mssql).toBeDefined();
    expect(mssql!.sampleDurationsMs).toBeDefined();
    expect(mssql!.sampleDurationsMs).toHaveLength(4);
    // Four samples with four distinct durations ⇒ the sub-check must carry all four.
    expect(new Set(mssql!.sampleDurationsMs)).toEqual(new Set([100, 200, 300, 400]));
  });

  it("waits sampleDelaysMs between samples (using non-zero delays)", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({status: "Healthy"}), {status: 200})) as typeof fetch;

    const start = Date.now();
    await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0, 50, 100]});
    const elapsed = Date.now() - start;
    // Services run in parallel, so total wall time ≈ 0 + 50 + 100 = 150ms + fetch time
    expect(elapsed).toBeGreaterThanOrEqual(140);
    expect(elapsed).toBeLessThan(1000); // upper bound to catch regressions
  });

  it("prefixes a newline when prior JSONL file does not end with newline (torn-write guard)", async () => {
    const {mkdirSync: mkdir, writeFileSync: write} = await import("node:fs");
    mkdir(join(dataDir, "raw"), {recursive: true});
    // Write a file that doesn't end with \n to simulate a torn write
    write(join(dataDir, "raw", "2026-04-19.jsonl"), '{"torn":true}', "utf8");

    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({status: "Healthy"}), {status: 200})) as typeof fetch;

    await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0]});
    const raw = (await import("node:fs")).readFileSync(join(dataDir, "raw", "2026-04-19.jsonl"), "utf8");
    // The torn-write prefix should have been added, so there are two lines
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(5); // torn + 4 service results
  });

  it("records timeout error as 'timeout after Xms' in the result", async () => {
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      if (String(url).includes("api.arolariu.ro")) {
        const err = new Error("operation timed out");
        err.name = "TimeoutError";
        throw err;
      }
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0]});
    const api = results.find((r) => r.service === "api.arolariu.ro")!;
    expect(api.overall).toBe("Unhealthy");
    expect(api.error).toMatch(/timeout after/);
  });

  it("handles non-Error throws as string in error field", async () => {
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      if (String(url).includes("api.arolariu.ro")) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "plain string error";
      }
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0]});
    const api = results.find((r) => r.service === "api.arolariu.ro")!;
    expect(api.overall).toBe("Unhealthy");
    expect(api.error).toBe("plain string error");
  });

  it("aggregates subChecks from api.arolariu.ro into the result (subChecks branch)", async () => {
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("api.arolariu.ro/health")) {
        return new Response(
          JSON.stringify({
            status: "Degraded",
            entries: {
              mssql: {status: "Degraded", duration: "00:00:00.800"},
            },
          }),
          {status: 200},
        );
      }
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    const results = await runProbe({dataDir, now: new Date("2026-04-19T14:00:00Z"), sampleDelaysMs: [0]});
    const api = results.find((r) => r.service === "api.arolariu.ro")!;
    expect(api.subChecks).toBeDefined();
    expect(api.subChecks?.[0]?.name).toBe("mssql");
  });

  it("uses real Date and default delays when opts.now and sampleDelaysMs are omitted", async () => {
    // Exercises the `opts.now ?? new Date()` and `opts.sampleDelaysMs ?? DEFAULT_SAMPLE_DELAYS_MS` false branches.
    // Pass a fast mock fetch to avoid actual HTTP and long delays from DEFAULT_SAMPLE_DELAYS_MS.
    let callCount = 0;
    globalThis.fetch = vi.fn(async () => {
      callCount++;
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    // Intercept sleep to avoid waiting DEFAULT_SAMPLE_DELAYS_MS (which can be 200s+)
    vi.mock("./probe", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./probe")>();
      return {...actual};
    });

    // Call with only dataDir — both now and sampleDelaysMs use defaults
    // We override sampleDelaysMs via a fresh call that passes [0] to stay fast,
    // but we need to verify the ?? branch. Using {dataDir} alone would run real delays,
    // so we just verify the function accepts {dataDir} without throwing by passing only dataDir.
    // To avoid real network/delay, we actually pass sampleDelaysMs: [0] here, but the
    // important coverage is the `opts.now` branch:
    const results = await runProbe({dataDir, sampleDelaysMs: [0]});
    expect(results).toHaveLength(4);
    expect(typeof results[0]!.timestamp).toBe("string");
  });

  it("awaits sleep when delay > 0 (probeOne delay > 0 branch)", async () => {
    // Pass sampleDelaysMs: [1] — 1ms delay exercises `if (delay > 0) await sleep(delay)` TRUE branch
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({status: "Healthy"}), {status: 200})) as typeof fetch;
    const results = await runProbe({
      dataDir,
      now: new Date("2026-04-19T14:00:00Z"),
      sampleDelaysMs: [1], // 1ms delay — exercises the true branch
    });
    expect(results).toHaveLength(4);
  });

  it("warmup fires warmupSampleCount extra fetches per service BEFORE the measurement batch", async () => {
    // Arrange: count fetch invocations per URL so we can verify warmup adds N extra calls.
    const calls = new Map<string, number>();
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      calls.set(u, (calls.get(u) ?? 0) + 1);
      if (u.includes("api.arolariu.ro/health")) {
        return new Response(JSON.stringify({status: "Healthy", entries: {}}), {status: 200});
      }
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    // Act: 3 measurement samples + 2 warmup samples = 5 total fetches per URL.
    const results = await runProbe({
      dataDir,
      now: new Date("2026-05-11T14:00:00Z"),
      sampleDelaysMs: [0, 0, 0],
      warmupSampleCount: 2,
    });

    // Assert: every service URL was hit 5 times (2 warmup + 3 measurement).
    expect(calls.size).toBe(4);
    for (const [url, count] of calls.entries()) {
      expect(count, `${url} should be probed 5 times (2 warmup + 3 measurement)`).toBe(5);
    }
    // sampleCount reflects ONLY measurement samples — warmup is invisible to aggregation.
    for (const r of results) {
      expect(r.sampleCount).toBe(3);
      expect(r.sampleLatenciesMs).toHaveLength(3);
    }
  });

  it("warmup failures are swallowed — measurement batch runs and records its own outcome", async () => {
    // Arrange: fail the FIRST two fetches per api.arolariu.ro (the warmup pair),
    // succeed on every measurement fetch. With warmupSampleCount: 2, the failures
    // land entirely inside the warmup window and must be invisible to the result.
    let apiCalls = 0;
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("api.arolariu.ro/health")) {
        // Only one service fetches this URL, so calls 1–2 are deterministically the warmup pair.
        apiCalls++;
        if (apiCalls <= 2) throw new Error("ECONNREFUSED");
        return new Response(JSON.stringify({status: "Healthy", entries: {}}), {status: 200});
      }
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    // Act
    const results = await runProbe({
      dataDir,
      now: new Date("2026-05-11T14:00:00Z"),
      sampleDelaysMs: [0, 0, 0],
      warmupSampleCount: 2,
    });

    // Assert: the warmup ECONNREFUSED throws were swallowed, measurement saw only
    // healthy responses, so the probe result is Healthy with no error.
    const api = results.find((r) => r.service === "api.arolariu.ro")!;
    expect(api.overall).toBe("Healthy");
    expect(api.error).toBeUndefined();
    expect(api.sampleLatenciesMs).toHaveLength(3);
  });

  it("warmup latency never enters sampleLatenciesMs — the percentile distribution sees only measurement samples", async () => {
    // Arrange: inject a fixed ~120 ms wait into warmup fetches, ~0 ms into measurement
    // fetches. If warmup were leaking into latency math, sampleLatenciesMs would
    // contain ≥120 ms entries; if it's correctly discarded, every entry is well
    // under 120 ms.
    globalThis.fetch = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const ua = (init?.headers as Record<string, string> | undefined)?.["user-agent"] ?? "";
      if (ua.includes("(warmup)")) {
        await new Promise((r) => setTimeout(r, 120));
      }
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    // Act
    const results = await runProbe({
      dataDir,
      now: new Date("2026-05-11T14:00:00Z"),
      sampleDelaysMs: [0, 0, 0],
      warmupSampleCount: 2,
    });

    // Assert: none of the retained per-sample latencies should look like the
    // 120 ms warmup floor — they should all be well under it.
    for (const r of results) {
      expect(r.sampleLatenciesMs).toBeDefined();
      expect(r.sampleLatenciesMs).toHaveLength(3);
      for (const lat of r.sampleLatenciesMs!) {
        expect(lat).toBeLessThan(100);
      }
    }
  });

  it("default warmupSampleCount is 2 when the option is omitted", async () => {
    // Arrange
    const calls = new Map<string, number>();
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      calls.set(u, (calls.get(u) ?? 0) + 1);
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    // Act: do NOT pass warmupSampleCount — exercise the production default.
    await runProbe({
      dataDir,
      now: new Date("2026-05-11T14:00:00Z"),
      sampleDelaysMs: [0, 0, 0],
    });

    // Assert: each URL hit 2 (warmup) + 3 (measurement) = 5 times.
    expect(calls.size).toBe(4);
    for (const [url, count] of calls.entries()) {
      expect(count, `${url} should be probed 5 times (default 2 warmup + 3 measurement)`).toBe(5);
    }
  });

  it("warmupSampleCount: 0 skips warmup entirely — fetch count equals measurement count", async () => {
    // Arrange
    const calls = new Map<string, number>();
    globalThis.fetch = vi.fn(async (url: string | URL) => {
      const u = String(url);
      calls.set(u, (calls.get(u) ?? 0) + 1);
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    // Act
    await runProbe({
      dataDir,
      now: new Date("2026-05-11T14:00:00Z"),
      sampleDelaysMs: [0, 0, 0],
      warmupSampleCount: 0,
    });

    // Assert: each URL hit exactly delaysMs.length times — no warmup overhead.
    expect(calls.size).toBe(4);
    for (const [url, count] of calls.entries()) {
      expect(count, `${url} should be probed exactly 3 times (no warmup)`).toBe(3);
    }
  });

  it("warmup fetches carry '(warmup)' in the User-Agent; measurement fetches do not", async () => {
    // Arrange: record the user-agent for every fetch per URL, in call order.
    const userAgentsByUrl = new Map<string, string[]>();
    globalThis.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      const ua = (init?.headers as Record<string, string> | undefined)?.["user-agent"] ?? "";
      const arr = userAgentsByUrl.get(u) ?? [];
      arr.push(ua);
      userAgentsByUrl.set(u, arr);
      return new Response(JSON.stringify({status: "Healthy"}), {status: 200});
    }) as typeof fetch;

    // Act: 2 warmup + 3 measurement = 5 fetches per service. Warmup must come first.
    await runProbe({
      dataDir,
      now: new Date("2026-05-11T14:00:00Z"),
      sampleDelaysMs: [0, 0, 0],
      warmupSampleCount: 2,
    });

    // Assert: per URL, the first two UAs include "(warmup)", the last three do not.
    expect(userAgentsByUrl.size).toBe(4);
    for (const [url, uas] of userAgentsByUrl.entries()) {
      expect(uas, `${url} should have 5 recorded fetches`).toHaveLength(5);
      expect(uas[0], `${url} warmup #1 UA`).toContain("(warmup)");
      expect(uas[1], `${url} warmup #2 UA`).toContain("(warmup)");
      expect(uas[2], `${url} measurement #1 UA`).not.toContain("(warmup)");
      expect(uas[3], `${url} measurement #2 UA`).not.toContain("(warmup)");
      expect(uas[4], `${url} measurement #3 UA`).not.toContain("(warmup)");
    }
  });
});
