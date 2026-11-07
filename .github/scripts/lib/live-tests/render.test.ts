import {describe, expect, it} from "vitest";
import {context} from "../planning/fixtures/plans.ts";
import {readLiveConfiguration} from "./config.ts";
import {reduceLiveResults} from "./results.ts";
import {renderLiveIssue} from "./render.ts";

describe("pure live issue rendering", () => {
  it("uses the default target set and enforces even very small explicit body limits", () => {
    const configuration = readLiveConfiguration({});
    expect(configuration.targets).toEqual(["frontend", "backend", "cv"]);
    const report = reduceLiveResults(["frontend"], {
      statuses: {frontend: {status: "failure", duration: "1s"}},
      reports: {},
      completeness: {frontend: "missing"},
      summaries: {frontend: "data ".repeat(1000)},
      logs: {},
      health: null,
      diagnostics: [],
    });
    for (const budget of [10, 1200])
      expect(renderLiveIssue(context(), report, {...configuration, maxIssueBodyChars: budget}).length).toBeLessThanOrEqual(budget);
  });
});
