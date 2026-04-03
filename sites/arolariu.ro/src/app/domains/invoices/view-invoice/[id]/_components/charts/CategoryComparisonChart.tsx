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
  ChartLegend,
  ResponsiveContainer,
  ChartTooltip,
  XAxis,
  YAxis,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import type {CategoryTrendData} from "../../_utils/analytics";
import styles from "./CategoryComparisonChart.module.scss";

type Props = {
  readonly data: CategoryTrendData[];
  readonly currency: string;
};

type TooltipPayloadItem = {
  payload: {category: string; current: number; average: number};
};

type CustomTooltipProps = {
  readonly active?: boolean;
  readonly payload?: TooltipPayloadItem[];
  readonly currency: string;
  readonly currentLabel: string;
  readonly averageLabel: string;
};

function CustomTooltip({active, payload, currency, currentLabel, averageLabel}: CustomTooltipProps): React.JSX.Element | null {
  const [firstItem] = payload ?? [];
  if (!active || !payload || payload.length === 0 || !firstItem) return null;
  const data = firstItem.payload;
  return (
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipName"]}>{data.category}</p>
      <div className={styles["tooltipDetails"]}>
        <p className={styles["tooltipRow"]}>
          <span className={styles["tooltipLabel"]}>{currentLabel}: </span>
          <span className={styles["tooltipValue"]}>
            {data.current.toFixed(2)} {currency}
          </span>
        </p>
        <p className={styles["tooltipRow"]}>
          <span className={styles["tooltipLabel"]}>{averageLabel}: </span>
          <span className={styles["tooltipValue"]}>
            {data.average.toFixed(2)} {currency}
          </span>
        </p>
      </div>
    </div>
  );
}

export function CategoryComparisonChart({data, currency}: Props): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoice.categoryComparisonChart");
  const chartConfig = {
    current: {
      label: t("labels.current"),
      color: "var(--ac-chart-1)",
    },
    average: {
      label: t("labels.average"),
      color: "var(--ac-chart-3)",
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
            <BarChart
              data={data}
              layout='vertical'
              margin={{top: 4, right: 8, bottom: 4, left: 4}}>
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
                width={70}
              />
              <ChartTooltip
                content={(props: Record<string, unknown>) => (
                  <CustomTooltip
                    {...props}
                    currency={currency}
                    currentLabel={t("labels.current")}
                    averageLabel={t("labels.average")}
                  />
                )}
              />
              <ChartLegend
                iconSize={8}
                wrapperStyle={{fontSize: "11px"}}
              />
              <Bar
                dataKey='current'
                fill='var(--ac-chart-1)'
                radius={[0, 4, 4, 0]}
                maxBarSize={16}
                name={t("labels.current")}
              />
              <Bar
                dataKey='average'
                fill='var(--ac-chart-3)'
                radius={[0, 4, 4, 0]}
                maxBarSize={16}
                name={t("labels.average")}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
