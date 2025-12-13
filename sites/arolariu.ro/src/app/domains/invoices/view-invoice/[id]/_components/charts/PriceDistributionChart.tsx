"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import type {PriceRange} from "../../_utils/analytics";

type Props = {
  data: PriceRange[];
  currency: string;
};

function CustomTooltip({active, payload}: {readonly active?: boolean; readonly payload?: any[]}) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className='bg-background rounded-lg border px-3 py-2 shadow-md'>
      <p className='font-medium'>
        {data.range} {payload[0].payload.currency}
      </p>
      <p className='text-muted-foreground text-sm'>
        {data.count} item{data.count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function PriceDistributionChart({data, currency}: Readonly<Props>): React.JSX.Element {
  const chartConfig = {
    count: {
      label: "Items",
      color: "hsl(var(--chart-1))",
    },
  };

  const dataWithCurrency = data.map((d) => ({...d, currency}));

  return (
    <Card className='h-full transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>Price Distribution</CardTitle>
        <CardDescription className='text-xs'>Items by price range ({currency})</CardDescription>
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
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey='count'
                radius={[4, 4, 0, 0]}
                maxBarSize={48}>
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
