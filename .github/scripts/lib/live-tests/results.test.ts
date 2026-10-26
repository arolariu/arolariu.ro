import {describe, expect, it} from "vitest";
import {reduceLiveResults, type LiveEvidence} from "./results.ts";
import {newman} from "../../helpers/newman/index.ts";
import {fs} from "../../helpers/filesystem/index.ts";
import {fileURLToPath} from "node:url";

const empty: LiveEvidence = {statuses: {}, reports: {}, completeness: {}, summaries: {}, logs: {}, health: null, diagnostics: []};
describe("live execution precedence", () => {
  it("does not turn job failure into success because assertions passed", async () => {
    const raw = await fs.readJson<unknown>(fileURLToPath(new URL("../../helpers/reports/fixtures/newman.json", import.meta.url)));
    const parsed = newman.parseReport(raw);
    const passing = {...parsed, failedRequests: 0, failedAssertions: 0, failures: []};
    const report = reduceLiveResults(["frontend"], {
      ...empty,
      statuses: {frontend: {status: "failure", duration: "1s"}},
      reports: {frontend: passing},
      completeness: {frontend: "complete"},
    });
    expect(report.results["frontend"]?.status).toBe("failure");
    expect(report.hasFailures).toBe(true);
  });
  it.each(["cancelled", "skipped"] as const)("retains %s rather than promoting its execution", (status) => {
    const report = reduceLiveResults(["frontend"], {...empty, statuses: {frontend: {status, duration: "N/A"}}});
    expect(report.results["frontend"]?.status).toBe(status);
    expect(report.hasFailures).toBe(false);
  });
  it("retains unknown status and diagnoses missing or invalid selected evidence", () => {
    const report = reduceLiveResults(["frontend"], {...empty, completeness: {frontend: "invalid"}});
    expect(report.results["frontend"]?.status).toBe("unknown");
    expect(report.hasFailures).toBe(true);
    expect(report.diagnostics.length).toBeGreaterThan(0);
  });
});
