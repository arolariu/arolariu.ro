import type {HealthStatus, ProbeResult} from "../../src/lib/types/status";
import type {ProbeContext, RawResponse} from "./arolariuRo";

function coerceOverall(body: unknown): HealthStatus | null {
  if (body && typeof body === "object" && "status" in body) {
    const s = (body as {status: unknown}).status;
    if (s === "Healthy") return "Healthy";
    if (s === "Degraded") return "Degraded";
    if (s === "Unhealthy" || s === "NotReady") return "Unhealthy";
    if (typeof s === "string") return "Degraded";
  }
  return null;
}

export function parseExpArolariuRo(raw: RawResponse, ctx: ProbeContext): ProbeResult {
  const {status, body, error} = raw;
  const base = {
    service: "exp.arolariu.ro" as const,
    timestamp: ctx.timestamp,
    latencyMs: ctx.latencyMs,
    httpStatus: status,
  };

  if (status === 0) {
    return {...base, overall: "Unhealthy", error: error ?? "transport error"};
  }

  const bodyStatus = coerceOverall(body);
  if (bodyStatus !== null) return {...base, overall: bodyStatus};

  if (status >= 200 && status < 300) {
    return {...base, overall: "Degraded", error: "unrecognized response shape"};
  }
  return {...base, overall: "Unhealthy", error: `HTTP ${status}`};
}
