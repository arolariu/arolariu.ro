"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip} from "recharts";
import {CategorySpending} from "../../_utils/analytics";

type Props = {
  data: CategorySpending[];
  currency: string;
};

function CustomTooltip({active, payload, currency}: {active?: boolean; payload?: any[]; currency: string}) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  return (
    <div className='bg-background rounded-lg border px-3 py-2 shadow-md'>
      <p className='font-medium'>{data.category}</p>
      <p className='text-muted-foreground text-sm'>
        {data.amount.toFixed(2)} {currency}
      </p>
      <p className='text-muted-foreground text-xs'>
        {data.count} item{data.count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function CustomLegend({payload}: any) {
  return (
    <div className='mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1'>
      {payload?.map((entry: any, index: number) => (
        <div
          key={`legend-${index}`}
          className='flex items-center gap-1'>
          <div
            className='h-2.5 w-2.5 rounded-full'
            style={{backgroundColor: entry.color}}
          />
          <span className='text-muted-foreground text-xs'>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function SpendingByCategoryChart({data, currency}: Props): React.JSX.Element {
  const chartConfig = data.reduce(
    (acc, item, index) => {
      acc[item.category] = {
        label: item.category,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      };
      return acc;
    },
    {} as Record<string, {label: string; color: string}>,
  );

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card className='h-full transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base'>Spending by Category</CardTitle>
        <CardDescription className='text-xs'>Distribution of expenses</CardDescription>
      </CardHeader>
      <CardContent className='pb-4'>
        <ChartContainer
          config={chartConfig}
          className='h-[180px] w-full'>
          <ResponsiveContainer
            width='100%'
            height='100%'>
            <PieChart>
              <Pie
                data={data}
                dataKey='amount'
                nameKey='category'
                cx='50%'
                cy='50%'
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                    className='stroke-background stroke-2'
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className='mt-2 text-center'>
          <p className='text-xl font-bold'>
            {total.toFixed(2)} {currency}
          </p>
          <p className='text-muted-foreground text-xs'>Total Spending</p>
        </div>
      </CardContent>
    </Card>
  );
}
