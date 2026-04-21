import {describe, it, expect} from "vitest";
import {reconcileBodyVsHttp} from "./shared";

describe("reconcileBodyVsHttp", () => {
  it("overrides Healthy body on 5xx HTTP", () => {
    const r = reconcileBodyVsHttp("Healthy", 503);
    expect(r.status).toBe("Unhealthy");
    expect(r.error).toBe("HTTP 503");
  });

  it("keeps Healthy when HTTP is 2xx", () => {
    expect(reconcileBodyVsHttp("Healthy", 200)).toEqual({status: "Healthy"});
  });

  it("keeps Degraded unchanged regardless of HTTP", () => {
    expect(reconcileBodyVsHttp("Degraded", 500)).toEqual({status: "Degraded"});
    expect(reconcileBodyVsHttp("Degraded", 200)).toEqual({status: "Degraded"});
  });

  it("keeps Unhealthy unchanged", () => {
    expect(reconcileBodyVsHttp("Unhealthy", 503)).toEqual({status: "Unhealthy"});
    expect(reconcileBodyVsHttp("Unhealthy", 200)).toEqual({status: "Unhealthy"});
  });

  it("does not override at exactly HTTP 499 (< 500)", () => {
    expect(reconcileBodyVsHttp("Healthy", 499)).toEqual({status: "Healthy"});
  });

  it("overrides at exactly HTTP 500", () => {
    expect(reconcileBodyVsHttp("Healthy", 500)).toEqual({status: "Unhealthy", error: "HTTP 500"});
  });
});
