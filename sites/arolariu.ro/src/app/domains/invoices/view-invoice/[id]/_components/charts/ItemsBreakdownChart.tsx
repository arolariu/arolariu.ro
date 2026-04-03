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
  ChartTooltip,
  XAxis,
  YAxis,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback} from "react";
import type {QuantityData} from "../../_utils/analytics";
import styles from "./ItemsBreakdownChart.module.scss";

type Props = {
  readonly data: QuantityData[];
  readonly currency: string;
};

type TooltipPayloadItem = {
  payload: {fullName?: string; name: string; price: number; quantity: number; unit: string};
};

type CustomTooltipProps = {
  readonly active?: boolean;
  readonly payload?: TooltipPayloadItem[];
  readonly currency: string;
  readonly quantityLabel: string;
};

function CustomTooltip({active, payload, currency, quantityLabel}: CustomTooltipProps): React.JSX.Element | null {
  const [firstItem] = payload ?? [];
  if (!active || !payload || payload.length === 0 || !firstItem) return null;
  const data = firstItem.payload;
  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipName"]}>{data.fullName ?? data.name}</p>
      <p className={styles["tooltipPrice"]}>
        {data.price.toFixed(2)} {currency}
      </p>
      <p className={styles["tooltipQty"]}>
        {quantityLabel}: {data.quantity} {data.unit}
      </p>
    </div>
  );
}

export function ItemsBreakdownChart({data, currency}: Props): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoice.itemsBreakdownChart");
  const chartConfig = {
    price: {
      label: t("labels.price"),
      color: "var(--ac-chart-2)",
    },
  };

  const coloredData = data.map((item, index) => ({
    ...item,
    fill: `var(--ac-chart-${(index % 5) + 1})`,
  }));

  const tickFormatter = useCallback((value: number) => `${value}`, []);

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
              margin={{top: 4, right: 8, bottom: 4, left: 4}}>
              <XAxis
                type='number'
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
                tickFormatter={tickFormatter}
              />
              <YAxis
                type='category'
                dataKey='name'
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <ChartTooltip
                content={(props: Record<string, unknown>) => (
                  <CustomTooltip
                    {...props}
                    currency={currency}
                    quantityLabel={t("labels.quantity")}
                  />
                )}
              />
              <Bar
                dataKey='price'
                radius={[0, 4, 4, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
