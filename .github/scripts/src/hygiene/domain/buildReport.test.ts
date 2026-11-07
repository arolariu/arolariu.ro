import {describe, expect, it} from "vitest";
import {context} from "../../../lib/planning/fixtures/plans.ts";
import {plan, outcome} from "../../../lib/hygiene/fixtures/outcomes.ts";
import {providerIds} from "../../../lib/hygiene/registry.ts";
import {buildReport} from "./buildReport.ts";

describe("verified report compatibility", () => {
  it("cannot preserve the old empty-aggregate false pass", () => {
    const expected = plan(true);
    expect(buildReport(context(), expected, {outcomes: [], issues: []}).overallResult).toBe("errored");
    const report = buildReport(context(), expected, {outcomes: providerIds().map((id) => outcome(expected, id)), issues: []});
    expect(report.overallResult).toBe("passed");
    expect(report.schemaVersion).toBe("3");
    expect(report.plan?.id).toBe(expected.id);
  });
});
