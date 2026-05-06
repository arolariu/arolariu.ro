/**
 * @fileoverview Shared types for the invoice AI assistant.
 * @module app/domains/invoices/_components/ai/types
 */

/** Locales the assistant accepts and renders in. */
export type AssistantLocale = "en" | "ro" | "fr";

/** All intent IDs in the v1 catalog. */
export type IntentId =
  | "topSpendingByCategory"
  | "topMerchantsByCount"
  | "topMerchantsBySpend"
  | "totalSpend"
  | "invoiceCount"
  | "topProductsByCount"
  | "topProductsBySpend"
  | "spendComparison"
  | "averageSpendPerVisit"
  | "categoryBreakdown";

/** Canonical timeframe windows. */
export type Timeframe =
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "last-6-months"
  | "this-quarter"
  | "last-quarter"
  | "this-year"
  | "last-year"
  | "all-time"
  | "custom";

/** Visualization payload hints emitted by aggregators. */
export type VizHint = "bar-chart-horizontal" | "single-stat" | "comparison-pair" | "donut";

/** Confidence-band thresholds for routing. Tunable post-calibration. */
export const CONFIDENCE_THRESHOLDS = {
  canonical: 0.75,
  uncertain: 0.55,
} as const;
