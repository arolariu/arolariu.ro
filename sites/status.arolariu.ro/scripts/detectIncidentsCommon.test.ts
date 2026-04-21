// @vitest-environment node
import {describe, it, expect} from "vitest";
import {buildIncidentId, toSeverity, trackKey, worstSeverity} from "./detectIncidentsCommon";

describe("trackKey", () => {
  it("uses the bare service id when no sub-check", () => {
    expect(trackKey("arolariu.ro")).toBe("arolariu.ro");
  });
  it("namespaces sub-check keys with ::", () => {
    expect(trackKey("api.arolariu.ro", "mssql")).toBe("api.arolariu.ro::mssql");
  });
});

describe("worstSeverity", () => {
  it("Unhealthy dominates Degraded", () => {
    expect(worstSeverity("Degraded", "Unhealthy")).toBe("Unhealthy");
    expect(worstSeverity("Unhealthy", "Degraded")).toBe("Unhealthy");
  });
  it("returns Degraded when both Degraded", () => {
    expect(worstSeverity("Degraded", "Degraded")).toBe("Degraded");
  });
});

describe("toSeverity", () => {
  it("maps Unhealthy → Unhealthy", () => {
    expect(toSeverity("Unhealthy")).toBe("Unhealthy");
  });
  it("maps Degraded → Degraded", () => {
    expect(toSeverity("Degraded")).toBe("Degraded");
  });
  it("maps Healthy → Degraded (neutral default)", () => {
    expect(toSeverity("Healthy")).toBe("Degraded");
  });
});

describe("buildIncidentId", () => {
  it("slugifies the timestamp and includes service", () => {
    expect(buildIncidentId("2026-04-19T14:00:00.000Z", "arolariu.ro"))
      .toBe("inc-2026-04-19T14-00-00-000Z-arolariu.ro");
  });
  it("includes sub-check suffix when provided", () => {
    expect(buildIncidentId("2026-04-19T14:00:00Z", "api.arolariu.ro", "mssql"))
      .toBe("inc-2026-04-19T14-00-00Z-api.arolariu.ro-mssql");
  });
});
