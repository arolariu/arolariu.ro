import {describe, it, expect} from "vitest";
import {parseExpArolariuRo} from "./expArolariuRo";

const ctx = {timestamp: "2026-04-19T14:00:00Z", latencyMs: 89};

describe("parseExpArolariuRo", () => {
  it("parses Healthy FastAPI response", () => {
    const body = {
      status: "Healthy", environment: "production",
      timestamp: "2026-04-19T14:00:00Z", startedAt: "2026-04-18T00:00:00Z",
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

  it("records 200 with unparseable body as Degraded", () => {
    const r = parseExpArolariuRo({status: 200, body: "not an object"}, ctx);
    expect(r.overall).toBe("Degraded");
  });
});
