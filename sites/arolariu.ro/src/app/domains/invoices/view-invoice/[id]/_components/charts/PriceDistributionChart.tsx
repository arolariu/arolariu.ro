"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
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
      color: "hsl(var(--chart-1))",
    },
  };

  const dataWithCurrency = data.map((d) => ({...d, currency}));

  return (
    <Card className='h-full transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>{t("title")}</CardTitle>
        <CardDescription className='text-xs'>{t("description", {currency})}</CardDescription>
      </CardHeader>
      <CardContent className='pb-4'>
        <ChartContainer
          config={chartConfig}
          className='h-[200px] w-full'>
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
                maxBarSize={48}>
                {data.map((item) => (
                  <Cell
                    key={`cell-${item.range}`}
                    fill={`hsl(var(--chart-${(data.indexOf(item) % 5) + 1}))`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
