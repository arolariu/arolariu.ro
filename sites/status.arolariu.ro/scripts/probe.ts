/**
 * Probe orchestrator. Fan out HTTP probes to every configured service on each
 * cron tick, take N samples per service with spaced delays, aggregate the
 * samples into a single `ProbeResult` per service, and append the results to
 * the daily raw JSONL file.
 *
 * The cron-facing entry point is {@link runProbe}; the `import.meta.url` guard
 * at the bottom is the CLI bootstrapper.
 */
import {appendFileSync, existsSync, mkdirSync, readFileSync} from "node:fs";
import {join} from "node:path";
import {performance} from "node:perf_hooks";
import {setTimeout as sleep} from "node:timers/promises";
import type {HealthStatus, ProbeResult, ServiceId, SubCheck} from "../src/lib/types/status";
import {parseApiArolariuRo} from "./parsers/apiArolariuRo";
import type {ProbeContext, RawResponse} from "./parsers/arolariuRo";
import {parseArolariuRo} from "./parsers/arolariuRo";
import {parseCvArolariuRo} from "./parsers/cvArolariuRo";
import {parseExpArolariuRo} from "./parsers/expArolariuRo";

/**
 * Per-sample fetch timeout. Picked well above the 99th percentile for any of
 * our services; anything beyond this is effectively a dead connection and
 * reported as a transport error rather than a slow response.
 */
const PROBE_TIMEOUT_MS = 10_000;

/**
 * Delay BEFORE each sample fetch. Ten samples per service per 30-min cron,
 * spread over 3 minutes (immediate, +20s, +40s, …, +180s). The longer
 * window smooths out per-sample noise so bucket-level p95/p99 signal
 * becomes meaningful at the 30-minute fine tier.
 *
 * Total wall-clock per service ≤ 180s + fetch time (≈190s worst case with
 * PROBE_TIMEOUT_MS=10s on the final sample). Still well under the 30-min
 * cron interval. Overridable in tests via `RunProbeOptions.sampleDelaysMs`.
 */
const DEFAULT_SAMPLE_DELAYS_MS: readonly number[] = [0, 20_000, 40_000, 60_000, 80_000, 100_000, 120_000, 140_000, 160_000, 180_000];

/** Severity ranking used when picking the "worst" sample across the batch. */
const STATUS_ORDER: Record<HealthStatus, number> = {Healthy: 0, Degraded: 1, Unhealthy: 2};

/**
 * Static table-driven config for one probed service. Each entry ties a
 * `ServiceId` to the URL we hit and the body parser that turns the raw
 * HTTP response into a typed `ProbeResult`.
 */
interface ServiceConfig {
  /** Stable service identifier persisted in every ProbeResult. */
  readonly service: ServiceId;
  /** Fully-qualified health endpoint URL. */
  readonly url: string;
  /** Parser that normalises the per-service response shape into a `ProbeResult`. */
  readonly parse: (raw: RawResponse, ctx: ProbeContext) => ProbeResult;
  /**
   * Whether to `response.json()` the body before handing it to the parser.
   * `false` for services whose health is derived purely from the HTTP status
   * (e.g. a plain static site like `cv.arolariu.ro`).
   */
  readonly parseBody: boolean;
}

/**
 * Services probed on each cron tick. Adding a new service requires:
 *  1. Registering its `ServiceId` in `src/lib/types/status`.
 *  2. Writing a parser under `scripts/parsers/` + a peer test.
 *  3. Appending the tuple here.
 */
const SERVICES: readonly ServiceConfig[] = [
  {service: "arolariu.ro", url: "https://arolariu.ro/api/health", parse: parseArolariuRo, parseBody: true},
  {service: "api.arolariu.ro", url: "https://api.arolariu.ro/health", parse: parseApiArolariuRo, parseBody: true},
  {service: "exp.arolariu.ro", url: "https://exp.arolariu.ro/api/health", parse: parseExpArolariuRo, parseBody: true},
  {service: "cv.arolariu.ro", url: "https://cv.arolariu.ro/", parse: parseCvArolariuRo, parseBody: false},
];

