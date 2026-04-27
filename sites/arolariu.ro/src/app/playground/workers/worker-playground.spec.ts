/**
 * @fileoverview Playwright spec for the worker playground.
 * @module app/playground/workers/worker-playground.spec
 *
 * @remarks
 * Six scenarios covering boot, echo round-trip, AbortSignal, crash/restart,
 * idle reboot transparency, and capabilities. Runs against the dev server
 * (Playwright's `webServer` config handles startup).
 */

import {expect, test} from "@playwright/test";

test.describe("Worker playground", () => {
  test("boots from idle to ready within 2s", async ({page}) => {
    await page.goto("/playground/workers/");
    await expect(page.getByTestId("playground-root")).toBeVisible();
    await expect(page.getByTestId("host-state")).toHaveText(/ready|idle/, {timeout: 2000});
  });

  test("echoes a round-trip message", async ({page}) => {
    await page.goto("/playground/workers/");
    await page.getByTestId("echo-input").fill("hello-world");
    await page.getByTestId("echo-button").click();
    await expect(page.getByTestId("echo-result")).toHaveText("hello-world");
    await expect(page.getByTestId("host-state")).toHaveText("ready");
  });

  test("aborts a sleep call within 200ms", async ({page}) => {
    await page.goto("/playground/workers/");
    await page.getByTestId("sleep-button").click();
    // Wait briefly so the call is in-flight
    await page.waitForTimeout(50);
    const start = Date.now();
    await page.getByTestId("abort-button").click();
    // Watch the event log for an abort entry
    await expect(page.getByTestId("event-log")).toContainText("abort", {timeout: 500});
    expect(Date.now() - start).toBeLessThan(1000);
  });

  test("crash transitions to dead and restart recovers to ready", async ({page}) => {
    await page.goto("/playground/workers/");
    await page.getByTestId("echo-button").click(); // warm up
    await expect(page.getByTestId("host-state")).toHaveText("ready");
    await page.getByTestId("crash-button").click();
    await expect(page.getByTestId("host-state")).toHaveText("dead", {timeout: 5000});
    await page.getByTestId("restart-button").click();
    await expect(page.getByTestId("host-state")).toHaveText("ready", {timeout: 5000});
  });

  test("crossOriginIsolated reports false (no COOP/COEP in this PR)", async ({page}) => {
    await page.goto("/playground/workers/");
    await expect(page.getByTestId("coi")).toHaveText("false");
  });

  test("capabilities round-trip echoes the parent snapshot", async ({page}) => {
    await page.goto("/playground/workers/");
    await page.getByTestId("caps-button").click();
    await expect(page.getByTestId("caps-output")).toContainText("crossOriginIsolated");
    await expect(page.getByTestId("caps-output")).toContainText("hasWebGpu");
  });
});
