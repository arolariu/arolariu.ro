import {describe, it, expect} from "vitest";
import {parseArolariuRo} from "./arolariuRo";

const ctx = {timestamp: "2026-04-19T14:00:00Z", latencyMs: 142};

describe("parseArolariuRo", () => {
  it("parses Healthy body with 200 status", () => {
    const r = parseArolariuRo({status: 200, body: {status: "Healthy"}}, ctx);
    expect(r).toMatchObject({
      service: "arolariu.ro", timestamp: ctx.timestamp, latencyMs: 142,
      httpStatus: 200, overall: "Healthy",
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
});
