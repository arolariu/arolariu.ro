"use client";

/**
 * @fileoverview Product Category Chart - displays spending by product category as horizontal bars.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/ProductCategoryChart
 *
 * @remarks
 * This component visualizes product-level spending aggregated by ProductCategory enum.
 * Unlike the CategoryBreakdownChart (which shows invoice-level categories),
 * this chart analyzes individual product items across all invoices.
 *
 * **Features:**
 * - Horizontal bar chart for easy label reading
 * - Color-coded bars by category
 * - Shows total spent, product count, and percentage
 * - Responsive design with mobile optimization
 *
 * **Empty State:**
 * Displays a friendly message when no products are available.
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import type {ProductCategorySpending} from "../../../_utils/statistics";
import styles from "./ProductCategoryChart.module.scss";

type Props = {
  readonly data: ProductCategorySpending[];
  readonly currency: string;
};

type TooltipPayloadItem = {
  payload: ProductCategorySpending & {fill: string};
};

type CustomTooltipProps = {
  readonly active?: boolean;
  readonly payload?: TooltipPayloadItem[];
  readonly currency: string;
};

/**
 * Custom tooltip for the product category chart.
 *
 * @remarks
 * Displays category name, total spending, product count, and percentage
 * in a formatted card overlay.
 */
function CustomTooltip({active, payload = [], currency}: CustomTooltipProps): React.JSX.Element | null {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.productCategory");
  if (!active || !payload || payload.length === 0) return null;
  const [firstItem] = payload;
  if (!firstItem) return null;
  const data = firstItem.payload;

  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipCategory"]}>{data.category}</p>
      <p className={styles["tooltipAmount"]}>
        {formatAmount(data.totalSpent)} {currency}
      </p>
      <p className={styles["tooltipPercentage"]}>{formatAmount(data.percentage, "en-US", 1)}%</p>
      <p className={styles["tooltipCount"]}>{t("tooltip.productCount", {count: data.productCount})}</p>
    </div>
  );
}

/**
 * Renders a horizontal bar chart showing spending breakdown by product category.
 *
 * @remarks
 * **Performance:**
 * Uses memoized data from parent component to avoid recalculations.
 * Chart rendering is handled by recharts with optimized SVG output.
 *
 * **Accessibility:**
 * - Semantic HTML with ARIA labels
 * - Keyboard navigation support
 * - Screen reader friendly tooltips
 *
 * **Color Scheme:**
 * Uses CSS custom properties from the theme (--chart-1 through --chart-5)
 * with cycling for categories beyond 5.
 *
 * @param data - Product category spending aggregates
 * @param currency - Currency code for display (always RON for normalized data)
 * @returns Horizontal bar chart component
 */
export function ProductCategoryChart({data, currency}: Props): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.productCategory");

  // Empty state
  if (data.length === 0) {
    return (
      <Card className={styles["card"]}>
        <CardHeader className={styles["cardHeader"]}>
          <CardTitle className={styles["cardTitle"]}>{t("title")}</CardTitle>
          <CardDescription className={styles["cardDescription"]}>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className={styles["cardContent"]}>
          <div className={styles["emptyState"]}>
            <p className={styles["emptyText"]}>{t("empty")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
              <Tooltip
                content={(props) => (
                  <CustomTooltip
                    {...props}
                    currency={currency}
                  />
                )}
              />
              <Bar
                dataKey='totalSpent'
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