/**
 * Perform a single HTTP probe against `cfg.url`. Never throws: network,
 * timeout, and parse failures are all funnelled through the per-service
 * `parse()` function with `status: 0` and an error string so that downstream
 * aggregation treats them uniformly as Unhealthy samples.
 */
async function singleFetch(cfg: ServiceConfig, nowIso: string): Promise<ProbeResult> {
  const start = performance.now();
  try {
    // Follow redirects by default: cv.arolariu.ro (Azure Static Web Apps)
    // issues canonicalization redirects (trailing-slash, hostname) that
    // `redirect: "manual"` surfaced as opaqueredirect responses with
    // `status === 0`, causing false "transport error" Unhealthy reports.
    const response = await fetch(cfg.url, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: {"user-agent": "status.arolariu.ro-probe/1.0"},
    });
    const latencyMs = Math.round(performance.now() - start);
    let body: unknown = null;
    if (cfg.parseBody) {
      try {
        body = await response.json();
      } catch {
        body = null;
      }
    }
    return cfg.parse({status: response.status, body}, {timestamp: nowIso, latencyMs});
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start);
    const message =
      error instanceof Error
        ? error.name === "TimeoutError"
          ? `timeout after ${PROBE_TIMEOUT_MS}ms`
          : `${error.name}: ${error.message}`
        : String(error);
    return cfg.parse({status: 0, body: null, error: message}, {timestamp: nowIso, latencyMs});
  }
}

/**
 * Aggregates N sample ProbeResults into a single ProbeResult.
 *   - `overall` / `httpStatus` / `subChecks` / `error` come from the worst
 *     sample (preserves the most informative sub-check state + error text).
 *   - `latencyMs` is the median of the samples (noise-resistant; a single
 *     bad sample does not dominate).
 *   - `sampleLatenciesMs` preserves the raw per-sample latencies so bucket
 *     percentile math downstream has a real distribution, not a 1-element
 *     array that collapses every percentile to the median.
 *   - Each sub-check on the result carries `sampleDurationsMs` with its
 *     per-sample durations across the run, for the same reason.
 *   - `timestamp` is the first sample's timestamp, so every service's
 *     aggregate aligns to the same 30-min bucket regardless of which
 *     sample was fastest/slowest.
 */
function aggregateSamples(samples: readonly ProbeResult[]): ProbeResult {
  const first = samples[0];
  /* v8 ignore next */
  if (first === undefined) throw new Error("aggregateSamples requires at least one sample");
  const worst = samples.reduce<ProbeResult>((w, s) => (STATUS_ORDER[s.overall] > STATUS_ORDER[w.overall] ? s : w), first);
  const sampleLatenciesMs = samples.map((s) => s.latencyMs);
  const sortedLatencies = [...sampleLatenciesMs].sort((a, b) => a - b);
  /* v8 ignore next */
  const median = sortedLatencies[Math.floor(samples.length / 2)] ?? first.latencyMs;

  // Collect per-sample sub-check durations keyed by sub-check name. We preserve
  // the worst sample's sub-check array as the output skeleton (status + error
  // description semantics match `overall`), then enrich each entry with the
  // full array of durations seen across ALL samples under that name.
  let enrichedSubChecks: readonly SubCheck[] | undefined;
  if (worst.subChecks !== undefined) {
    const durationsByName = new Map<string, number[]>();
    for (const s of samples) {
      if (s.subChecks === undefined) continue;
      for (const sc of s.subChecks) {
        let arr = durationsByName.get(sc.name);
        /* v8 ignore next */
        if (arr === undefined) {arr = []; durationsByName.set(sc.name, arr);}
        arr.push(sc.durationMs);
      }
    }
    enrichedSubChecks = worst.subChecks.map((sc) => {
      const durations = durationsByName.get(sc.name);
      // `durations` is always defined + non-empty here: `worst` is one of the
      // samples we iterated above, so its sub-check names are guaranteed keys
      // in `durationsByName`. The fallback exists only to keep the type
      // checker happy.
      /* v8 ignore next 3 */
      return durations !== undefined && durations.length > 0
        ? {...sc, sampleDurationsMs: durations}
        : sc;
    });
  }

  const base: ProbeResult = {
    service: worst.service,
    timestamp: first.timestamp,
    latencyMs: median,
    httpStatus: worst.httpStatus,
    overall: worst.overall,
    sampleCount: samples.length,
    sampleLatenciesMs,
  };
  return {
    ...base,
    ...(enrichedSubChecks !== undefined && {subChecks: enrichedSubChecks}),
    /* v8 ignore next */
    ...(worst.error !== undefined && {error: worst.error}),
  };
}

