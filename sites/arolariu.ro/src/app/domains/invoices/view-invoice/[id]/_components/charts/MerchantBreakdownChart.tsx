"use client";

import {useMerchantsStore} from "@/stores";
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
import type {MerchantBreakdown} from "../../_utils/analytics";
import styles from "./MerchantBreakdownChart.module.scss";

type Props = {
  readonly data: MerchantBreakdown[];
  readonly currency: string;
  readonly currentMerchant: string;
};

type TooltipPayloadItem = {
  payload: {name: string; total: number; count: number; average: number};
};

type CustomTooltipProps = {
  readonly active: boolean;
  readonly payload: TooltipPayloadItem[];
  readonly currency: string;
  readonly totalLabel: string;
  readonly visitsLabel: string;
  readonly averagePerVisitLabel: string;
};

function CustomTooltip({
  active,
  payload,
  currency,
  totalLabel,
  visitsLabel,
  averagePerVisitLabel,
}: CustomTooltipProps): React.JSX.Element | null {
  const [firstItem] = payload;
  if (!active || payload.length === 0 || !firstItem) return null;
  const data = firstItem.payload;
  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipName"]}>{data.name}</p>
      <div className={styles["tooltipDetails"]}>
        <p>
          <span className={styles["tooltipLabel"]}>{totalLabel}: </span>
          <span className={styles["tooltipValue"]}>
            {data.total.toFixed(2)} {currency}
          </span>
        </p>
        <p>
          <span className={styles["tooltipLabel"]}>{visitsLabel}: </span>
          <span className={styles["tooltipValue"]}>{data.count}</span>
        </p>
        <p>
          <span className={styles["tooltipLabel"]}>{averagePerVisitLabel}: </span>
          <span className={styles["tooltipValue"]}>
            {data.average.toFixed(2)} {currency}
          </span>
        </p>
      </div>
    </div>
  );
}

export function MerchantBreakdownChart({data, currency, currentMerchant}: Props): React.JSX.Element {
  const t = useTranslations("IMS--View.merchantBreakdownChart");
  const merchants = useMerchantsStore((state) => state.merchants);

  // Resolve merchant names from Zustand store
  const getMerchantName = (merchantId: string): string => {
    const merchant = merchants.find((m) => m.id === merchantId);
    return merchant?.name ?? t("unknownMerchant");
  };

  const chartConfig = {
    total: {
      label: t("labels.totalSpent"),
      color: "var(--ac-chart-2)",
    },
  };

  // Map merchant IDs to names and apply colors
  const coloredData = data.map((entry, index) => ({
    ...entry,
    name: getMerchantName(entry.name), // Resolve merchant ID to name
    originalId: entry.name, // Keep original ID for comparison
    fill: entry.name === currentMerchant ? "var(--ac-primary)" : `var(--ac-chart-${(index % 5) + 1})`,
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
                dataKey='name'
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-20}
                textAnchor='end'
                height={50}
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
                    totalLabel={t("labels.total")}
                    visitsLabel={t("labels.visits")}
                    averagePerVisitLabel={t("labels.averagePerVisit")}
                  />
                }
              />
              <Bar
                dataKey='total'
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
