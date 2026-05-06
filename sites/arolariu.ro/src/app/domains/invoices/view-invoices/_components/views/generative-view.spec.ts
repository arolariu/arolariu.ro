/**
 * @fileoverview Playwright E2E spec for the Invoice AI assistant.
 * @module app/domains/invoices/view-invoices/_components/views/generative-view.spec
 *
 * @remarks
 * 4 critical scenarios: cold-start happy path, out-of-scope -> chip flow,
 * multilingual (ro), and Strict-Mode tab leave + return clearing history (H1).
 *
 * Gated to environments with WebGPU support; CI may need to skip these
 * when running on headless workers without GPU acceleration. The
 * embedding model (Layer 1) is WASM and works without GPU; the slot
 * extractor model (Layer 2) requires WebGPU.
 */

import {expect, test} from "../../../../../../tests/fixtures";

test.describe("Invoice AI assistant tab @assistant", () => {
  test("loads embedding model and answers a canonical EN question", async ({page, safeNavigate}) => {
    const result = await safeNavigate("/domains/invoices/view-invoices/?tab=liveAnalysis");
    expect(result.success).toBe(true);
    await expect(page.getByTestId("invoice-assistant-panel")).toBeVisible({timeout: 15_000});
    await page.getByTestId("assistant-input").fill("top merchants last month?");
    await page.getByRole("button", {name: /ask/i}).click();
    await expect(page.getByTestId("assistant-message")).toBeVisible({timeout: 10_000});
  });

  test("out-of-scope question shows fallback chips and clicking a chip re-submits", async ({page, safeNavigate}) => {
    await safeNavigate("/domains/invoices/view-invoices/?tab=liveAnalysis");
    await expect(page.getByTestId("invoice-assistant-panel")).toBeVisible({timeout: 15_000});
    await page.getByTestId("assistant-input").fill("what's the weather like today");
    await page.getByRole("button", {name: /ask/i}).click();
    await expect(page.getByTestId("example-chips")).toBeVisible();
    await page.getByRole("button", {name: /top merchants this month/i}).first().click();
    await expect(page.getByTestId("assistant-message")).toBeVisible({timeout: 10_000});
  });

  test("Romanian question gets classified and answered", async ({page, safeNavigate}) => {
    await safeNavigate("/ro/domains/invoices/view-invoices/?tab=liveAnalysis");
    await expect(page.getByTestId("invoice-assistant-panel")).toBeVisible({timeout: 15_000});
    await page.getByTestId("assistant-input").fill("topul magazinelor luna trecută");
    await page.getByRole("button", {name: /întreabă|ask/i}).click();
    await expect(page.getByTestId("assistant-message")).toBeVisible({timeout: 10_000});
  });

  test("Strict-Mode tab leave + return: history is cleared (H1)", async ({page, safeNavigate}) => {
    await safeNavigate("/domains/invoices/view-invoices/?tab=liveAnalysis");
    await expect(page.getByTestId("invoice-assistant-panel")).toBeVisible({timeout: 15_000});
    await page.getByTestId("assistant-input").fill("top merchants last month");
    await page.getByRole("button", {name: /ask/i}).click();
    await expect(page.getByTestId("assistant-message")).toBeVisible({timeout: 10_000});
    // Switch to a different tab and back
    const settingsTab = page.locator('[role="tab"]').filter({hasText: /settings/i}).first();
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      const chatTab = page.locator('[role="tab"]').filter({hasText: /chat|ai|generative/i}).first();
      await chatTab.click();
      // History should be empty per H1 (session-only, dies on tab unmount)
      await expect(page.getByTestId("assistant-message")).not.toBeVisible({timeout: 5_000});
    }
  });
});