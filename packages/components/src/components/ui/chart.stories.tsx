import {Bar, BarChart, CartesianGrid, XAxis} from "recharts";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

// Import the chart container and components
// Note: Using dynamic import pattern to avoid circular dependencies
const ChartModule = await import("./chart");
const {ChartContainer, ChartTooltip, ChartTooltipContent} = ChartModule;

const meta = {
  title: "Components/Data Display/Chart",
  component: ChartContainer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ChartContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

const chartData = [
  {month: "January", desktop: 186, mobile: 80},
  {month: "February", desktop: 305, mobile: 200},
  {month: "March", desktop: 237, mobile: 120},
  {month: "April", desktop: 73, mobile: 190},
  {month: "May", desktop: 209, mobile: 130},
  {month: "June", desktop: 214, mobile: 140},
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "#2563eb",
  },
  mobile: {
    label: "Mobile",
    color: "#60a5fa",
  },
};

/**
 * Bar chart with ChartContainer providing responsive sizing and theming.
 */
export const Default: Story = {
  render: () => (
    <div style={{width: "600px", height: "400px"}}>
      <ChartContainer config={chartConfig}>
        <BarChart
          accessibilityLayer
          data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey='month'
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value: string) => value.slice(0, 3)}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey='desktop'
            fill='var(--color-desktop)'
            radius={4}
          />
          <Bar
            dataKey='mobile'
            fill='var(--color-mobile)'
            radius={4}
          />
        </BarChart>
      </ChartContainer>
    </div>
  ),
};

/**
 * Simple bar chart with single data series.
 */
export const Simple: Story = {
  render: () => {
    const simpleData = [
      {name: "Jan", value: 400},
      {name: "Feb", value: 300},
      {name: "Mar", value: 600},
      {name: "Apr", value: 800},
      {name: "May", value: 500},
    ];

    const simpleConfig = {
      value: {
        label: "Sales",
        color: "#10b981",
      },
    };

    return (
      <div style={{width: "500px", height: "300px"}}>
        <ChartContainer config={simpleConfig}>
          <BarChart data={simpleData}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='name' />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey='value'
              fill='var(--color-value)'
              radius={8}
            />
          </BarChart>
        </ChartContainer>
      </div>
    );
  },
};

/**
 * Chart container with custom dimensions and styling.
 */
export const CustomSize: Story = {
  render: () => (
    <div style={{width: "800px", height: "500px", padding: "1.5rem", background: "#f9fafb", borderRadius: "8px"}}>
      <h3 style={{marginBottom: "1rem", fontSize: "1.125rem", fontWeight: "600"}}>Monthly Revenue</h3>
      <ChartContainer config={chartConfig}>
        <BarChart
          accessibilityLayer
          data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey='month'
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey='desktop'
            fill='var(--color-desktop)'
            radius={6}
          />
          <Bar
            dataKey='mobile'
            fill='var(--color-mobile)'
            radius={6}
          />
        </BarChart>
      </ChartContainer>
    </div>
  ),
};

/**
 * Line chart variant showing trend data.
 */
export const LineChart: Story = {
  render: () => {
    const {Line, LineChart: RechartsLineChart, ResponsiveContainer} = require("recharts");

    const lineData = [
      {month: "Jan", sales: 4000},
      {month: "Feb", sales: 3000},
      {month: "Mar", sales: 5000},
      {month: "Apr", sales: 4500},
      {month: "May", sales: 6000},
      {month: "Jun", sales: 5500},
    ];

    const lineConfig = {
      sales: {
        label: "Sales",
        color: "#8b5cf6",
      },
    };

    return (
      <div style={{width: "600px", height: "400px"}}>
        <ChartContainer config={lineConfig}>
          <RechartsLineChart data={lineData}>
            <CartesianGrid
              strokeDasharray='3 3'
              vertical={false}
            />
            <XAxis
              dataKey='month'
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type='monotone'
              dataKey='sales'
              stroke='var(--color-sales)'
              strokeWidth={2}
              dot={{fill: "var(--color-sales)", r: 4}}
            />
          </RechartsLineChart>
        </ChartContainer>
      </div>
    );
  },
};

/**
 * Pie chart variant showing distribution.
 */
export const PieChart: Story = {
  render: () => {
    const {Pie, PieChart: RechartsPieChart, Cell} = require("recharts");

    const pieData = [
      {name: "Desktop", value: 45},
      {name: "Mobile", value: 30},
      {name: "Tablet", value: 25},
    ];

    const COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

    const pieConfig = {
      desktop: {label: "Desktop", color: "#3b82f6"},
      mobile: {label: "Mobile", color: "#10b981"},
      tablet: {label: "Tablet", color: "#f59e0b"},
    };

    return (
      <div style={{width: "500px", height: "400px"}}>
        <ChartContainer config={pieConfig}>
          <RechartsPieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={pieData}
              cx='50%'
              cy='50%'
              labelLine={false}
              label={({name, percent}: {name: string; percent: number}) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              dataKey='value'>
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
          </RechartsPieChart>
        </ChartContainer>
      </div>
    );
  },
};

/**
 * Stacked bar chart showing composition.
 */
export const Stacked: Story = {
  render: () => {
    const stackedData = [
      {month: "Jan", productA: 400, productB: 240, productC: 240},
      {month: "Feb", productA: 300, productB: 138, productC: 221},
      {month: "Mar", productA: 200, productB: 980, productC: 229},
      {month: "Apr", productA: 278, productB: 390, productC: 200},
      {month: "May", productA: 189, productB: 480, productC: 218},
    ];

    const stackedConfig = {
      productA: {label: "Product A", color: "#3b82f6"},
      productB: {label: "Product B", color: "#8b5cf6"},
      productC: {label: "Product C", color: "#ec4899"},
    };

    return (
      <div style={{width: "600px", height: "400px"}}>
        <ChartContainer config={stackedConfig}>
          <BarChart data={stackedData}>
            <CartesianGrid
              strokeDasharray='3 3'
              vertical={false}
            />
            <XAxis
              dataKey='month'
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey='productA'
              stackId='a'
              fill='var(--color-productA)'
            />
            <Bar
              dataKey='productB'
              stackId='a'
              fill='var(--color-productB)'
            />
            <Bar
              dataKey='productC'
              stackId='a'
              fill='var(--color-productC)'
            />
          </BarChart>
        </ChartContainer>
      </div>
    );
  },
};
