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
