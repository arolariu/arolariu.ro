"use client";

/**
 * @fileoverview Time of Day Chart - displays shopping patterns by time segment.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/TimeOfDayChart
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import type {TimeOfDaySegment} from "../../../_utils/statistics";
import styles from "./TimeOfDayChart.module.scss";

type Props = {
  readonly data: TimeOfDaySegment[];
};

type TooltipPayloadItem = {
  payload: TimeOfDaySegment;
};

type CustomTooltipProps = {
  readonly active: boolean;
  readonly payload: TooltipPayloadItem[];
};

/**
 * Custom tooltip for the time-of-day radar chart.
 */
function CustomTooltip({active, payload}: CustomTooltipProps): React.JSX.Element | null {
  const t = useTranslations("IMS--Stats.timeOfDay");
  const [firstItem] = payload;
  if (!active || payload.length === 0 || !firstItem) return null;
  const data = firstItem.payload;

  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipSegment"]}>{data.segment}</p>
      <p className={styles["tooltipCount"]}>{t("tooltip.invoiceCount", {count: String(data.invoiceCount)})}</p>
    </div>
  );
}

/**
 * Renders a radar chart showing shopping patterns by time of day.
 *
 * @param data - Time segment data with invoice counts
 * @returns Radar chart component
 *
 * @remarks
 * **Important:** The `dataKey` in the Radar component MUST match the field name
 * in TimeOfDaySegment (currently 'invoiceCount'). Mismatches will cause the chart
 * to render with zero values.
 *
 * **Data Structure:**
 * ```typescript
 * {
 *   segment: string;       // "Morning" | "Afternoon" | "Evening" | "Night"
 *   invoiceCount: number;  // Used by Radar dataKey
 *   totalAmount: number;
 *   averageAmount: number;
 * }
 * ```
 */
export function TimeOfDayChart({data}: Props): React.JSX.Element {
  const t = useTranslations("IMS--Stats.timeOfDay");

  // IMPORTANT: This key must match the field name in TimeOfDaySegment
  const chartConfig = {
    invoiceCount: {
      label: t("labels.invoiceCount"),
      color: "var(--ac-chart-4)",
    },
  };

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle className={styles["cardTitle"]}>{t("title")}</CardTitle>
        <CardDescription className={styles["cardDescription"]}>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <ChartContainer
          config={chartConfig}
          className={styles["chartContainer"]}>
          <ResponsiveContainer
            width='100%'
            height='100%'>
            <RadarChart data={data}>
              <defs>
                <linearGradient
                  id='colorTimeOfDay'
                  x1='0'
                  y1='0'
                  x2='0'
                  y2='1'>
                  <stop
                    offset='0%'
                    stopColor='var(--ac-chart-4)'
                    stopOpacity={0.8}
                  />
                  <stop
                    offset='100%'
                    stopColor='var(--ac-chart-4)'
                    stopOpacity={0.2}
                  />
                </linearGradient>
              </defs>
              <PolarGrid
                stroke='var(--ac-border)'
                strokeDasharray='3 3'
              />
              <PolarAngleAxis
                dataKey='segment'
                tick={{fontSize: 12, fill: "var(--ac-foreground)"}}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, "auto"]}
                tick={{fontSize: 10}}
              />
              <ChartTooltip
                content={
                  <CustomTooltip
                    active={false}
                    payload={[]}
                  />
                }
              />
              {/* CRITICAL: dataKey must match TimeOfDaySegment field name */}
              <Radar
                dataKey='invoiceCount'
                stroke='var(--ac-chart-4)'
                fill='url(#colorTimeOfDay)'
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
