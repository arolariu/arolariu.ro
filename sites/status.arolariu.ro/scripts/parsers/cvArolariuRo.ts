import type {ProbeResult} from "../../src/lib/types/status";
import type {ProbeContext, RawResponse} from "./arolariuRo";

export function parseCvArolariuRo(raw: RawResponse, ctx: ProbeContext): ProbeResult {
  const {status, error} = raw;
  const base = {
    service: "cv.arolariu.ro" as const,
    timestamp: ctx.timestamp,
    latencyMs: ctx.latencyMs,
    httpStatus: status,
  };

  if (status === 0) {
    return {...base, overall: "Unhealthy", error: error ?? "transport error"};
  }
  if (status >= 200 && status < 400) {
    return {...base, overall: "Healthy"};
  }
  if (status >= 400 && status < 500) {
    return {...base, overall: "Degraded", error: `HTTP ${status}`};
  }
  return {...base, overall: "Unhealthy", error: `HTTP ${status}`};
}
