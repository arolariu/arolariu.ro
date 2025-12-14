"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import type {CategoryTrendData} from "../../_utils/analytics";

type Props = {
  data: CategoryTrendData[];
  currency: string;
};

const EMPTY_PAYLOAD: any[] = [];

function CustomTooltip({active, payload = EMPTY_PAYLOAD, currency}: {readonly active?: boolean; readonly payload?: any[]; readonly currency: string}) {
  if (!active || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className='bg-background rounded-lg border px-3 py-2 shadow-md'>
      <p className='text-sm font-medium'>{data.category}</p>
      <div className='mt-1 space-y-0.5'>
        <p className='text-xs'>
          <span className='text-muted-foreground'>Current: </span>
          <span className='font-medium'>
            {data.current.toFixed(2)} {currency}
          </span>
        </p>
        <p className='text-xs'>
          <span className='text-muted-foreground'>Average: </span>
          <span className='font-medium'>
            {data.average.toFixed(2)} {currency}
          </span>
        </p>
      </div>
    </div>
  );
}

export function CategoryComparisonChart({data, currency}: Readonly<Props>): React.JSX.Element {
  const chartConfig = {
    current: {
      label: "Current",
      color: "hsl(var(--chart-1))",
    },
    average: {
      label: "Average",
      color: "hsl(var(--chart-3))",
    },
  };

  return (
    <Card className='h-full transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>Category Comparison</CardTitle>
        <CardDescription className='text-xs'>This invoice vs your average</CardDescription>
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
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Legend
                iconSize={8}
                wrapperStyle={{fontSize: "11px"}}
              />
              <Bar
                dataKey='current'
                fill='hsl(var(--chart-1))'
                radius={[0, 4, 4, 0]}
                maxBarSize={16}
                name='Current'
              />
              <Bar
                dataKey='average'
                fill='hsl(var(--chart-3))'
                radius={[0, 4, 4, 0]}
                maxBarSize={16}
                name='Average'
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
