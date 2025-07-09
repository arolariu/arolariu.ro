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

const defaultValueFormatter = (value: number) => `${value}`;

/**
 * LineChart component for rendering a line chart.
 * @returns A responsive line chart.
 */
export function LineChart({
  data,
  index,
  categories,
  colors,
  valueFormatter = defaultValueFormatter,
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
        {Boolean(showGridLines) && <CartesianGrid strokeDasharray='3 3' />}
        {Boolean(showXAxis) && <XAxis dataKey={index} />}
        {Boolean(showYAxis) && <YAxis />}
        <Tooltip formatter={(value) => valueFormatter(Number(value))} />
        {Boolean(showLegend) && <Legend />}
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
  valueFormatter = defaultValueFormatter,
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
        {Boolean(showGridLines) && <CartesianGrid strokeDasharray='3 3' />}
        {Boolean(showXAxis) && <XAxis dataKey={index} />}
        {Boolean(showYAxis) && <YAxis />}
        <Tooltip formatter={(value) => valueFormatter(Number(value))} />
        {Boolean(showLegend) && <Legend />}
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
  valueFormatter = defaultValueFormatter,
  showLegend = true,
  showAnimation = true,
}: Readonly<ChartProps>) {
  return (
    <ResponsiveContainer
      width='100%'
      height='100%'>
      <RechartsPieChart margin={{top: 10, right: 30, left: 0, bottom: 0}}>
        <Tooltip formatter={(value) => valueFormatter(Number(value))} />
        {Boolean(showLegend) && <Legend />}
        <Pie
          data={data}
          cx='50%'
          cy='50%'
          labelLine={false}
          outerRadius={80}
          dataKey={categories[0]!}
          nameKey={index}
          label={({name, percent}) => `${name}: ${(percent! * 100).toFixed(0)}%`}
          animationDuration={showAnimation ? 500 : 0}>
          {data.map((entry, index) => (
            <Cell
              key={`${entry.name}-${entry.value}`}
              fill={colors[index % colors.length]}
            />
          ))}
        </Pie>
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

/**
 * Type definition for ChartContainerProps.
 */
interface ChartContainerProps {
  children: React.ReactNode;
  config: Record<string, {label: string; color: string}>;
  className?: string;
}

/**
 * ChartContainer component for rendering a container with CSS variables for colors.
 * @returns A div element with CSS variables for colors.
 */
export function ChartContainer({children, config, className = ""}: Readonly<ChartContainerProps>) {
  return (
    <div
      className={`h-full w-full ${className}`}
      style={
        {
          "--color-value": config?.["value"]?.color,
        } as React.CSSProperties
      }>
      {children}
    </div>
  );
}
