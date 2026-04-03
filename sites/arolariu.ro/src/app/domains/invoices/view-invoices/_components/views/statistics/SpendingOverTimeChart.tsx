"use client";

/**
 * @fileoverview Spending Over Time Chart - displays monthly spending trends.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/SpendingOverTimeChart
 */

import {formatAmount} from "@/lib/utils.generic";
import {
  Area,
  AreaChart,
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
import Link from "next/link";
import type {MonthlySpending} from "../../../_utils/statistics";
import styles from "./SpendingOverTimeChart.module.scss";

type Props = {
  readonly data: MonthlySpending[];
  readonly currency: string;
};

type TooltipPayloadItem = {
  payload: MonthlySpending;
};

type CustomTooltipProps = {
  readonly active?: boolean;
  readonly payload?: TooltipPayloadItem[];
  readonly currency: string;
};

/**
 * Custom tooltip for the spending chart.
 */
function CustomTooltip({active, payload, currency}: CustomTooltipProps): React.JSX.Element | null {
  const t = useTranslations("IMS--Stats.spendingOverTime");
  const [firstItem] = payload;
  if (!active || payload.length === 0 || !firstItem) return null;
  const data = firstItem.payload;

  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipMonth"]}>{data.month}</p>
      <p className={styles["tooltipAmount"]}>
        {formatAmount(data.amount)} {currency}
      </p>
      <p className={styles["tooltipCount"]}>{t("tooltip.invoiceCount", {count: data.invoiceCount})}</p>
      {data.invoices && data.invoices.length > 0 && (
        <ul className={styles["tooltipInvoices"]}>
          {data.invoices.slice(0, 10).map((inv) => (
            <li
              key={inv.id}
              className={styles["tooltipInvoiceItem"]}>
              <Link
                href={`/domains/invoices/view-invoice/${inv.id}/`}
                className={styles["tooltipInvoiceLink"]}>
                {inv.name} — {formatAmount(inv.amount)} {currency}
              </Link>
            </li>
          ))}
          {data.invoices.length > 10 && (
            <li className={styles["tooltipMore"]}>{t("tooltip.andMore", {count: data.invoices.length - 10})}</li>
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Formats Y-axis tick values to whole numbers.
 */
function formatYAxisTick(value: number): string {
  return formatAmount(value, "en-US", 0);
}

/**
 * Renders an area chart showing spending trends over time.
 *
 * @param data - Monthly spending data
 * @param currency - Currency code for display
 * @returns Area chart component
 */
export function SpendingOverTimeChart({data, currency}: Props): React.JSX.Element {
  const t = useTranslations("IMS--Stats.spendingOverTime");

  const chartConfig = {
    amount: {
      label: t("labels.amount"),
      color: "var(--ac-chart-1)",
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
            <AreaChart
              data={data}
              margin={{top: 8, right: 8, bottom: 8, left: -16}}>
              <defs>
                <linearGradient
                  id='colorSpending'
                  x1='0'
                  y1='0'
                  x2='0'
                  y2='1'>
                  <stop
                    offset='5%'
                    stopColor='var(--ac-chart-1)'
                    stopOpacity={0.3}
                  />
                  <stop
                    offset='95%'
                    stopColor='var(--ac-chart-1)'
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey='month'
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
                interval='preserveStartEnd'
              />
              <YAxis
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={formatYAxisTick}
              />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Area
                type='monotone'
                dataKey='amount'
                stroke='var(--ac-chart-1)'
                strokeWidth={2}
                fill='url(#colorSpending)'
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
