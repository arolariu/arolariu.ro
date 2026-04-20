import {mkdirSync, appendFileSync, existsSync, readFileSync} from "node:fs";
import {join} from "node:path";
import {performance} from "node:perf_hooks";
import {setTimeout as sleep} from "node:timers/promises";
import type {HealthStatus, ProbeResult, ServiceId} from "../src/lib/types/status";
import type {ProbeContext, RawResponse} from "./parsers/arolariuRo";
import {parseArolariuRo} from "./parsers/arolariuRo";
import {parseApiArolariuRo} from "./parsers/apiArolariuRo";
import {parseCvArolariuRo} from "./parsers/cvArolariuRo";
import {parseExpArolariuRo} from "./parsers/expArolariuRo";

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
const DEFAULT_SAMPLE_DELAYS_MS: readonly number[] = [
  0, 20_000, 40_000, 60_000, 80_000, 100_000, 120_000, 140_000, 160_000, 180_000,
];

const STATUS_ORDER: Record<HealthStatus, number> = {Healthy: 0, Degraded: 1, Unhealthy: 2};

interface ServiceConfig {
  readonly service: ServiceId;
  readonly url: string;
  readonly parse: (raw: RawResponse, ctx: ProbeContext) => ProbeResult;
  readonly parseBody: boolean;
}

const SERVICES: readonly ServiceConfig[] = [
  {service: "arolariu.ro", url: "https://arolariu.ro/api/health", parse: parseArolariuRo, parseBody: true},
  {service: "api.arolariu.ro", url: "https://api.arolariu.ro/health", parse: parseApiArolariuRo, parseBody: true},
  {service: "exp.arolariu.ro", url: "https://exp.arolariu.ro/api/health", parse: parseExpArolariuRo, parseBody: true},
  {service: "cv.arolariu.ro", url: "https://cv.arolariu.ro/", parse: parseCvArolariuRo, parseBody: false},
];

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
    const message = error instanceof Error
      ? (error.name === "TimeoutError"
          ? `timeout after ${PROBE_TIMEOUT_MS}ms`
          : `${error.name}: ${error.message}`)
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
 *   - `timestamp` is the first sample's timestamp, so every service's
 *     aggregate aligns to the same 30-min bucket regardless of which
 *     sample was fastest/slowest.
 */
function aggregateSamples(samples: readonly ProbeResult[]): ProbeResult {
  const first = samples[0];
  if (first === undefined) throw new Error("aggregateSamples requires at least one sample");
  const worst = samples.reduce<ProbeResult>(
    (w, s) => STATUS_ORDER[s.overall] > STATUS_ORDER[w.overall] ? s : w,
    first,
  );
  const sortedLatencies = [...samples.map(s => s.latencyMs)].sort((a, b) => a - b);
  const median = sortedLatencies[Math.floor(samples.length / 2)] ?? first.latencyMs;
  const base: ProbeResult = {
    service: worst.service,
    timestamp: first.timestamp,
    latencyMs: median,
    httpStatus: worst.httpStatus,
    overall: worst.overall,
    sampleCount: samples.length,
  };
  return {
    ...base,
    ...(worst.subChecks !== undefined && {subChecks: worst.subChecks}),
    ...(worst.error !== undefined && {error: worst.error}),
  };
}

async function probeOne(
  cfg: ServiceConfig,
  nowIso: string,
  delaysMs: readonly number[],
): Promise<ProbeResult> {
  const samples: ProbeResult[] = [];
  for (let i = 0; i < delaysMs.length; i++) {
    const delay = delaysMs[i] ?? 0;
    if (delay > 0) await sleep(delay);
    samples.push(await singleFetch(cfg, nowIso));
  }
  return aggregateSamples(samples);
}

export interface RunProbeOptions {
  readonly dataDir: string;
  readonly now?: Date;
  /** Delay BEFORE each sample fetch. Defaults to [0, 15000, 30000]. Pass [0, 0, 0] in tests. */
  readonly sampleDelaysMs?: readonly number[];
}

export async function runProbe(opts: RunProbeOptions): Promise<ProbeResult[]> {
  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();
  const delays = opts.sampleDelaysMs ?? DEFAULT_SAMPLE_DELAYS_MS;

  const results = await Promise.all(SERVICES.map(cfg => probeOne(cfg, nowIso, delays)));

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
  const lines = (needsPrefix ? "\n" : "") + results.map(r => JSON.stringify(r)).join("\n") + "\n";
  appendFileSync(file, lines, "utf8");

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dataDir = process.env["DATA_DIR"] ?? "./data";
  runProbe({dataDir}).then(r => {
    console.log(`wrote ${r.length} probe results to ${dataDir}`);
  }).catch(err => {
    console.error("probe failed:", err);
    process.exit(1);
  });
}
