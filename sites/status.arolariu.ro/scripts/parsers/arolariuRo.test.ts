import {describe, expect, it} from "vitest";
import {parseArolariuRo} from "./arolariuRo";

const ctx = {timestamp: "2026-04-19T14:00:00Z", latencyMs: 142};

describe("parseArolariuRo", () => {
  it("parses Healthy body with 200 status", () => {
    const r = parseArolariuRo({status: 200, body: {status: "Healthy"}}, ctx);
    expect(r).toMatchObject({
      service: "arolariu.ro",
      timestamp: ctx.timestamp,
      latencyMs: 142,
      httpStatus: 200,
      overall: "Healthy",
    });
  });

  it("honors Degraded body even with HTTP 200", () => {
    const r = parseArolariuRo({status: 200, body: {status: "Degraded"}}, ctx);
    expect(r.overall).toBe("Degraded");
  });

  it("records HTTP 503 with Unhealthy body as Unhealthy", () => {
    const r = parseArolariuRo({status: 503, body: {status: "Unhealthy"}}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.httpStatus).toBe(503);
  });

  it("records non-ok HTTP with no parseable body as Unhealthy", () => {
    const r = parseArolariuRo({status: 500, body: null}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.error).toBeDefined();
  });

  it("records 200 with unknown body status as Degraded", () => {
    const r = parseArolariuRo({status: 200, body: {status: "sleeping"}}, ctx);
    expect(r.overall).toBe("Degraded");
  });

  it("records transport error as Unhealthy with error message", () => {
    const r = parseArolariuRo({status: 0, body: null, error: "timeout"}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.error).toBe("timeout");
  });

  it("never emits subChecks", () => {
    const r = parseArolariuRo({status: 200, body: {status: "Healthy"}}, ctx);
    expect(r.subChecks).toBeUndefined();
  });

  it("records transport error with default message when error field is absent", () => {
    const r = parseArolariuRo({status: 0, body: null}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.error).toBe("transport error");
  });

  it("records 4xx with no parseable body as Unhealthy", () => {
    const r = parseArolariuRo({status: 404, body: null}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.error).toBe("HTTP 404");
  });

  it("reconciles Healthy body with 200 — no override error", () => {
    const r = parseArolariuRo({status: 200, body: {status: "Healthy"}}, ctx);
    expect(r.error).toBeUndefined();
    expect(r.overall).toBe("Healthy");
  });

  it("reconciles Healthy body + HTTP 503 → override error (TRUE branch of ternary)", () => {
    // body claims Healthy but HTTP is 5xx → reconcileBodyVsHttp overrides to Unhealthy
    const r = parseArolariuRo({status: 503, body: {status: "Healthy"}}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.error).toBe("HTTP 503");
  });

  it("coerces unknown string status in body to Degraded", () => {
    // body.status = "Starting" is a string but not a known HealthStatus → Degraded
    const r = parseArolariuRo({status: 200, body: {status: "Starting"}}, ctx);
    expect(r.overall).toBe("Degraded");
  });

  it("falls through coerceOverallFromBody when body.status is non-string (returns null)", () => {
    // body.status = 42 (a number) → typeof s === "string" is false → returns null → 2xx Degraded fallback
    const r = parseArolariuRo({status: 200, body: {status: 42}}, ctx);
    // coerceOverallFromBody returns null → falls to 2xx Degraded
    expect(r.overall).toBe("Degraded");
    expect(r.error).toBe("unrecognized response shape");
  });

  it("returns Unhealthy for non-2xx with no parseable body (fallback path)", () => {
    // body is an object without status → coerceOverallFromBody returns null
    // status 503 → not 2xx → HTTP fallback
    const r = parseArolariuRo({status: 503, body: {foo: "bar"}}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.error).toBe("HTTP 503");
  });
});
