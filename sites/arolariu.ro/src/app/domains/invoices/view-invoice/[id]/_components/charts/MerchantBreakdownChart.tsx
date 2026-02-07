"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
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
};

function CustomTooltip({active, payload, currency}: CustomTooltipProps): React.JSX.Element | null {
  const [firstItem] = payload;
  if (!active || payload.length === 0 || !firstItem) return null;
  const data = firstItem.payload;
  return (
    <main className={styles["tooltip"]}>
      <p className={styles["tooltipName"]}>{data.name}</p>
      <main className={styles["tooltipDetails"]}>
        <p>
          <span className={styles["tooltipLabel"]}>Total: </span>
          <span className={styles["tooltipValue"]}>
            {data.total.toFixed(2)} {currency}
          </span>
        </p>
        <p>
          <span className={styles["tooltipLabel"]}>Visits: </span>
          <span className={styles["tooltipValue"]}>{data.count}</span>
        </p>
        <p>
          <span className={styles["tooltipLabel"]}>Avg/visit: </span>
          <span className={styles["tooltipValue"]}>
            {data.average.toFixed(2)} {currency}
          </span>
        </p>
      </main>
    </main>
  );
}

export function MerchantBreakdownChart({data, currency, currentMerchant}: Props): React.JSX.Element {
  const chartConfig = {
    total: {
      label: "Total Spent",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <Card className='h-full transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>Spending by Store</CardTitle>
        <CardDescription className='text-xs'>All-time totals across merchants</CardDescription>
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
                  />
                }
              />
              <Bar
                dataKey='total'
                radius={[4, 4, 0, 0]}
                maxBarSize={48}>
                {data.map((entry) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={entry.name === currentMerchant ? "hsl(var(--primary))" : `hsl(var(--chart-${(data.indexOf(entry) % 5) + 1}))`}
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
