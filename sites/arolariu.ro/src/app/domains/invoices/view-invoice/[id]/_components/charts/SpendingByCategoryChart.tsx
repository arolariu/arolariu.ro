"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartContainer} from "@arolariu/components";
import {Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip} from "recharts";
import type {CategorySpending} from "../../_utils/analytics";
import styles from "./SpendingByCategoryChart.module.scss";

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
    <div className={styles["tooltip"]}>
      <p className={styles["tooltipCategory"]}>{data.category}</p>
      <p className={styles["tooltipAmount"]}>
        {data.amount.toFixed(2)} {currency}
      </p>
      <p className={styles["tooltipCount"]}>
        {data.count} item{data.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function CustomLegend({payload}: CustomLegendProps): React.JSX.Element {
  return (
    <div className={styles["legendContainer"]}>
      {payload.map((entry) => (
        <div 
          key={`legend-${entry.value}`}
          className={styles["legendItem"]}>
          <div 
            className={styles["legendDot"]}
            style={{backgroundColor: entry.color}}
          />
          <span className={styles["legendLabel"]}>{entry.value}</span>
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
        <div className={styles["totalSection"]}>
          <p className={styles["totalAmount"]}>
            {total.toFixed(2)} {currency}
          </p>
          <p className={styles["totalLabel"]}>Total Spending</p>
        </div>
      </CardContent>
    </Card>
  );
}
