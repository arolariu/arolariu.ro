"use client";

/**
 * @fileoverview Category Breakdown Chart - displays spending by category as a donut chart.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/CategoryBreakdownChart
 */

import {formatAmount} from "@/lib/utils.generic";
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {Legend, Pie, PieChart, ResponsiveContainer, Tooltip} from "recharts";
import type {CategoryAggregate} from "../../../_utils/statistics";
import styles from "./CategoryBreakdownChart.module.scss";

type Props = {
  readonly data: CategoryAggregate[];
  readonly currency: string;
};

type LegendEntry = {
  color: string;
  value: string;
};

type TooltipPayloadItem = {
  payload: CategoryAggregate & {fill: string};
};

type CustomTooltipProps = {
  readonly active: boolean;
  readonly payload: TooltipPayloadItem[];
  readonly currency: string;
};

type CustomLegendProps = {
  readonly payload: LegendEntry[];
};

/**
 * Custom tooltip for the category pie chart.
 */
function CustomTooltip({active, payload, currency}: CustomTooltipProps): React.JSX.Element | null {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.categoryBreakdown");
  const [firstItem] = payload;
  if (!active || payload.length === 0 || !firstItem) return null;
  const data = firstItem.payload;

  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipCategory"]}>{data.category}</p>
      <p className={styles["tooltipAmount"]}>
        {formatAmount(data.amount)} {currency}
      </p>
      <p className={styles["tooltipPercentage"]}>{formatAmount(data.percentage, "en-US", 1)}%</p>
      <p className={styles["tooltipCount"]}>{t("tooltip.invoiceCount", {count: data.count})}</p>
    </div>
  );
}

/**
 * Custom legend for the pie chart.
 */
function CustomLegend({payload}: CustomLegendProps): React.JSX.Element {
  return (
    <div className={styles["legendContainer"]}>
      {payload.map((entry) => (
        <div
          key={`legend-${entry.value}`}
          className={styles["legendItem"]}>
          <div
            className={styles["legendDot"]}
            style={{backgroundColor: entry.color}}
          />
          <span className={styles["legendLabel"]}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Renders a donut chart showing spending breakdown by category.
 *
 * @param data - Category aggregates with spending amounts
 * @param currency - Currency code for display
 * @returns Pie chart component
 */
export function CategoryBreakdownChart({data, currency}: Props): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.categoryBreakdown");

  const chartConfig: Record<string, {label: string; color: string}> = {};
  for (const [index, item] of data.entries()) {
    chartConfig[item.category] = {
      label: item.category,
      color: `hsl(var(--chart-${(index % 5) + 1}))`,
    };
  }

  const coloredData = data.map((item, index) => ({
    ...item,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`,
  }));

  const total = data.reduce((sum, item) => sum + item.amount, 0);

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
            <PieChart>
              <Pie
                data={coloredData}
                dataKey='amount'
                nameKey='category'
                cx='50%'
                cy='50%'
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                className={styles["pieStroke"]}
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
              <Legend content={<CustomLegend payload={[]} />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className={styles["totalSection"]}>
          <p className={styles["totalAmount"]}>
            {formatAmount(total)} {currency}
          </p>
          <p className={styles["totalLabel"]}>{t("totalLabel")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
