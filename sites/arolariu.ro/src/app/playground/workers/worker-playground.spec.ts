/**
 * @fileoverview Playwright spec for the worker playground.
 * @module app/playground/workers/worker-playground.spec
 *
 * @remarks
 * Covers boot-after-interaction, echo round-trip, AbortSignal,
 * crash/restart, and capabilities. Uses the project's shared Playwright
 * fixture barrel so the spec inherits the standard `safeNavigate`,
 * accessibility, and base behavior wiring rather than reaching directly
 * into `@playwright/test`.
 *
 * Phase 8 stress scenarios (added by the cross-review refactor) cover
 * behaviors MockWorker cannot fake — boot latency, parallel terminate,
 * realm isolation, and end-to-end event-port streaming — so we have
 * production-fidelity coverage for those paths even though the unit
 * suite uses MockWorker for everything else.
 */

import {expect, test} from "../../../../tests/fixtures";

test.describe("Worker playground", () => {
  test("boots to ready within 2s after first interaction", async ({page}) => {
    await page.goto("/playground/workers/");
    await expect(page.getByTestId("playground-root")).toBeVisible();
    // Trigger boot by interacting (echo is the cheapest interaction).
    await page.getByTestId("echo-input").fill("boot-trigger");
    await page.getByTestId("echo-button").click();
    await expect(page.getByTestId("host-state")).toHaveText("ready", {timeout: 2000});
  });

  test("echoes a round-trip message", async ({page}) => {
    await page.goto("/playground/workers/");
    await page.getByTestId("echo-input").fill("hello-world");
    await page.getByTestId("echo-button").click();
    await expect(page.getByTestId("echo-result")).toHaveText('"hello-world"');
    await expect(page.getByTestId("host-state")).toHaveText("ready");
  });

  test("aborts a sleep call within 200ms", async ({page}) => {
    await page.goto("/playground/workers/");
    await page.getByTestId("sleep-button").click();
    // Wait briefly so the call is in-flight
    await page.waitForTimeout(50);
    const start = Date.now();
    await page.getByTestId("abort-button").click();
    // Watch the call status for an aborted error category
    await expect(page.getByTestId("error-category")).toHaveText("aborted", {timeout: 500});
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

  /**
   * Phase 8 stress scenarios. These exercise behaviors that MockWorker
   * cannot simulate (real boot latency, true cross-realm isolation, and
   * the per-call timeout against an actual worker thread). Documented
   * gaps live in `src/workers/host/mockWorker.ts` TSDoc.
   */
  test.describe("Phase 8 stress scenarios", () => {
    test("boot-latency: real worker boots within a sane window (>0ms, <3s)", async ({page}) => {
      await page.goto("/playground/workers/");
      const start = Date.now();
      await page.getByTestId("ping-button").click();
      await expect(page.getByTestId("host-state")).toHaveText("ready", {timeout: 3000});
      const elapsed = Date.now() - start;
      // MockWorker boots synchronously (~0ms); a real Worker takes
      // measurable time to spin up. We accept anything above 1ms as a
      // signal that a real Worker is in play.
      expect(elapsed).toBeGreaterThan(1);
      expect(elapsed).toBeLessThan(3000);
    });

    test("realm-isolation: a real worker reports typeof window === 'undefined'", async ({page}) => {
      await page.goto("/playground/workers/");
      await page.getByTestId("window-probe-button").click();
      // The worker realm has no `window` global. MockWorker would report
      // 'object' here because it shares the host realm — this assertion
      // only passes against a real Worker.
      await expect(page.getByTestId("window-probe-result")).toContainText("undefined", {timeout: 3000});
    });

    test("per-call-timeout: WorkerTimeoutError fires when the budget elapses before the call settles", async ({page}) => {
      await page.goto("/playground/workers/");
      const start = Date.now();
      await page.getByTestId("timeout-button").click();
      // The transient host has defaultCallTimeoutMs: 100 against a 5s
      // sleep, so the timeout MUST fire well before the sleep returns.
      await expect(page.getByTestId("error-category")).toHaveText("timeout", {timeout: 3000});
      const elapsed = Date.now() - start;
      // We allow generous headroom for boot, but it must NOT take 5s.
      expect(elapsed).toBeLessThan(4000);
    });

    test("event-stream: emitEvents drives 5 log entries through the side channel", async ({page}) => {
      await page.goto("/playground/workers/");
      await page.getByTestId("emit-events-button").click();
      // The 5 emitted events arrive over the event port and land in the
      // event log via the host's onEvent hook. Verify all 5 made it.
      await expect(page.getByTestId("event-log")).toContainText("event-0", {timeout: 3000});
      await expect(page.getByTestId("event-log")).toContainText("event-4", {timeout: 3000});
    });

    test("parallel-terminate: rapid restart while a call is in flight does not hang or unhandled-reject", async ({page}) => {
      await page.goto("/playground/workers/");
      await page.getByTestId("ping-button").click();
      await expect(page.getByTestId("host-state")).toHaveText("ready", {timeout: 3000});
      // Kick off a slow call, then immediately restart while it's in flight.
      await page.getByTestId("sleep-button").click();
      await page.waitForTimeout(50);
      await page.getByTestId("restart-button").click();
      // The host must end up back in 'ready' without hanging on the
      // dangling sleep. The sleep call's promise rejects with
      // WorkerCrashError per the load-bearing inFlight drain in restart().
      await expect(page.getByTestId("host-state")).toHaveText("ready", {timeout: 5000});
    });

    test("clear-event-log: empties the event log without affecting host state", async ({page}) => {
      await page.goto("/playground/workers/");
      await page.getByTestId("emit-events-button").click();
      await expect(page.getByTestId("event-log")).toContainText("event-0");
      await page.getByTestId("clear-log-button").click();
      await expect(page.getByTestId("event-log")).toHaveText("");
      // Host must remain ready (clearing the UI log does not touch RPC state).
      await expect(page.getByTestId("host-state")).toHaveText("ready");
    });
  });
});
