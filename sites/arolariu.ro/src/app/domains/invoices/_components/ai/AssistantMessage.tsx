"use client";

/**
 * @fileoverview Renders one history entry (question + prose + viz primitive).
 * @module app/domains/invoices/_components/ai/AssistantMessage
 */

import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {BarChartHorizontal} from "./renderer/viz/BarChartHorizontal";
import {SingleStat} from "./renderer/viz/SingleStat";
import {ComparisonPair} from "./renderer/viz/ComparisonPair";
import {Donut} from "./renderer/viz/Donut";
import type {VizHint} from "./types";

export type AssistantMessageProps = Readonly<{
  question: string;
  prose: string;
  viz: VizHint;
  payload: unknown;
}>;

export function AssistantMessage({question, prose, viz, payload}: AssistantMessageProps): React.JSX.Element {
  return (
    <Card data-testid="assistant-message" className="space-y-3">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p data-testid="assistant-prose">{prose}</p>
        {renderViz(viz, payload)}
      </CardContent>
    </Card>
  );
}

function renderViz(viz: VizHint, payload: unknown): React.JSX.Element | null {
  switch (viz) {
    case "bar-chart-horizontal":
      return <BarChartHorizontal bars={extractBars(payload)} />;
    case "single-stat":
      return <SingleStat label={extractLabel(payload)} value={extractValue(payload)} />;
    case "comparison-pair":
      return renderComparison(payload);
    case "donut":
      return <Donut slices={extractSlices(payload)} />;
  }
}

function extractBars(payload: unknown): ReadonlyArray<{label: string; value: number; suffix?: string}> {
  const p = payload as {buckets?: ReadonlyArray<Record<string, unknown>>};
  if (!p.buckets) return [];
  return p.buckets.map((b) => ({
    label: String(b["merchantName"] ?? b["productName"] ?? b["category"] ?? ""),
    value: Number(b["totalSpend"] ?? b["visitCount"] ?? b["totalQuantity"] ?? 0),
    ...(typeof b["currency"] === "string" ? {suffix: b["currency"] as string} : {}),
  }));
}

function extractLabel(payload: unknown): string {
  const p = payload as {timeframe?: string};
  return p.timeframe ?? "";
}

function extractValue(payload: unknown): string {
  const p = payload as {buckets?: ReadonlyArray<Record<string, unknown>>; count?: number};
  if (typeof p.count === "number") return String(p.count);
  const first = p.buckets?.[0];
  if (first) return `${first["totalSpend"] ?? first["averageSpend"] ?? ""} ${first["currency"] ?? ""}`;
  return "";
}

function renderComparison(payload: unknown): React.JSX.Element {
  const p = payload as {
    buckets?: ReadonlyArray<{a: {totalSpend: number; timeframe: string}; b: {totalSpend: number; timeframe: string}; deltaPct: number | null; currency: string}>;
  };
  const first = p.buckets?.[0];
  if (!first) return <div />;
  const direction: "more" | "less" | "no-change" =
    first.deltaPct === null ? "no-change" : first.deltaPct > 0 ? "more" : first.deltaPct < 0 ? "less" : "no-change";
  return (
    <ComparisonPair
      labelA={first.a.timeframe}
      valueA={`${first.a.totalSpend.toFixed(2)} ${first.currency}`}
      labelB={first.b.timeframe}
      valueB={`${first.b.totalSpend.toFixed(2)} ${first.currency}`}
      delta={first.deltaPct === null ? "n/a" : `${Math.abs(first.deltaPct)}%`}
      direction={direction}
    />
  );
}

function extractSlices(payload: unknown): ReadonlyArray<{label: string; value: number; color: string}> {
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
  const p = payload as {buckets?: ReadonlyArray<{category: number; spend: number}>};
  if (!p.buckets) return [];
  return p.buckets.map((b, i) => ({label: String(b.category), value: b.spend, color: COLORS[i % COLORS.length]!}));
}