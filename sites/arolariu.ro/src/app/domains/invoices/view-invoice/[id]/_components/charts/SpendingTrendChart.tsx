"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {Area, AreaChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import type {SpendingTrendData} from "../../_utils/analytics";

type Props = {
  data: SpendingTrendData[];
  currency: string;
};

function CustomTooltip({active, payload, currency}: {active?: boolean; payload?: any[]; currency: string}) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className='bg-background rounded-lg border px-3 py-2 shadow-md'>
      <p className='text-sm font-medium'>{data.name}</p>
      <p className='text-muted-foreground text-xs'>{data.date}</p>
      <p className='mt-1 text-sm font-medium'>
        {data.amount.toFixed(2)} {currency}
      </p>
      {data.isCurrent && <p className='text-primary mt-1 text-xs'>Current Invoice</p>}
    </div>
  );
}

export function SpendingTrendChart({data, currency}: Readonly<Props>): React.JSX.Element {
  const chartConfig = {
    amount: {
      label: "Amount",
      color: "hsl(var(--chart-1))",
    },
  };

  const currentPoint = data.find((d) => d.isCurrent);

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
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Area
                type='monotone'
                dataKey='amount'
                stroke='hsl(var(--chart-1))'
                strokeWidth={2}
                fill='url(#colorAmount)'
              />
              {currentPoint && (
                <ReferenceDot
                  x={currentPoint.date}
                  y={currentPoint.amount}
                  r={6}
                  fill='hsl(var(--primary))'
                  stroke='hsl(var(--background))'
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
