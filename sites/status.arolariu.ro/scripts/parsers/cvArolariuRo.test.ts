import {describe, expect, it} from "vitest";
import {parseCvArolariuRo} from "./cvArolariuRo";

const ctx = {timestamp: "2026-04-19T14:00:00Z", latencyMs: 35};

describe("parseCvArolariuRo", () => {
  it("200 → Healthy", () => {
    const r = parseCvArolariuRo({status: 200, body: null}, ctx);
    expect(r).toMatchObject({service: "cv.arolariu.ro", overall: "Healthy", httpStatus: 200});
    expect(r.subChecks).toBeUndefined();
  });

  it("301 → Healthy (2xx/3xx both ok for a static homepage)", () => {
    const r = parseCvArolariuRo({status: 301, body: null}, ctx);
    expect(r.overall).toBe("Healthy");
  });

  it("404 → Degraded", () => {
    const r = parseCvArolariuRo({status: 404, body: null}, ctx);
    expect(r.overall).toBe("Degraded");
    expect(r.error).toBeDefined();
  });

  it("500 → Unhealthy", () => {
    const r = parseCvArolariuRo({status: 500, body: null}, ctx);
    expect(r.overall).toBe("Unhealthy");
  });

  it("transport error → Unhealthy with error", () => {
    const r = parseCvArolariuRo({status: 0, body: null, error: "timeout"}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.error).toBe("timeout");
  });

  it("transport error with no error field → 'transport error' default", () => {
    const r = parseCvArolariuRo({status: 0, body: null}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.error).toBe("transport error");
  });
});
