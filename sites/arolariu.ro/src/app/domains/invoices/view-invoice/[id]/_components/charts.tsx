/** @format */

"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartProps {
  data: {name: string; value: number}[];
  index: string;
  categories: string[];
  colors: string[];
  valueFormatter?: (value: number) => string;
  showLegend?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGridLines?: boolean;
  showAnimation?: boolean;
}

/**
 * LineChart component for rendering a line chart.
 * @returns A responsive line chart.
 */
export function LineChart({
  data,
  index,
  categories,
  colors,
  valueFormatter = (value) => `${value}`,
  showLegend = true,
  showXAxis = true,
  showYAxis = true,
  showGridLines = true,
}: Readonly<ChartProps>) {
  return (
    <ResponsiveContainer
      width='100%'
      height='100%'>
      <RechartsLineChart
        data={data}
        margin={{top: 10, right: 30, left: 0, bottom: 0}}>
        {showGridLines && <CartesianGrid strokeDasharray='3 3' />}
        {showXAxis && <XAxis dataKey={index} />}
        {showYAxis && <YAxis />}
        <Tooltip formatter={(value) => valueFormatter(Number(value))} />
        {showLegend && <Legend />}
        {categories.map((category, i) => (
          <Line
            key={category}
            type='monotone'
            dataKey={category}
            stroke={colors[i % colors.length]}
            activeDot={{r: 8}}
            strokeWidth={2}
            dot={{strokeWidth: 2}}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

/**
 * BarChart component for rendering a bar chart.
 * @returns A responsive bar chart.
 */
export function BarChart({
  data,
  index,
  categories,
  colors,
  valueFormatter = (value) => `${value}`,
  showLegend = true,
  showXAxis = true,
  showYAxis = true,
  showGridLines = true,
}: Readonly<ChartProps>) {
  return (
    <ResponsiveContainer
      width='100%'
      height='100%'>
      <RechartsBarChart
        data={data}
        margin={{top: 10, right: 30, left: 0, bottom: 0}}>
        {showGridLines && <CartesianGrid strokeDasharray='3 3' />}
        {showXAxis && <XAxis dataKey={index} />}
        {showYAxis && <YAxis />}
        <Tooltip formatter={(value) => valueFormatter(Number(value))} />
        {showLegend && <Legend />}
        {categories.map((category, i) => (
          <Bar
            key={category}
            dataKey={category}
            fill={colors[i % colors.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

/**
 * PieChart component for rendering a pie chart.
 * @returns A responsive pie chart.
 */
export function PieChart({
  data,
  index,
  categories,
  colors,
  valueFormatter = (value) => `${value}`,
  showLegend = true,
  showAnimation = true,
}: Readonly<ChartProps>) {
  return (
    <ResponsiveContainer
      width='100%'
      height='100%'>
      <RechartsPieChart margin={{top: 10, right: 30, left: 0, bottom: 0}}>
        <Tooltip formatter={(value) => valueFormatter(Number(value))} />
        {showLegend && <Legend />}
        <Pie
          data={data}
          cx='50%'
          cy='50%'
          labelLine={false}
          outerRadius={80}
          dataKey={categories[0]!}
          nameKey={index}
          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
          animationDuration={showAnimation ? 500 : 0}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
            />
          ))}
        </Pie>
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

interface ChartContainerProps {
  children: React.ReactNode;
  config: Record<string, {label: string; color: string}>;
  className?: string;
}

export function ChartContainer({children, config, className = ""}: ChartContainerProps) {
  // Create CSS variables for each color in the config
  const style = Object.entries(config).reduce(
    (acc, [key, {color}]) => {
      acc[`--color-${key}`] = color;
      return acc;
    },
    {} as Record<string, string>,
  );

  return (
    <div
      className={`h-full w-full ${className}`}
      style={style as React.CSSProperties}>
      {children}
    </div>
  );
}

export function ChartTooltip({active, payload, label}: any) {
  if (active && payload && payload.length) {
    return (
      <div className='bg-background rounded-md border p-2 text-sm shadow-sm'>
        <p className='font-medium'>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={`item-${index}`}
            style={{color: entry.color}}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }

  return null;
}

export function ChartTooltipContent({active, payload, label}: any) {
  if (active && payload && payload.length) {
    return (
      <div className='bg-background rounded-md border p-2 text-sm shadow-sm'>
        <p className='font-medium'>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={`item-${index}`}
            style={{color: entry.color}}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }

  return null;
}
