import type {HealthStatus, ProbeResult} from "../../src/lib/types/status";
import {reconcileBodyVsHttp} from "./shared";

export interface RawResponse {
  readonly status: number;
  readonly body: unknown;
  readonly error?: string;
}

export interface ProbeContext {
  readonly timestamp: string;
  readonly latencyMs: number;
}

function coerceOverallFromBody(body: unknown): HealthStatus | null {
  if (body && typeof body === "object" && "status" in body) {
    const s = (body as {status: unknown}).status;
    if (s === "Healthy" || s === "Degraded" || s === "Unhealthy") return s;
    if (typeof s === "string") return "Degraded";
  }
  return null;
}

export function parseArolariuRo(raw: RawResponse, ctx: ProbeContext): ProbeResult {
  const {status, body, error} = raw;
  const base = {
    service: "arolariu.ro" as const,
    timestamp: ctx.timestamp,
    latencyMs: ctx.latencyMs,
    httpStatus: status,
  };

  if (status === 0) {
    return {...base, overall: "Unhealthy", error: error ?? "transport error"};
  }

  const bodyStatus = coerceOverallFromBody(body);
  if (bodyStatus !== null) {
    const {status: overall, error: overrideError} = reconcileBodyVsHttp(bodyStatus, status);
    return overrideError
      ? {...base, overall, error: overrideError}
      : {...base, overall};
  }

  if (status >= 200 && status < 300) {
    return {...base, overall: "Degraded", error: "unrecognized response shape"};
  }
  return {...base, overall: "Unhealthy", error: `HTTP ${status}`};
}
