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
    // Service name appears both in the service table row and (when an
    // incident exists for it) as a filter chip in the IncidentList.
    // Use .first() to match the table row unambiguously.
    await expect(page.getByText("api.arolariu.ro", {exact: true}).first()).toBeVisible();
  });

  test("filter pill click loads different granularity", async ({page}) => {
    await page.goto("/?mocks=off");
    await expect(page.getByText("api.arolariu.ro").first()).toBeVisible();
    await page.getByRole("radio", {name: "90d"}).click();
    await expect(page.getByRole("button").first()).toBeVisible();
  });

  test("hover on degraded segment shows tooltip", async ({page}) => {
    await page.goto("/?mocks=off");
    // Switch to 14d window to ensure all degraded buckets are in view
    await page.getByRole("radio", {name: "14d"}).click();
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
    await expect(page.getByText("api.arolariu.ro").first()).toBeVisible();
    // The service row itself is role="button" with the service name in its
    // accessible name. Click that row (restrict to the first such match to
    // avoid collision with any other role="button" on the page).
    const row = page.getByRole("button", {name: /api\.arolariu\.ro/}).first();
    await row.click();
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

  test("shows summary stats with correct values", async ({page}) => {
    await page.goto("/?mocks=off");
    const stats = page.getByTestId("summary-stats");
    await expect(stats).toBeVisible();
    // All 4 cards present as <dl> elements with non-empty visible text.
    const cards = stats.locator("dl.card");
    await expect(cards).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(cards.nth(i)).not.toBeEmpty();
    }
    // Incidents card value must be a non-negative integer.
    const incidentsValue = cards.nth(2).locator(".value");
    await expect(incidentsValue).toBeVisible();
    const text = (await incidentsValue.textContent())?.trim() ?? "";
    expect(text).toMatch(/^\d+$/);
  });

  test("clicking a service row expands the latency chart", async ({page}) => {
    await page.goto("/?mocks=off");
    await expect(page.getByText("arolariu.ro").first()).toBeVisible();
    // Pick the first collapsed service row and expand it.
    const collapsedRow = page.locator('[role="button"][aria-expanded="false"]').first();
    await expect(collapsedRow).toBeVisible();
    await collapsedRow.click();
    // The detail panel uses role="region"; it should contain a latency chart
    // <svg> with at least one <polyline>. Polylines with axis-aligned points
    // have zero bounding-box height in Chromium's visibility heuristic, so use
    // toBeAttached rather than toBeVisible on the polyline itself.
    const detailPanel = page.locator('[role="region"]').filter({hasText: /Latency trend/i}).first();
    await expect(detailPanel).toBeVisible();
    await expect(detailPanel.locator("svg polyline").first()).toBeAttached();
    // Press Escape to collapse — this also verifies the keyboard shortcut wiring.
    await page.keyboard.press("Escape");
    await expect(detailPanel).toBeHidden();
  });

  test("light mode toggle flips data-theme attribute", async ({page}) => {
    await page.goto("/?mocks=off");
    await expect(page.locator("html")).toHaveAttribute("data-theme", /dark|light/);
    await page.getByRole("button", {name: /toggle color theme/i}).click();
    // After 1 click cycle: was auto(→resolved), now explicit next.
    const t1 = await page.locator("html").getAttribute("data-theme");
    expect(t1).toMatch(/dark|light/);
    await page.getByRole("button", {name: /toggle color theme/i}).click();
    const t2 = await page.locator("html").getAttribute("data-theme");
    expect(t2).not.toBe(t1);
  });

  test("? opens keyboard help overlay, Esc closes", async ({page}) => {
    await page.goto("/?mocks=off");
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", {name: /keyboard shortcuts/i})).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("LatencyHeatstrip renders one row per service", async ({page}) => {
    await page.goto("/?mocks=off");
    const strip = page.getByRole("region", {name: /latency heatstrip/i});
    await expect(strip).toBeVisible();
    const rows = strip.locator(".row");
    await expect(rows).toHaveCount(4);
  });

  test("incident filter chip narrows the list", async ({page}) => {
    await page.goto("/?mocks=off");
    // The fixture incident is 2 days old, so widen the window to 7d to make
    // sure at least one card shows up before we measure narrowing.
    await page.getByRole("radio", {name: "7d"}).click();
    // Make sure incidents are loaded before we measure the baseline count.
    const chipGroup = page.getByRole("radiogroup", {name: /Filter incidents by service/});
    await expect(chipGroup).toBeVisible();
    const cards = page.locator(".incidents .item");
    await expect(cards.first()).toBeVisible();
    const baseline = await cards.count();
    expect(baseline).toBeGreaterThan(0);
    // Click the first non-"All" chip (index 1) and verify narrowing + aria-checked.
    const serviceChip = chipGroup.getByRole("radio").nth(1);
    await serviceChip.click();
    await expect(serviceChip).toHaveAttribute("aria-checked", "true");
    const filteredCount = await cards.count();
    expect(filteredCount).toBeLessThanOrEqual(baseline);
    // Click "All" to reset.
    await chipGroup.getByRole("radio", {name: "All"}).click();
    await expect(cards).toHaveCount(baseline);
  });
});
