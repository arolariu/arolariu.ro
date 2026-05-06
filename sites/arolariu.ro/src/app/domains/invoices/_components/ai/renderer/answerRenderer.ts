/**
 * @fileoverview Answer renderer — dispatches StructuredAnswer to {prose, viz, payload}.
 * @module app/domains/invoices/_components/ai/renderer/answerRenderer
 *
 * @remarks
 * The translator (next-intl's t) is injected as a parameter so the module
 * is testable without next-intl. Empty-result branches produce friendly
 * "try alternatives" copy.
 */

import type {VizHint} from "../types";
import type {StructuredAnswer} from "../aggregators";

export type Translator = (key: string, params?: Record<string, unknown>) => string;

export type RenderedAnswer = Readonly<{
  prose: string;
  viz: VizHint;
  payload: unknown;
}>;

function tfLabel(t: Translator, tf: string): string {
  return t(`InvoiceAssistant.timeframes.${tf}`);
}

function bucketsTopList(buckets: ReadonlyArray<Record<string, unknown>>, valueKey: string, labelKey: string, suffixKey?: string): string {
  return buckets
    .slice(0, 5)
    .map((b) => {
      const label = String(b[labelKey] ?? "");
      const value = Number(b[valueKey] ?? 0);
      const suffix = suffixKey && typeof b[suffixKey] === "string" ? ` ${b[suffixKey] as string}` : "";
      return `${label} (${value.toFixed(2)}${suffix})`;
    })
    .join(", ");
}

