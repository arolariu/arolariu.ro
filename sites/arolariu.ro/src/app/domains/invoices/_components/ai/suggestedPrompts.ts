/**
 * @fileoverview Suggested prompt chips for local invoice assistant.
 *
 * Provides pre-built question suggestions based on invoice analytics,
 * helping users discover assistant capabilities without typing.
 *
 * @module app/domains/invoices/_components/ai/suggestedPrompts
 */

import type {LocalInvoiceAssistantAnalytics} from "./invoiceContext";

/**
 * Available suggested prompt keys.
 *
 * @remarks
 * Keys map to i18n entries in `IMS--LocalInvoiceAssistant.suggestedPrompts`.
 */
export type SuggestedPromptKey = "summarizeSpending" | "largestInvoice" | "topMerchant" | "spendingByCurrency";

/**
 * Determines whether suggested prompts should be shown.
 *
 * @param analytics - Invoice analytics from context.
 * @returns `true` if there is useful data to prompt about, `false` otherwise.
 *
 * @remarks
 * Hides prompts when there are no invoices or no meaningful analytics data.
 */
export function shouldShowSuggestedPrompts(analytics: LocalInvoiceAssistantAnalytics): boolean {
  return analytics.invoiceCount > 0;
}

/**
 * Gets list of suggested prompt keys based on analytics data.
 *
 * @param analytics - Invoice analytics from context.
 * @returns Array of prompt keys to display.
 *
 * @remarks
 * **Conditional prompts:**
 * - `spendingByCurrency` only shown when multiple currencies exist
 * - Base prompts (summarize, largest, top merchant) always shown when data exists
 */
export function getSuggestedPromptKeys(analytics: LocalInvoiceAssistantAnalytics): ReadonlyArray<SuggestedPromptKey> {
  const keys: SuggestedPromptKey[] = [];

  if (analytics.invoiceCount === 0) {
    return keys;
  }

  keys.push("summarizeSpending");
  keys.push("largestInvoice");
  keys.push("topMerchant");

  const currencyCount = Object.keys(analytics.totalSpendByCurrency).length;
  if (currencyCount > 1) {
    keys.push("spendingByCurrency");
  }

  return keys;
}
