import {describe, expect, it} from "vitest";
import {parseExpArolariuRo} from "./expArolariuRo";

const ctx = {timestamp: "2026-04-19T14:00:00Z", latencyMs: 89};

describe("parseExpArolariuRo", () => {
  it("parses Healthy FastAPI response", () => {
    const body = {
      status: "Healthy",
      environment: "production",
      timestamp: "2026-04-19T14:00:00Z",
      startedAt: "2026-04-18T00:00:00Z",
    };
    const r = parseExpArolariuRo({status: 200, body}, ctx);
    expect(r.service).toBe("exp.arolariu.ro");
    expect(r.overall).toBe("Healthy");
    expect(r.subChecks).toBeUndefined();
  });

  it("parses NotReady as Unhealthy", () => {
    const r = parseExpArolariuRo({status: 503, body: {status: "NotReady"}}, ctx);
    expect(r.overall).toBe("Unhealthy");
  });

  it("records transport error", () => {
    const r = parseExpArolariuRo({status: 0, body: null, error: "ENOTFOUND"}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.error).toBe("ENOTFOUND");
  });

  it("records transport error with default message when error is undefined", () => {
    const r = parseExpArolariuRo({status: 0, body: null}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.error).toBe("transport error");
  });

  it("records 200 with unparseable body as Degraded", () => {
    const r = parseExpArolariuRo({status: 200, body: "not an object"}, ctx);
    expect(r.overall).toBe("Degraded");
  });

  it("overrides Healthy body to Unhealthy when HTTP is 5xx", () => {
    const r = parseExpArolariuRo({status: 502, body: {status: "Healthy"}}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.error).toBe("HTTP 502");
  });

  it("records 4xx with no body as Unhealthy (HTTP fallback)", () => {
    const r = parseExpArolariuRo({status: 404, body: null}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.error).toBe("HTTP 404");
  });

  it("records unknown string body status as Degraded", () => {
    const r = parseExpArolariuRo({status: 200, body: {status: "Starting"}}, ctx);
    expect(r.overall).toBe("Degraded");
  });

  it("Degraded body with 200 stays Degraded (no override)", () => {
    const r = parseExpArolariuRo({status: 200, body: {status: "Degraded"}}, ctx);
    expect(r.overall).toBe("Degraded");
    expect(r.error).toBeUndefined();
  });

  it("coerces unknown string status in body to Degraded", () => {
    // body.status = "Pending" is a string but not a known value → Degraded
    const r = parseExpArolariuRo({status: 200, body: {status: "Pending"}}, ctx);
    expect(r.overall).toBe("Degraded");
  });

  it("falls through coerceOverall when body.status is non-string (number)", () => {
    // body.status = 0 (number) → typeof s === "string" is false → coerceOverall returns null → 2xx Degraded
    const r = parseExpArolariuRo({status: 200, body: {status: 0}}, ctx);
    expect(r.overall).toBe("Degraded");
    expect(r.error).toBe("unrecognized response shape");
  });
});
