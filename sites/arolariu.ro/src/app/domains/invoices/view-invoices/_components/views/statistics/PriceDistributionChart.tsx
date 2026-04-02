"use client";

/**
 * @fileoverview Price Distribution Chart - displays item price distribution in buckets.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/PriceDistributionChart
 */

import {
  Bar,
  BarChart,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import type {PriceBucket} from "../../../_utils/statistics";
import styles from "./PriceDistributionChart.module.scss";

type Props = {
  readonly data: PriceBucket[];
  readonly currency: string;
};

type TooltipPayloadItem = {
  payload: PriceBucket & {fill: string};
};

type CustomTooltipProps = {
  readonly active: boolean;
  readonly payload: TooltipPayloadItem[];
  readonly currency: string;
};

/**
 * Custom tooltip for the price distribution chart.
 */
function CustomTooltip({active, payload, currency}: CustomTooltipProps): React.JSX.Element | null {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.priceDistribution");
  const [firstItem] = payload;
  if (!active || payload.length === 0 || !firstItem) return null;
  const data = firstItem.payload;

  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipRange"]}>
        {data.range} {currency}
      </p>
      <p className={styles["tooltipCount"]}>{t("tooltip.itemCount", {count: data.count})}</p>
    </div>
  );
}

/**
 * Renders a vertical bar chart showing item price distribution.
 *
 * @param data - Price buckets with item counts
 * @param currency - Currency code for display
 * @returns Bar chart component
 */
export function PriceDistributionChart({data, currency}: Props): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.priceDistribution");

  const chartConfig = {
    count: {
      label: t("labels.itemCount"),
      color: "hsl(var(--chart-3))",
    },
  };

  const coloredData = data.map((item, index) => ({
    ...item,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`,
  }));

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
            <BarChart
              data={coloredData}
              margin={{top: 8, right: 8, bottom: 8, left: -16}}>
              <XAxis
                dataKey='range'
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    active={false}
                    payload={[]}
                    currency={currency}
                  />
                }
              />
              <Bar
                dataKey='count'
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
