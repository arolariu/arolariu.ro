"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import type {MerchantBreakdown} from "../../_utils/analytics";

type Props = {
  data: MerchantBreakdown[];
  currency: string;
  currentMerchant: string;
};

function CustomTooltip({active, payload, currency}: {active?: boolean; payload?: any[]; currency: string}) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className='bg-background rounded-lg border px-3 py-2 shadow-md'>
      <p className='text-sm font-medium'>{data.name}</p>
      <div className='mt-1 space-y-0.5 text-xs'>
        <p>
          <span className='text-muted-foreground'>Total: </span>
          <span className='font-medium'>
            {data.total.toFixed(2)} {currency}
          </span>
        </p>
        <p>
          <span className='text-muted-foreground'>Visits: </span>
          <span className='font-medium'>{data.count}</span>
        </p>
        <p>
          <span className='text-muted-foreground'>Avg/visit: </span>
          <span className='font-medium'>
            {data.average.toFixed(2)} {currency}
          </span>
        </p>
      </div>
    </div>
  );
}

export function MerchantBreakdownChart({data, currency, currentMerchant}: Readonly<Props>): React.JSX.Element {
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
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Bar
                dataKey='total'
                radius={[4, 4, 0, 0]}
                maxBarSize={48}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.name === currentMerchant ? "hsl(var(--primary))" : `hsl(var(--chart-${(index % 5) + 1}))`}
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
