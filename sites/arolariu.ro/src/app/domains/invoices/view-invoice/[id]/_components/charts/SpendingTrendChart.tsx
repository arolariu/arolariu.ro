"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {useCallback} from "react";
import {Area, AreaChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import type {SpendingTrendData} from "../../_utils/analytics";
import styles from "./SpendingTrendChart.module.scss";

type Props = {
  readonly data: SpendingTrendData[];
  readonly currency: string;
};

type TooltipPayloadItem = {
  payload: {name: string; date: string; amount: number; isCurrent?: boolean};
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
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipName"]}>{data.name}</p>
      <p className={styles["tooltipDate"]}>{data.date}</p>
      <p className={styles["tooltipAmount"]}>
        {data.amount.toFixed(2)} {currency}
      </p>
      {data.isCurrent ? <p className={styles["tooltipCurrent"]}>Current Invoice</p> : null}
    </div>
  );
}

export function SpendingTrendChart({data, currency}: Props): React.JSX.Element {
  const chartConfig = {
    amount: {
      label: "Amount",
      color: "hsl(var(--chart-1))",
    },
  };

  const currentPoint = data.find((d) => d.isCurrent);
  const tickFormatter = useCallback((value: number) => `${value}`, []);

  return (
    <Card className='h-full transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>Spending Over Time</CardTitle>
        <CardDescription className='text-xs'>Your invoice history trend</CardDescription>
      </CardHeader>
      <CardContent className='pb-4'>
        <ChartContainer
          config={chartConfig}
          className='h-[200px] w-full'>
          <ResponsiveContainer
            width='100%'
            height='100%'>
            <AreaChart
              data={data}
              margin={{top: 8, right: 8, bottom: 8, left: -16}}>
              <defs>
                <linearGradient
                  id='colorAmount'
                  x1='0'
                  y1='0'
                  x2='0'
                  y2='1'>
                  <stop
                    offset='5%'
                    stopColor='hsl(var(--chart-1))'
                    stopOpacity={0.3}
                  />
                  <stop
                    offset='95%'
                    stopColor='hsl(var(--chart-1))'
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey='date'
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
                interval='preserveStartEnd'
              />
              <YAxis
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
                width={32}
                tickFormatter={tickFormatter}
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
              <Area
                type='monotone'
                dataKey='amount'
                stroke='hsl(var(--chart-1))'
                strokeWidth={2}
                fill='url(#colorAmount)'
              />
              {currentPoint ? (
                <ReferenceDot
                  x={currentPoint.date}
                  y={currentPoint.amount}
                  r={6}
                  fill='hsl(var(--primary))'
                  stroke='hsl(var(--background))'
                  strokeWidth={2}
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
