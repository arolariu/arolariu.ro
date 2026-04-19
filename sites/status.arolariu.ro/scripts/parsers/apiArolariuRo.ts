import type {HealthStatus, ProbeResult, SubCheck} from "../../src/lib/types/status";
import {sanitizeDescription} from "../sanitize";
import type {ProbeContext, RawResponse} from "./arolariuRo";

interface UiEntry {
  readonly status?: string;
  readonly duration?: string;
  readonly description?: string;
}

interface UiBody {
  readonly status?: string;
  readonly entries?: Record<string, UiEntry>;
}

function isHealthStatusValue(v: unknown): v is HealthStatus {
  return v === "Healthy" || v === "Degraded" || v === "Unhealthy";
}

/** Parses .NET TimeSpan string like "00:00:00.8470000" to milliseconds. */
function timeSpanToMs(input: string | undefined): number {
  if (!input) return 0;
  const match = input.match(/^(\d+):(\d+):(\d+)(?:\.(\d+))?$/);
  if (!match) return 0;
  const [, h, m, s, fracRaw] = match;
  const frac = (fracRaw ?? "0").padEnd(7, "0").slice(0, 7);
  const subMs = Number.parseInt(frac, 10) / 10_000;
  return Number.parseInt(h, 10) * 3_600_000
    + Number.parseInt(m, 10) * 60_000
    + Number.parseInt(s, 10) * 1_000
    + subMs;
}

function parseEntries(entries: Record<string, UiEntry> | undefined): SubCheck[] {
  if (!entries) return [];
  const out: SubCheck[] = [];
  for (const [name, entry] of Object.entries(entries)) {
    const status = isHealthStatusValue(entry.status) ? entry.status : "Degraded";
    out.push({
      name,
      status,
      durationMs: Math.round(timeSpanToMs(entry.duration)),
      description: sanitizeDescription(entry.description),
    });
  }
  return out;
}

function isUiBody(v: unknown): v is UiBody {
  return v !== null && typeof v === "object" && ("status" in v || "entries" in v);
}

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
  const overall: HealthStatus = isHealthStatusValue(body.status) ? body.status : "Degraded";
  const result: ProbeResult = {...base, overall};
  return subChecks.length > 0 ? {...result, subChecks} : result;
}
