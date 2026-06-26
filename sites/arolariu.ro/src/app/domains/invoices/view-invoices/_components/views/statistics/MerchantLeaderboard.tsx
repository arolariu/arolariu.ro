"use client";

/**
 * @fileoverview Merchant Leaderboard - displays top merchants by spending as horizontal bars.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/MerchantLeaderboard
 */

import {formatAmount} from "@/lib/utils.generic";
import {useMerchantsStore} from "@/stores/merchantsStore";
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
import {useCallback} from "react";
import {TbChartBar} from "react-icons/tb";
import type {MerchantAggregate} from "../../../_utils/statistics";
import styles from "./MerchantLeaderboard.module.scss";

/** Stable empty default for optional merchantNamesById prop. */
const EMPTY_MERCHANT_NAMES: Readonly<Record<string, string>> = {};

/** Stable empty payload for the renderTooltip callback. */
const EMPTY_TOOLTIP_PAYLOAD: ReadonlyArray<TooltipPayloadItem> = [];

type Props = {
  readonly data: MerchantAggregate[];
  readonly currency: string;
  readonly merchantNamesById?: Readonly<Record<string, string>>;
};

type TooltipPayloadItem = {
  payload: MerchantAggregate;
};

type CustomTooltipProps = {
  readonly active?: boolean;
  readonly payload?: ReadonlyArray<TooltipPayloadItem>;
  readonly currency: string;
  readonly getMerchantName: (id: string) => string;
};

/**
 * Custom tooltip for the merchant leaderboard.
 */
function CustomTooltip({active, payload, currency, getMerchantName}: Readonly<CustomTooltipProps>): React.JSX.Element | null {
  const t = useTranslations();
  if (!active || !payload || payload.length === 0) return null;
  const [firstItem] = payload;
  if (!firstItem) return null;
  const data = firstItem.payload;

  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipMerchant"]}>{getMerchantName(data.merchantId)}</p>
      <p className={styles["tooltipAmount"]}>
        {formatAmount(data.totalSpend)} {currency}
      </p>
      <p className={styles["tooltipCount"]}>
        {t((m) => m.cards.invoices.statistics.merchantLeaderboard.tooltip.invoiceCount, {count: String(data.invoiceCount)})}
      </p>
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
export function MerchantLeaderboard({data, currency, merchantNamesById = EMPTY_MERCHANT_NAMES}: Props): React.JSX.Element {
  const t = useTranslations();
  const getMerchantById = useMerchantsStore((state) => state.getEntityById);

  // Create a function to get merchant name or fallback to ID
  const getMerchantName = useCallback(
    (id: string): string => {
      const storyMerchantName = merchantNamesById[id];
      if (storyMerchantName) {
        return storyMerchantName;
      }

      const merchant = getMerchantById(id);
      return merchant?.name ?? t((m) => m.cards.invoices.statistics.merchantLeaderboard.unknownMerchant);
    },
    [getMerchantById, merchantNamesById, t],
  );

  /**
   * Render-prop adapter for Recharts' ChartTooltip. Recharts injects
   * `active` and `payload` at hover time; we spread those in and add our
   * own context (`currency`, `getMerchantName`).
   */
  const renderTooltip = useCallback(
    ({
      active = false,
      payload = EMPTY_TOOLTIP_PAYLOAD,
    }: {
      readonly active?: boolean;
      readonly payload?: ReadonlyArray<TooltipPayloadItem>;
    }) => (
      <CustomTooltip
        active={active}
        payload={payload}
        currency={currency}
        getMerchantName={getMerchantName}
      />
    ),
    [currency, getMerchantName],
  );

  const chartConfig = {
    totalSpend: {
      label: t((m) => m.cards.invoices.statistics.merchantLeaderboard.labels.totalSpent),
      color: "var(--ac-chart-2)",
    },
  };

  // Empty state
  if (data.length === 0) {
    return (
      <Card className={styles["card"]}>
        <CardHeader className={styles["cardHeader"]}>
          <CardTitle className={styles["cardTitle"]}>{t((m) => m.cards.invoices.statistics.merchantLeaderboard.title)}</CardTitle>
          <CardDescription className={styles["cardDescription"]}>
            {t((m) => m.cards.invoices.statistics.merchantLeaderboard.description)}
          </CardDescription>
        </CardHeader>
        <CardContent className={styles["emptyContent"]}>
          <TbChartBar className={styles["emptyIcon"]} />
          <p className={styles["emptyText"]}>{t((m) => m.cards.invoices.statistics.merchantLeaderboard.empty)}</p>
        </CardContent>
      </Card>
    );
  }

  // Map data to include display names. Always cap to the top 10 merchants by
  // spend so the chart stays readable instead of being flooded with bars.
  const displayData = data
    .toSorted((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 10)
    .map((item) => {
      const merchantName = getMerchantName(item.merchantId);
      return {
        ...item,
        displayName: merchantName.length > 20 ? `${merchantName.slice(0, 17)}...` : merchantName,
      };
    });

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle className={styles["cardTitle"]}>{t((m) => m.cards.invoices.statistics.merchantLeaderboard.title)}</CardTitle>
        <CardDescription className={styles["cardDescription"]}>
          {t((m) => m.cards.invoices.statistics.merchantLeaderboard.description)}
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
                interval={0}
              />
              <ChartTooltip content={renderTooltip} />
              <Bar
                dataKey='totalSpend'
                fill='var(--ac-chart-2)'
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
