"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {useCallback} from "react";
import {Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import type {QuantityData} from "../../_utils/analytics";

type Props = {
  readonly data: QuantityData[];
  readonly currency: string;
};

type TooltipPayloadItem = {
  payload: {fullName?: string; name: string; price: number; quantity: number; unit: string};
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
    <div className='bg-background rounded-lg border px-3 py-2 shadow-md'>
      <p className='text-sm font-medium'>{data.fullName ?? data.name}</p>
      <p className='text-muted-foreground text-sm'>
        {data.price.toFixed(2)} {currency}
      </p>
      <p className='text-muted-foreground text-xs'>
        Qty: {data.quantity} {data.unit}
      </p>
    </div>
  );
}

export function ItemsBreakdownChart({data, currency}: Props): React.JSX.Element {
  const chartConfig = {
    price: {
      label: "Price",
      color: "hsl(var(--chart-2))",
    },
  };

  const tickFormatter = useCallback((value: number) => `${value}`, []);

  return (
    <Card className='h-full transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>Top Items by Cost</CardTitle>
        <CardDescription className='text-xs'>Highest spending items</CardDescription>
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
                dataKey='price'
                radius={[0, 4, 4, 0]}
                maxBarSize={24}>
                {data.map((item) => (
                  <Cell
                    key={`cell-${item.name}`}
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