export function renderAnswer(answer: StructuredAnswer, t: Translator): RenderedAnswer {
  const {intent, result} = answer;

  switch (intent) {
    case "totalSpend": {
      if (result.kind === "empty") {
        return {prose: t("InvoiceAssistant.answers.totalSpendEmpty", {timeframe: tfLabel(t, result.timeframe), alternatives: tfLabel(t, "all-time")}), viz: "single-stat", payload: result};
      }
      const first = result.buckets[0]!;
      return {
        prose: t("InvoiceAssistant.answers.totalSpend", {timeframe: tfLabel(t, result.timeframe), amount: `${first.totalSpend.toFixed(2)} ${first.currency}`, count: first.invoiceCount}),
        viz: "single-stat",
        payload: result,
      };
    }
    case "invoiceCount": {
      if (result.kind === "empty") {
        return {prose: t("InvoiceAssistant.answers.invoiceCountEmpty", {timeframe: tfLabel(t, result.timeframe), alternatives: tfLabel(t, "all-time")}), viz: "single-stat", payload: result};
      }
      return {
        prose: t("InvoiceAssistant.answers.invoiceCount", {timeframe: tfLabel(t, result.timeframe), count: result.count}),
        viz: "single-stat",
        payload: result,
      };
    }
    case "topSpendingByCategory": {
      if (result.kind === "empty") {
        return {prose: t("InvoiceAssistant.answers.totalSpendEmpty", {timeframe: tfLabel(t, result.timeframe), alternatives: tfLabel(t, "all-time")}), viz: "bar-chart-horizontal", payload: result};
      }
      const list = bucketsTopList(result.buckets as ReadonlyArray<Record<string, unknown>>, "totalSpend", "category", "currency");
      return {prose: t("InvoiceAssistant.answers.topSpendingByCategory", {timeframe: tfLabel(t, result.timeframe), topList: list}), viz: "bar-chart-horizontal", payload: result};
    }
    case "topMerchantsByCount": {
      if (result.kind === "empty") {
        return {prose: t("InvoiceAssistant.answers.totalSpendEmpty", {timeframe: tfLabel(t, result.timeframe), alternatives: tfLabel(t, "all-time")}), viz: "bar-chart-horizontal", payload: result};
      }
      const list = result.buckets.map((b) => `${b.merchantName} (${b.visitCount})`).join(", ");
      return {prose: t("InvoiceAssistant.answers.topMerchantsByCount", {timeframe: tfLabel(t, result.timeframe), topK: result.buckets.length, topList: list}), viz: "bar-chart-horizontal", payload: result};
    }
    case "topMerchantsBySpend": {
      if (result.kind === "empty") {
        return {prose: t("InvoiceAssistant.answers.totalSpendEmpty", {timeframe: tfLabel(t, result.timeframe), alternatives: tfLabel(t, "all-time")}), viz: "bar-chart-horizontal", payload: result};
      }
      const list = bucketsTopList(result.buckets as ReadonlyArray<Record<string, unknown>>, "totalSpend", "merchantName", "currency");
      return {prose: t("InvoiceAssistant.answers.topMerchantsBySpend", {timeframe: tfLabel(t, result.timeframe), topList: list}), viz: "bar-chart-horizontal", payload: result};
    }
    case "topProductsByCount": {
      if (result.kind === "empty") {
        return {prose: t("InvoiceAssistant.answers.totalSpendEmpty", {timeframe: tfLabel(t, result.timeframe), alternatives: tfLabel(t, "all-time")}), viz: "bar-chart-horizontal", payload: result};
      }
      const list = result.buckets.map((b) => `${b.productName} (${b.totalQuantity} ${b.quantityUnit})`).join(", ");
      return {prose: t("InvoiceAssistant.answers.topProductsByCount", {timeframe: tfLabel(t, result.timeframe), topList: list}), viz: "bar-chart-horizontal", payload: result};
    }
    case "topProductsBySpend": {
      if (result.kind === "empty") {
        return {prose: t("InvoiceAssistant.answers.totalSpendEmpty", {timeframe: tfLabel(t, result.timeframe), alternatives: tfLabel(t, "all-time")}), viz: "bar-chart-horizontal", payload: result};
      }
      const list = bucketsTopList(result.buckets as ReadonlyArray<Record<string, unknown>>, "totalSpend", "productName", "currency");
      return {prose: t("InvoiceAssistant.answers.topProductsBySpend", {topList: list}), viz: "bar-chart-horizontal", payload: result};
    }
    case "spendComparison": {
      if (result.kind === "empty") {
        return {prose: t("InvoiceAssistant.answers.totalSpendEmpty", {timeframe: tfLabel(t, result.timeframeA), alternatives: tfLabel(t, result.timeframeB)}), viz: "comparison-pair", payload: result};
      }
      const first = result.buckets[0]!;
      const noChange = first.deltaAbs === 0;
      const direction = first.deltaPct === null ? "n/a" : first.deltaPct > 0 ? "more" : "less";
      const key = noChange ? "InvoiceAssistant.answers.spendComparisonNoChange" : "InvoiceAssistant.answers.spendComparison";
      return {
        prose: t(key, {
          amountA: `${first.a.totalSpend.toFixed(2)} ${first.currency}`,
          timeframeA: tfLabel(t, first.a.timeframe),
          amountB: `${first.b.totalSpend.toFixed(2)} ${first.currency}`,
          timeframeB: tfLabel(t, first.b.timeframe),
          direction,
          deltaPct: first.deltaPct === null ? "n/a" : Math.abs(first.deltaPct),
        }),
        viz: "comparison-pair",
        payload: result,
      };
    }
    case "averageSpendPerVisit": {
      if (result.kind === "empty") {
        return {prose: t("InvoiceAssistant.answers.totalSpendEmpty", {timeframe: tfLabel(t, result.timeframe), alternatives: tfLabel(t, "all-time")}), viz: "single-stat", payload: result};
      }
      const first = result.buckets[0]!;
      const key = first.merchantName ? "InvoiceAssistant.answers.averageSpendPerVisitMerchant" : "InvoiceAssistant.answers.averageSpendPerVisit";
      return {
        prose: t(key, {
          sampleSize: first.sampleSize,
          timeframe: tfLabel(t, result.timeframe),
          amount: `${first.averageSpend.toFixed(2)} ${first.currency}`,
          ...(first.merchantName ? {merchantName: first.merchantName} : {}),
        }),
        viz: "single-stat",
        payload: result,
      };
    }
    case "categoryBreakdown": {
      if (result.kind === "empty") {
        return {prose: t("InvoiceAssistant.answers.totalSpendEmpty", {timeframe: tfLabel(t, result.timeframe), alternatives: tfLabel(t, "all-time")}), viz: "donut", payload: result};
      }
      const list = bucketsTopList(result.buckets as ReadonlyArray<Record<string, unknown>>, "spend", "category", "currency");
      return {prose: t("InvoiceAssistant.answers.categoryBreakdown", {timeframe: tfLabel(t, result.timeframe), topList: list}), viz: "donut", payload: result};
    }
  }
}