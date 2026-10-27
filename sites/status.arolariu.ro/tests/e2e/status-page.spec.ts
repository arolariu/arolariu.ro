import {expect, test} from "@playwright/test";
import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import type {AggregateFile} from "../../src/lib/types/status";

const __dirname = dirname(fileURLToPath(import.meta.url));

const fixtures = {
  fine: readFileSync(join(__dirname, "../fixtures/aggregate-14d-mixed.json"), "utf8"),
  hourly: readFileSync(join(__dirname, "../fixtures/aggregate-90d-all-healthy.json"), "utf8"),
  daily: readFileSync(join(__dirname, "../fixtures/aggregate-365d-with-outage.json"), "utf8"),
  incidents: readFileSync(join(__dirname, "../fixtures/incidents-active.json"), "utf8"),
};
const FIXTURE_NOW = new Date((JSON.parse(fixtures.fine) as AggregateFile).generatedAt);

test.describe("status page", () => {
  test.beforeEach(async ({page, baseURL}) => {
    // Window slicing and incident filtering must use the fixture's own timeline.
    // setFixedTime leaves timers/RAF running so interactions still execute normally.
    await page.clock.setFixedTime(FIXTURE_NOW);
    const localOrigin = new URL(baseURL ?? "http://localhost:4175").origin;
    // Only the fixture routes below may fulfill external data requests.
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === localOrigin ? route.continue() : route.abort("blockedbyclient"),
    );
    // Clear localStorage to avoid 30-min cache from previous tests
    await page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await page.route(/raw\.githubusercontent\.com.+fine\.json/, (route) =>
      route.fulfill({status: 200, contentType: "application/json", body: fixtures.fine}),
    );
    await page.route(/raw\.githubusercontent\.com.+hourly\.json/, (route) =>
      route.fulfill({status: 200, contentType: "application/json", body: fixtures.hourly}),
    );
    await page.route(/raw\.githubusercontent\.com.+daily\.json/, (route) =>
      route.fulfill({status: 200, contentType: "application/json", body: fixtures.daily}),
    );
    await page.route(/raw\.githubusercontent\.com.+incidents\.json/, (route) =>
      route.fulfill({status: 200, contentType: "application/json", body: fixtures.incidents}),
    );
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
    await expect(page.getByRole("button", {name: "api.arolariu.ro", exact: true})).toBeVisible();
    const hourlyRequest = page.waitForRequest(/raw\.githubusercontent\.com.+hourly\.json/);
    const hourlyWindow = page.getByRole("radio", {name: "90d"});
    await hourlyWindow.click();
    await hourlyRequest;
    await expect(hourlyWindow).toBeChecked();
    await expect(page.getByRole("button", {name: "arolariu.ro", exact: true})).toBeVisible();
    await expect(page.getByRole("button", {name: "api.arolariu.ro", exact: true})).toHaveCount(0);
  });

  test("hover on degraded segment shows tooltip", async ({page}) => {
    await page.goto("/?mocks=off");
    await expect(page.getByRole("button", {name: "api.arolariu.ro", exact: true})).toBeVisible();
    // Switch to 14d window to ensure all degraded buckets are in view
    const fortnight = page.getByRole("radio", {name: "14d"});
    await fortnight.click();
    await expect(fortnight).toBeChecked();
    const degraded = page.getByRole("button", {name: /, Degraded\b/}).first();
    await expect(degraded).toBeVisible();
    await degraded.hover();
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
    await expect(page.getByRole("button", {name: "arolariu.ro", exact: true})).toBeVisible();
    const before = fetchCount;
    await page.getByLabel("Refresh status data").click();
    await expect.poll(() => fetchCount).toBeGreaterThan(before);
    await expect(page.getByLabel("Refresh status data")).toBeEnabled();
  });

  test("network error shows retry button", async ({page}) => {
    await page.route(/raw\.githubusercontent\.com.+fine\.json/, (route) => route.fulfill({status: 500, body: ""}));
    await page.goto("/?mocks=off");
    await expect(page.getByRole("alert")).toContainText("unreachable");
  });

  test("refresh button is disabled during in-flight refresh (double-click safe)", async ({page}) => {
    await page.goto("/?mocks=off");
    await expect(page.getByRole("button", {name: "arolariu.ro", exact: true})).toBeVisible();
    const btn = page.getByLabel("Refresh status data");
    let releaseResponse: (() => void) | undefined;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    let refreshRequests = 0;
    await page.route(/raw\.githubusercontent\.com.+fine\.json/, async (route) => {
      refreshRequests++;
      await responseGate;
      await route.fulfill({status: 200, contentType: "application/json", body: fixtures.fine});
    });

    try {
      await btn.click();
      await expect.poll(() => refreshRequests).toBe(1);
      await expect(btn).toBeDisabled();
      await expect(btn).toHaveAttribute("aria-busy", "true");
      // Native activation respects disabled without Playwright waiting for re-enablement.
      await btn.evaluate((button: HTMLButtonElement) => button.click());
    } finally {
      releaseResponse?.();
    }

    await expect(btn).toBeEnabled();
    await expect(btn).toHaveAttribute("aria-busy", "false");
    expect(refreshRequests).toBe(1);
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
    const collapsedRow = page.getByRole("button", {name: "arolariu.ro", exact: true});
    await expect(collapsedRow).toBeVisible();
    await expect(collapsedRow).toHaveAttribute("aria-expanded", "false");
    await collapsedRow.click();
    // The detail panel uses role="region"; it should contain a latency chart
    // <svg> with at least one <polyline>. Polylines with axis-aligned points
    // have zero bounding-box height in Chromium's visibility heuristic, so use
    // toBeAttached rather than toBeVisible on the polyline itself.
    const detailPanel = page.getByRole("region", {name: "Detail for arolariu.ro", exact: true});
    await expect(detailPanel).toBeVisible();
    const chart = detailPanel.getByRole("img", {name: "Latency trend chart", exact: true});
    await expect(chart).toBeVisible();
    await expect(chart.locator("polyline").first()).toBeAttached();
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
    await expect(page.getByRole("button", {name: "arolariu.ro", exact: true})).toBeVisible();
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", {name: /keyboard shortcuts/i})).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("incident filter chip narrows the list", async ({page}) => {
    await page.goto("/?mocks=off");
    await expect(page.getByRole("button", {name: "arolariu.ro", exact: true})).toBeVisible();
    // Include both fixture incidents before filtering down to one service.
    await page.getByRole("radio", {name: "7d"}).click();
    // Make sure incidents are loaded before we measure the baseline count.
    const chipGroup = page.getByRole("radiogroup", {name: /Filter incidents by service/});
    await expect(chipGroup).toBeVisible();
    const cards = page.getByRole("article");
    await expect(cards.first()).toBeVisible();
    const baseline = await cards.count();
    expect(baseline).toBe(2);
    const serviceChip = chipGroup.getByRole("radio", {name: "api.arolariu.ro", exact: true});
    await serviceChip.click();
    await expect(serviceChip).toHaveAttribute("aria-checked", "true");
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText("api.arolariu.ro");
    // Click "All" to reset.
    await chipGroup.getByRole("radio", {name: "All"}).click();
    await expect(cards).toHaveCount(baseline);
  });
});
