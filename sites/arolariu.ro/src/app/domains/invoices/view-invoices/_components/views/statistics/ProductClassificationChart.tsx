"use client";

/**
 * @fileoverview Product Classification Chart - displays spending by product classification group as horizontal bars.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/ProductClassificationChart
 *
 * @remarks
 * This component visualizes product-level spending aggregated by the taxonomy root group of
 * each product's {@link StandardClassification}. Unlike the ClassificationBreakdownChart (which
 * shows invoice-level groups), this chart analyzes individual product items across all invoices.
 */

import {formatAmount} from "@/lib/utils.generic";
import {
  Bar,
  BarChart,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import type {ProductClassificationSpending} from "../../../_utils/statistics";
import styles from "./ProductClassificationChart.module.scss";

type Props = {
  readonly data: ProductClassificationSpending[];
  readonly currency: string;
};

type TooltipPayloadItem = {
  readonly payload?: ProductClassificationSpending & {fill: string};
};

type CustomTooltipProps = {
  readonly active?: boolean;
  readonly payload?: ReadonlyArray<TooltipPayloadItem>;
  readonly currency: string;
};

/** Empty payload placeholder used when no tooltip data is available. */
const EMPTY_TOOLTIP_PAYLOAD: ReadonlyArray<TooltipPayloadItem> = [];

/**
 * Custom tooltip for the product classification chart.
 */
function CustomTooltip({
  active = false,
  payload = EMPTY_TOOLTIP_PAYLOAD,
  currency,
}: Readonly<CustomTooltipProps>): React.JSX.Element | null {
  const t = useTranslations();
  if (!active || !payload || payload.length === 0) return null;
  const [firstItem] = payload;
  if (!firstItem) return null;
  const data = firstItem.payload;
  if (!data) return null;

  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipCategory"]}>{data.category}</p>
      <p className={styles["tooltipAmount"]}>
        {formatAmount(data.totalSpent)} {currency}
      </p>
      <p className={styles["tooltipPercentage"]}>{formatAmount(data.percentage, "en-US", 1)}%</p>
      <p className={styles["tooltipCount"]}>
        {t((m) => m.cards.invoices.statistics.productCategory.tooltip.productCount, {count: String(data.productCount)})}
      </p>
    </div>
  );
}

/**
 * Renders a horizontal bar chart showing spending breakdown by product classification group.
 *
 * @param data - Product classification group spending aggregates
 * @param currency - Currency code for display (always RON for normalized data)
 * @returns Horizontal bar chart component
 */
export function ProductClassificationChart({data, currency}: Props): React.JSX.Element {
  const t = useTranslations();

  if (data.length === 0) {
    return (
      <Card className={styles["card"]}>
        <CardHeader className={styles["cardHeader"]}>
          <CardTitle className={styles["cardTitle"]}>{t((m) => m.cards.invoices.statistics.productCategory.title)}</CardTitle>
          <CardDescription className={styles["cardDescription"]}>
            {t((m) => m.cards.invoices.statistics.productCategory.description)}
          </CardDescription>
        </CardHeader>
        <CardContent className={styles["cardContent"]}>
          <div className={styles["emptyState"]}>
            <p className={styles["emptyText"]}>{t((m) => m.cards.invoices.statistics.productCategory.empty)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig: Record<string, {label: string; color: string}> = {};
  for (const [index, item] of data.entries()) {
    chartConfig[item.category] = {
      label: item.category,
      color: `var(--ac-chart-${(index % 5) + 1})`,
    };
  }

  const coloredData = data.map((item, index) => ({
    ...item,
    fill: `var(--ac-chart-${(index % 5) + 1})`,
  }));

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle className={styles["cardTitle"]}>{t((m) => m.cards.invoices.statistics.productCategory.title)}</CardTitle>
        <CardDescription className={styles["cardDescription"]}>
          {t((m) => m.cards.invoices.statistics.productCategory.description)}
        </CardDescription>
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
              layout='vertical'
              margin={{top: 8, right: 8, bottom: 8, left: 120}}>
              <XAxis
                type='number'
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type='category'
                dataKey='category'
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <ChartTooltip
                content={
                  <CustomTooltip
                    payload={EMPTY_TOOLTIP_PAYLOAD}
                    currency={currency}
                  />
                }
              />
              <Bar
                dataKey='totalSpent'
                radius={[0, 4, 4, 0]}
                className={styles["bar"]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
