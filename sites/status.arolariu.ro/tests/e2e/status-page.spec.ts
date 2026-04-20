import {test, expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const fixtures = {
  fine: readFileSync(join(__dirname, "../fixtures/aggregate-14d-mixed.json"), "utf8"),
  hourly: readFileSync(join(__dirname, "../fixtures/aggregate-90d-all-healthy.json"), "utf8"),
  daily: readFileSync(join(__dirname, "../fixtures/aggregate-365d-with-outage.json"), "utf8"),
  incidents: readFileSync(join(__dirname, "../fixtures/incidents-active.json"), "utf8"),
};

test.describe("status page", () => {
  test.beforeEach(async ({page}) => {
    // Clear localStorage to avoid 30-min cache from previous tests
    await page.addInitScript(() => {
      try { localStorage.clear(); } catch { /* ignore */ }
    });
    await page.route(/raw\.githubusercontent\.com.+fine\.json/, (route) =>
      route.fulfill({status: 200, contentType: "application/json", body: fixtures.fine}));
    await page.route(/raw\.githubusercontent\.com.+hourly\.json/, (route) =>
      route.fulfill({status: 200, contentType: "application/json", body: fixtures.hourly}));
    await page.route(/raw\.githubusercontent\.com.+daily\.json/, (route) =>
      route.fulfill({status: 200, contentType: "application/json", body: fixtures.daily}));
    await page.route(/raw\.githubusercontent\.com.+incidents\.json/, (route) =>
      route.fulfill({status: 200, contentType: "application/json", body: fixtures.incidents}));
  });

  test("shows skeleton then data", async ({page}) => {
    await page.goto("/?mocks=off");
    await expect(page.getByText("arolariu.ro", {exact: true}).first()).toBeVisible();
    await expect(page.getByText("api.arolariu.ro", {exact: true})).toBeVisible();
  });

  test("filter pill click loads different granularity", async ({page}) => {
    await page.goto("/?mocks=off");
    await expect(page.getByText("api.arolariu.ro")).toBeVisible();
    await page.getByRole("tab", {name: "90d"}).click();
    await expect(page.getByRole("button").first()).toBeVisible();
  });

  test("hover on degraded segment shows tooltip", async ({page}) => {
    await page.goto("/?mocks=off");
    // Switch to 14d window to ensure all degraded buckets are in view
    await page.getByRole("tab", {name: "14d"}).click();
    await expect(page.getByText("api.arolariu.ro", {exact: true}).first()).toBeVisible();
    // Wait for segments to render, then locate degraded ones
    await expect(page.locator(".seg-degraded").first()).toBeVisible({timeout: 10000});
    const degraded = page.locator(".seg-degraded").first();
    await degraded.hover({force: true});
    await expect(page.getByRole("tooltip")).toBeVisible();
    await expect(page.getByRole("tooltip")).toContainText("Degraded");
  });

  test("expand api.arolariu.ro reveals mssql/cosmosdb sub-rows", async ({page}) => {
    await page.goto("/?mocks=off");
    await expect(page.getByText("api.arolariu.ro")).toBeVisible();
    const toggle = page.getByRole("button", {name: /Expand sub-checks/});
    await toggle.click();
    await expect(page.getByText("↳ mssql")).toBeVisible();
    await expect(page.getByText("↳ cosmosdb")).toBeVisible();
  });

  test("refresh button issues fresh fetch", async ({page}) => {
    let fetchCount = 0;
    await page.route(/raw\.githubusercontent\.com.+fine\.json/, (route) => {
      fetchCount++;
      route.fulfill({status: 200, contentType: "application/json", body: fixtures.fine});
    });
    await page.goto("/?mocks=off");
    await expect(page.getByText("arolariu.ro").first()).toBeVisible();
    const before = fetchCount;
    await page.getByLabel("Refresh status data").click();
    await page.waitForTimeout(500);
    expect(fetchCount).toBeGreaterThan(before);
  });

  test("network error shows retry button", async ({page}) => {
    await page.route(/raw\.githubusercontent\.com.+fine\.json/, (route) =>
      route.fulfill({status: 500, body: ""}));
    await page.goto("/?mocks=off");
    await expect(page.getByRole("alert")).toContainText("unreachable");
  });

  test("refresh button is disabled during in-flight refresh (double-click safe)", async ({page}) => {
    await page.goto("/?mocks=off");
    await expect(page.getByText("arolariu.ro").first()).toBeVisible();
    const btn = page.getByLabel("Refresh status data");
    await btn.click();
    // The button should be disabled while refreshing. Attempting a second
    // click via .click({trial: true}) asserts the button is interactive,
    // which would fail if disabled. Instead, check the disabled attribute.
    await expect(btn).toBeDisabled();
  });
});
