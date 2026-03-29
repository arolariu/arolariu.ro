"use client";

/**
 * @fileoverview Merchant Leaderboard - displays top merchants by spending as horizontal bars.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/MerchantLeaderboard
 */

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import type {MerchantAggregate} from "../../../_utils/statistics";
import styles from "./MerchantLeaderboard.module.scss";

type Props = {
  readonly data: MerchantAggregate[];
  readonly currency: string;
};

type TooltipPayloadItem = {
  payload: MerchantAggregate;
};

type CustomTooltipProps = {
  readonly active: boolean;
  readonly payload: TooltipPayloadItem[];
  readonly currency: string;
};

/**
 * Custom tooltip for the merchant leaderboard.
 */
function CustomTooltip({active, payload, currency}: CustomTooltipProps): React.JSX.Element | null {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.merchantLeaderboard");
  const [firstItem] = payload;
  if (!active || payload.length === 0 || !firstItem) return null;
  const data = firstItem.payload;

  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipMerchant"]}>{data.merchantId}</p>
      <p className={styles["tooltipAmount"]}>
        {data.totalSpend.toFixed(2)} {currency}
      </p>
      <p className={styles["tooltipCount"]}>{t("tooltip.invoiceCount", {count: data.invoiceCount})}</p>
    </div>
  );
}

/**
 * Renders a horizontal bar chart showing top merchants by total spending.
 *
 * @param data - Merchant aggregates sorted by spending
 * @param currency - Currency code for display
 * @returns Horizontal bar chart component
 */
export function MerchantLeaderboard({data, currency}: Props): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.merchantLeaderboard");

  const chartConfig = {
    totalSpent: {
      label: t("labels.totalSpent"),
      color: "hsl(var(--chart-2))",
    },
  };

  // Truncate merchant IDs for display
  const displayData = data.map((item) => ({
    ...item,
    displayName: item.merchantId.length > 20 ? `${item.merchantId.slice(0, 17)}...` : item.merchantId,
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
              data={displayData}
              layout='vertical'
              margin={{top: 8, right: 8, bottom: 8, left: 8}}>
              <XAxis
                type='number'
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type='category'
                dataKey='displayName'
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
                width={80}
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
                dataKey='totalSpent'
                fill='hsl(var(--chart-2))'
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
