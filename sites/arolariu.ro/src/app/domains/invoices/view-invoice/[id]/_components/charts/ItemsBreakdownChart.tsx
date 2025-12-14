"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import type {QuantityData} from "../../_utils/analytics";

type Props = {

const EMPTY_PAYLOAD: any[] = [];
  data: QuantityData[];
  currency: string;
};

function CustomTooltip({active, payload = EMPTY_PAYLOAD, currency}: {readonly active?: boolean; readonly payload?: any[]; readonly currency: string}) {
  if (!active || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className='bg-background rounded-lg border px-3 py-2 shadow-md'>
      <p className='text-sm font-medium'>{data.fullName || data.name}</p>
      <p className='text-muted-foreground text-sm'>
        {data.price.toFixed(2)} {currency}
      </p>
      <p className='text-muted-foreground text-xs'>
        Qty: {data.quantity} {data.unit}
      </p>
    </div>
  );
}

export function ItemsBreakdownChart({data, currency}: Readonly<Props>): React.JSX.Element {
  const chartConfig = {
    price: {
      label: "Price",
      color: "hsl(var(--chart-2))",
    },
  };

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
                tickFormatter={(value) => `${value}`}
              />
              <YAxis
                type='category'
                dataKey='name'
                tick={{fontSize: 10}}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Bar
                dataKey='price'
                radius={[0, 4, 4, 0]}
                maxBarSize={24}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`hsl(var(--chart-${(index % 5) + 1}))`}
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
