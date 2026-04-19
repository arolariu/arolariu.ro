import {describe, it, expect} from "vitest";
import {parseApiArolariuRo} from "./apiArolariuRo";

const ctx = {timestamp: "2026-04-19T14:00:00Z", latencyMs: 310};

const canonicalBody = {
  status: "Healthy",
  totalDuration: "00:00:00.1234567",
  entries: {
    mssql: {status: "Healthy", duration: "00:00:00.010", description: "SqlServer is healthy"},
    cosmosdb: {status: "Healthy", duration: "00:00:00.048", description: "CosmosDB reachable"},
  },
};

describe("parseApiArolariuRo", () => {
  it("parses canonical Healthy body into subChecks", () => {
    const r = parseApiArolariuRo({status: 200, body: canonicalBody}, ctx);
    expect(r.service).toBe("api.arolariu.ro");
    expect(r.overall).toBe("Healthy");
    expect(r.subChecks).toHaveLength(2);
    expect(r.subChecks?.find(s => s.name === "mssql")?.status).toBe("Healthy");
  });

  it("maps TimeSpan duration string to durationMs", () => {
    const r = parseApiArolariuRo({status: 200, body: canonicalBody}, ctx);
    const mssql = r.subChecks?.find(s => s.name === "mssql");
    expect(mssql?.durationMs).toBe(10);
  });

  it("parses Degraded body with degraded sub-check", () => {
    const body = {
      status: "Degraded",
      entries: {
        mssql: {status: "Degraded", duration: "00:00:00.847", description: "connection pool exhausted"},
        cosmosdb: {status: "Healthy", duration: "00:00:00.050"},
      },
    };
    const r = parseApiArolariuRo({status: 200, body}, ctx);
    expect(r.overall).toBe("Degraded");
    const mssql = r.subChecks?.find(s => s.name === "mssql");
    expect(mssql?.description).toBe("connection pool exhausted");
  });

  it("sanitizes description fields", () => {
    const body = {
      status: "Degraded",
      entries: {
        mssql: {
          status: "Degraded", duration: "00:00:00.010",
          description: "failed connecting to tcp://db.internal:1433 password=s3cret",
        },
      },
    };
    const r = parseApiArolariuRo({status: 200, body}, ctx);
    const d = r.subChecks?.find(s => s.name === "mssql")?.description ?? "";
    expect(d).not.toContain("tcp://");
    expect(d).not.toContain("password=");
  });

  it("records 503 with parseable body as Unhealthy preserving subChecks", () => {
    const body = {
      status: "Unhealthy",
      entries: {mssql: {status: "Unhealthy", duration: "00:00:10.000", description: "timeout"}},
    };
    const r = parseApiArolariuRo({status: 503, body}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.subChecks).toHaveLength(1);
  });

  it("records transport error as Unhealthy with no subChecks", () => {
    const r = parseApiArolariuRo({status: 0, body: null, error: "timeout"}, ctx);
    expect(r.overall).toBe("Unhealthy");
    expect(r.subChecks).toBeUndefined();
    expect(r.error).toBe("timeout");
  });

  it("records 200 with unparseable body as Degraded", () => {
    const r = parseApiArolariuRo({status: 200, body: {foo: "bar"}}, ctx);
    expect(r.overall).toBe("Degraded");
  });
});