/**
 * Collect `delaysMs.length` samples for a single service, each preceded by
 * the corresponding delay, and return the aggregated `ProbeResult`. Runs
 * samples sequentially on purpose — back-to-back concurrent fetches would
 * defeat the "spread samples across the bucket" strategy.
 */
async function probeOne(cfg: ServiceConfig, nowIso: string, delaysMs: readonly number[]): Promise<ProbeResult> {
  const samples: ProbeResult[] = [];
  for (let i = 0; i < delaysMs.length; i++) {
    /* v8 ignore next */
    const delay = delaysMs[i] ?? 0;
    if (delay > 0) await sleep(delay);
    samples.push(await singleFetch(cfg, nowIso));
  }
  return aggregateSamples(samples);
}

/** Options accepted by {@link runProbe}. */
export interface RunProbeOptions {
  /** Base directory for probe output; raw JSONL is written under `<dataDir>/raw/`. */
  readonly dataDir: string;
  /** Clock override for deterministic tests and bucket alignment; defaults to `new Date()`. */
  readonly now?: Date;
  /** Delay BEFORE each sample fetch. Defaults to {@link DEFAULT_SAMPLE_DELAYS_MS}. Pass `[0, 0, 0]` in tests. */
  readonly sampleDelaysMs?: readonly number[];
}

/**
 * Cron entry point: probe every configured service, aggregate the samples,
 * append the per-service `ProbeResult`s to `<dataDir>/raw/YYYY-MM-DD.jsonl`,
 * and return the array.
 *
 * The JSONL append is guarded against torn writes from a killed prior run
 * (see body comment); callers do not need to sanitise the file beforehand.
 *
 * @param opts - Data directory plus optional clock and sample-delay overrides.
 * @returns One `ProbeResult` per configured service, in `SERVICES` order.
 */
export async function runProbe(opts: RunProbeOptions): Promise<ProbeResult[]> {
  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();
  /* v8 ignore next */
  const delays = opts.sampleDelaysMs ?? DEFAULT_SAMPLE_DELAYS_MS;

  const results = await Promise.all(SERVICES.map((cfg) => probeOne(cfg, nowIso, delays)));

  const rawDir = join(opts.dataDir, "raw");
  mkdirSync(rawDir, {recursive: true});
  const day = nowIso.slice(0, 10);
  const file = join(rawDir, `${day}.jsonl`);
  // Guard against torn writes: if a prior run's append was killed mid-byte,
  // the file may not end with \n. Prefix a newline in that case so the next
  // batch starts on a fresh line; the corrupt tail becomes an unparseable line
  // that readRawProbes already skips. On normal appends the file ends with \n,
  // so no prefix is added.
  let needsPrefix = false;
  if (existsSync(file)) {
    const existing = readFileSync(file);
    needsPrefix = existing.length > 0 && existing[existing.length - 1] !== 0x0a;
  }
  const lines = (needsPrefix ? "\n" : "") + results.map((r) => JSON.stringify(r)).join("\n") + "\n";
  appendFileSync(file, lines, "utf8");

  return results;
}

/* v8 ignore next 9 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const dataDir = process.env["DATA_DIR"] ?? "./data";
  runProbe({dataDir})
    .then((r) => {
      console.log(`wrote ${r.length} probe results to ${dataDir}`);
    })
    .catch((err) => {
      console.error("probe failed:", err);
      process.exit(1);
    });
}
