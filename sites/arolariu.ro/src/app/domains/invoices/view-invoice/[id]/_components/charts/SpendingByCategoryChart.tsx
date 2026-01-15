"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip} from "recharts";
import type {CategorySpending} from "../../_utils/analytics";

type Props = {
  readonly data: CategorySpending[];
  readonly currency: string;
};

type LegendEntry = {
  color: string;
  value: string;
};

type TooltipPayloadItem = {
  payload: {category: string; amount: number; count: number};
};

type CustomTooltipProps = {
  readonly active: boolean;
  readonly payload: TooltipPayloadItem[];
  readonly currency: string;
};

type CustomLegendProps = {
  readonly payload: LegendEntry[];
};

function CustomTooltip({active, payload, currency}: CustomTooltipProps): React.JSX.Element | null {
  const [firstItem] = payload;
  if (!active || payload.length === 0 || !firstItem) return null;
  const data = firstItem.payload;
  return (
    <div className='bg-background rounded-lg border px-3 py-2 shadow-md'>
      <p className='font-medium'>{data.category}</p>
      <p className='text-muted-foreground text-sm'>
        {data.amount.toFixed(2)} {currency}
      </p>
      <p className='text-muted-foreground text-xs'>
        {data.count} item{data.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function CustomLegend({payload}: CustomLegendProps): React.JSX.Element {
  return (
    <div className='mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1'>
      {payload.map((entry) => (
        <div
          key={`legend-${entry.value}`}
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
  const chartConfig: Record<string, {label: string; color: string}> = {};
  for (const [index, item] of data.entries()) {
    chartConfig[item.category] = {
      label: item.category,
      color: `hsl(var(--chart-${(index % 5) + 1}))`,
    };
  }

  let total = 0;
  for (const item of data) {
    total += item.amount;
  }

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
                {data.map((item) => (
                  <Cell
                    key={`cell-${item.category}`}
                    fill={`hsl(var(--chart-${(data.indexOf(item) % 5) + 1}))`}
                    className='stroke-background stroke-2'
                  />
                ))}
              </Pie>
              <Tooltip
                content={
                  <CustomTooltip
                    active={false}
                    payload={[]}
                    currency={currency}
                  />
                }
              />
              <Legend content={<CustomLegend payload={[]} />} />
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
