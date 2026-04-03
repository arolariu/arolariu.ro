"use client";

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
import type {PriceRange} from "../../_utils/analytics";
import styles from "./PriceDistributionChart.module.scss";

type Props = {
  data: PriceRange[];
  currency: string;
};

type TooltipPayloadItem = {
  payload: {range: string; count: number; currency: string};
};

type CustomTooltipProps = {
  readonly active: boolean;
  readonly payload: TooltipPayloadItem[];
};

function CustomTooltip({active, payload}: CustomTooltipProps): React.JSX.Element | null {
  const t = useTranslations("Invoices.ViewInvoice.priceDistributionChart");
  const [firstItem] = payload;
  if (!active || payload.length === 0 || !firstItem) return null;
  const data = firstItem.payload;
  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipRange"]}>
        {data.range} {data.currency}
      </p>
      <p className={styles["tooltipCount"]}>{t("tooltip.itemCount", {count: data.count})}</p>
    </div>
  );
}

export function PriceDistributionChart({data, currency}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoice.priceDistributionChart");
  const chartConfig = {
    count: {
      label: t("labels.items"),
      color: "var(--ac-chart-1)",
    },
  };

  const dataWithCurrency = data.map((d, index) => ({...d, currency, fill: `var(--ac-chart-${(index % 5) + 1})`}));

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle className={styles["cardTitle"]}>{t("title")}</CardTitle>
        <CardDescription className={styles["cardDescription"]}>{t("description", {currency})}</CardDescription>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <ChartContainer
          config={chartConfig}
          className={styles["chartContainer"]}>
          <ResponsiveContainer
            width='100%'
            height='100%'>
            <BarChart
              data={dataWithCurrency}
              margin={{top: 8, right: 8, bottom: 8, left: -16}}>
              <XAxis
                dataKey='range'
                tick={{fontSize: 11}}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                tick={{fontSize: 11}}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={24}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    active={false}
                    payload={[]}
                  />
                }
              />
              <Bar
                dataKey='count'
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
