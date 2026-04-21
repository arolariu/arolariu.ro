/**
 * Parser for the .NET backend at `api.arolariu.ro`. The endpoint uses the
 * ASP.NET `AspNetCore.HealthChecks.UI` payload shape
 * (`{status, entries: {name: {status, duration, description}}}`) so this
 * parser is also responsible for unpacking sub-check entries and
 * converting .NET `TimeSpan` strings into milliseconds.
 */
import type {HealthStatus, ProbeResult, SubCheck} from "../../src/lib/types/status";
import {sanitizeDescription} from "../sanitize";
import type {ProbeContext, RawResponse} from "./arolariuRo";
import {reconcileBodyVsHttp} from "./shared";

/** One entry in the HealthChecks-UI `entries` dictionary. */
interface UiEntry {
  /** Per-check status string — expected to be one of HealthStatus, but lenient. */
  readonly status?: string;
  /** .NET TimeSpan string (e.g. `"00:00:00.8470000"`); parsed by {@link timeSpanToMs}. */
  readonly duration?: string;
  /** Free-form message; sanitised before being surfaced. */
  readonly description?: string;
}

/** Top-level HealthChecks-UI payload shape emitted by ASP.NET Core. */
interface UiBody {
  readonly status?: string;
  readonly entries?: Record<string, UiEntry>;
}

/** Type guard: narrows an arbitrary value to one of the three `HealthStatus` literals. */
function isHealthStatusValue(v: unknown): v is HealthStatus {
  return v === "Healthy" || v === "Degraded" || v === "Unhealthy";
}

/**
 * Parses a .NET `TimeSpan` string like `"00:00:00.8470000"` to
 * milliseconds. The fractional component is .NET "ticks" (100ns units);
 * padding to 7 digits is the canonical max precision before overflow.
 * Returns `0` for absent/unparseable input.
 */
function timeSpanToMs(input: string | undefined): number {
  if (!input) return 0;
  const match = input.match(/^(\d+):(\d+):(\d+)(?:\.(\d+))?$/);
  if (!match) return 0;
  const [, h, m, s, fracRaw] = match;
  const frac = (fracRaw ?? "0").padEnd(7, "0").slice(0, 7);
  const subMs = Number.parseInt(frac, 10) / 10_000;
  /* v8 ignore next 3 */
  return Number.parseInt(h ?? "0", 10) * 3_600_000 + Number.parseInt(m ?? "0", 10) * 60_000 + Number.parseInt(s ?? "0", 10) * 1_000 + subMs;
}

/**
 * Flatten the HealthChecks-UI `entries` dictionary into the `SubCheck[]`
 * shape the rest of the pipeline expects. Lenient on status (unknown
 * values degrade to `"Degraded"`); descriptions are run through
 * {@link sanitizeDescription} to strip URLs and secret patterns.
 */
function parseEntries(entries: Record<string, UiEntry> | undefined): SubCheck[] {
  if (!entries) return [];
  const out: SubCheck[] = [];
  for (const [name, entry] of Object.entries(entries)) {
    const status = isHealthStatusValue(entry.status) ? entry.status : "Degraded";
    const description = sanitizeDescription(entry.description);
    out.push({
      name,
      status,
      durationMs: Math.round(timeSpanToMs(entry.duration)),
      ...(description !== undefined && {description}),
    });
  }
  return out;
}

/** Type guard: narrows `unknown` to a HealthChecks-UI payload. */
function isUiBody(v: unknown): v is UiBody {
  return v !== null && typeof v === "object" && ("status" in v || "entries" in v);
}

/**
 * Parse a response from `https://api.arolariu.ro/health` into a
 * `ProbeResult`, including per-dependency sub-checks. Same decision
 * flow as {@link parseArolariuRo} (transport error → body → HTTP
 * fallback), plus sub-check materialisation and body/HTTP reconciliation
 * (e.g. body says Healthy but HTTP is 5xx → Unhealthy).
 */
export function parseApiArolariuRo(raw: RawResponse, ctx: ProbeContext): ProbeResult {
  const {status, body, error} = raw;
  const base = {
    service: "api.arolariu.ro" as const,
    timestamp: ctx.timestamp,
    latencyMs: ctx.latencyMs,
    httpStatus: status,
  };

  if (status === 0) {
    return {...base, overall: "Unhealthy", error: error ?? "transport error"};
  }

  if (!isUiBody(body)) {
    if (status >= 200 && status < 300) {
      return {...base, overall: "Degraded", error: "unrecognized response shape"};
    }
    return {...base, overall: "Unhealthy", error: `HTTP ${status}`};
  }

  const subChecks = parseEntries(body.entries);
  const bodyOverall: HealthStatus = isHealthStatusValue(body.status) ? body.status : "Degraded";
  const {status: overall, error: overrideError} = reconcileBodyVsHttp(bodyOverall, status);
  const result: ProbeResult = overrideError ? {...base, overall, error: overrideError} : {...base, overall};
  return subChecks.length > 0 ? {...result, subChecks} : result;
}
