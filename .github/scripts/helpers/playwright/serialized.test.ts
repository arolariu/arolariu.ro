import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {fs} from "../filesystem/index.ts";
import {createPlaywrightHelper} from "./index.ts";

describe("serialized Playwright evidence", () => {
  it("preserves global setup/teardown failures without fabricating failed assertions", async () => {
    const helper = createPlaywrightHelper();
    const result = await helper.parseResults(
      fileURLToPath(new URL("../reports/fixtures/playwright-global-error.json", import.meta.url)),
      fs,
    );
    expect(result.statistics).toMatchObject({total: 1, passed: 1, failed: 0});
    expect(result.errors?.[0]?.message).toBe("Global teardown failed");
    const markdown = helper.generateMarkdownSection(result);
    expect(markdown).toContain("Runner Errors");
    expect(markdown).toContain("Global teardown failed");
    expect(markdown).not.toContain("### ✅");
  });
  it("visits nested suites and uses logical outcomes for expected failures and retries", async () => {
    const result = await createPlaywrightHelper().parseResults(
      fileURLToPath(new URL("../reports/fixtures/playwright.json", import.meta.url)),
      fs,
    );
    expect(result.tests).toHaveLength(3);
    expect(result.tests.map((test) => test.status)).toEqual(["passed", "flaky", "interrupted"]);
    expect(result.tests[0]).toMatchObject({
      fullTitle: "nested.spec.ts › feature › known failure",
      file: "tests/nested.spec.ts",
      project: "chromium",
    });
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.error?.message).toBe("Worker interrupted");
    expect(result.statistics).toMatchObject({total: 3, passed: 1, failed: 1, flaky: 1});
  });
});
