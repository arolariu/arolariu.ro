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
 * Per-fetch timeout for the warmup-prelude requests. Set higher than
 * `PROBE_TIMEOUT_MS` because the whole point of warmup is to absorb cold-start
 * cost for scale-to-zero infra (Azure Container Apps, App Service with
 * `always-on=false`), where the first request after a quiet period commonly
 * takes 10–30 s while the runtime is provisioning. A 10 s budget here would
 * cause warmup to time out on roughly half of true cold starts, defeating its
 * purpose. Worst-case 2 × 30 s warmup + 180 s measurement ≈ 4 min per probe
 * — still well under the 30-min cron cadence.
 */
const WARMUP_FETCH_TIMEOUT_MS = 30_000;

/**
 * Delay BEFORE each sample fetch (inter-sample delta, NOT an absolute offset
 * from probe start — see `probeOne`). Ten samples at a constant 20 s cadence:
 * the first fires immediately, each subsequent sample waits 20 s after the
 * previous one returns. Total sleep = 9 × 20 s = 180 s → the full run lasts
 * ≈ 3 minutes + fetch time (≈190s worst case with PROBE_TIMEOUT_MS=10s on
 * the final sample). Well under the 30-min cron cadence.
 *
 * The 3-minute window is a deliberate trade-off: long enough to smooth out
 * per-sample noise so bucket-level p95/p99 carry real signal, short enough
 * to leave plenty of headroom on each cron tick. Overridable in tests via
 * `RunProbeOptions.sampleDelaysMs`.
 */
const DEFAULT_SAMPLE_DELAYS_MS: readonly number[] = [0, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000, 20_000];

/**
 * Number of warmup HTTP GETs fired per service before the measurement batch
 * when {@link RunProbeOptions.warmupSampleCount} is omitted. Defaults to 2 so
 * services on scale-to-zero infra (Azure Container Apps for `exp.arolariu.ro`)
 * or services that may hibernate (Azure App Service for `api.arolariu.ro`)
 * are demonstrably awake before we start measuring. Once warmup #1 returns,
 * the container/process is live; warmup #2 confirms the second-request
 * pipeline is also primed before the measurement batch begins.
 *
 * Two is a deliberate, simple choice over adaptive stabilisation detection —
 * a fixed prefix is trivial to reason about, trivial to test, and one knob
 * is enough until we have evidence that per-service tuning matters.
 */
const DEFAULT_WARMUP_SAMPLE_COUNT = 2;

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
 * Fire a single warmup HTTP GET against `cfg.url`. The response is intentionally
 * discarded — warmup exists only to wake hibernating / scale-to-zero services
 * so the subsequent measurement batch reflects steady-state latency rather
 * than cold-start cost.
 *
 * Every outcome is swallowed: network error, AbortSignal timeout, even a 5xx
 * body. Warmup is pure prelude and never contributes to the probe result;
 * failure-handling lives entirely in the measurement path via `singleFetch`.
 *
 * The User-Agent carries a `(warmup)` suffix so service-side logs and
 * telemetry can filter warmup traffic cleanly without parsing timing or path
 * heuristics.
 */
async function warmupFetch(cfg: ServiceConfig): Promise<void> {
  try {
    await fetch(cfg.url, {
      signal: AbortSignal.timeout(WARMUP_FETCH_TIMEOUT_MS),
      headers: {"user-agent": "status.arolariu.ro-probe/1.0 (warmup)"},
    });
  } catch {
    // Pure prelude — warmup outcome never affects the probe result.
  }
}

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
 *
 * Before the measurement loop, fires `warmupSampleCount` warmup GETs back-to-back
 * via {@link warmupFetch}. Warmup outcomes never reach {@link aggregateSamples};
 * they exist only to absorb cold-start latency so the measurement samples
 * reflect steady state.
 */
async function probeOne(
  cfg: ServiceConfig,
  nowIso: string,
  delaysMs: readonly number[],
  warmupSampleCount: number,
): Promise<ProbeResult> {
  // Warmup phase: sequential, results discarded.
  for (let i = 0; i < warmupSampleCount; i++) {
    await warmupFetch(cfg);
  }
  // Measurement phase: existing semantics, unchanged.
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
  /**
   * Number of warmup HTTP GETs to fire per service BEFORE the measurement
   * batch. Warmup requests are pure prelude — their success / failure / latency
   * is discarded entirely and never reaches `aggregateSamples`. They exist
   * only to wake hibernating or scale-to-zero services so the measurement
   * batch reflects steady-state behavior.
   *
   * In production, defaults to {@link DEFAULT_WARMUP_SAMPLE_COUNT}. Tests
   * should pass `0` explicitly when they
   * count `fetch` invocations or branch on per-call indices, so the warmup
   * loop doesn't shift their indexing.
   */
  readonly warmupSampleCount?: number;
}

/**
 * Cron entry point: probe every configured service, aggregate the samples,
 * append the per-service `ProbeResult`s to `<dataDir>/raw/YYYY-MM-DD.jsonl`,
 * and return the array.
 *
 * The JSONL append is guarded against torn writes from a killed prior run
 * (see body comment); callers do not need to sanitise the file beforehand.
 *
 * @param opts - Data directory plus optional clock, sample-delay, and
 *   warmup-count overrides.
 * @returns One `ProbeResult` per configured service, in `SERVICES` order.
 */
export async function runProbe(opts: RunProbeOptions): Promise<ProbeResult[]> {
  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();
  /* v8 ignore next */
  const delays = opts.sampleDelaysMs ?? DEFAULT_SAMPLE_DELAYS_MS;
  const warmupSampleCount = opts.warmupSampleCount ?? DEFAULT_WARMUP_SAMPLE_COUNT;

  const results = await Promise.all(SERVICES.map((cfg) => probeOne(cfg, nowIso, delays, warmupSampleCount)));

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
