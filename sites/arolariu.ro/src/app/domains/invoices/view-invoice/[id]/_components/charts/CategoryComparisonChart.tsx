"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
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
  readonly active: boolean;
  readonly payload: TooltipPayloadItem[];
  readonly currency: string;
  readonly currentLabel: string;
  readonly averageLabel: string;
};

function CustomTooltip({active, payload, currency, currentLabel, averageLabel}: CustomTooltipProps): React.JSX.Element | null {
  const [firstItem] = payload;
  if (!active || payload.length === 0 || !firstItem) return null;
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
  const t = useTranslations("Domains.services.invoices.ui.categoryComparisonChart");
  const chartConfig = {
    current: {
      label: t("labels.current"),
      color: "hsl(var(--chart-1))",
    },
    average: {
      label: t("labels.average"),
      color: "hsl(var(--chart-3))",
    },
  };

  return (
    <Card className='h-full transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>{t("title")}</CardTitle>
        <CardDescription className='text-xs'>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className='pb-4'>
        <ChartContainer
          config={chartConfig}
          className='h-[200px] w-full'>
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
              <Tooltip
                content={
                  <CustomTooltip
                    active={false}
                    payload={[]}
                    currency={currency}
                    currentLabel={t("labels.current")}
                    averageLabel={t("labels.average")}
                  />
                }
              />
              <Legend
                iconSize={8}
                wrapperStyle={{fontSize: "11px"}}
              />
              <Bar
                dataKey='current'
                fill='hsl(var(--chart-1))'
                radius={[0, 4, 4, 0]}
                maxBarSize={16}
                name={t("labels.current")}
              />
              <Bar
                dataKey='average'
                fill='hsl(var(--chart-3))'
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
