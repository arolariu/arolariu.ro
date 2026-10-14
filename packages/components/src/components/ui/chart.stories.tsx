import type * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  Rectangle,
  XAxis,
  type ChartConfig,
} from "./chart";

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
} satisfies ChartConfig;

function DataTable({
  data,
  columns,
  caption,
}: Readonly<{
  data: ReadonlyArray<Readonly<Record<string, string | number>>>;
  columns: readonly string[];
  caption: string;
}>): React.JSX.Element {
  return (
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column}
              scope='col'>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            {columns.map((column) => (
              <td key={column}>{row[column]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const monthlyData = (
  <DataTable
    data={chartData}
    columns={["month", "desktop", "mobile"]}
    caption='Monthly visits data'
  />
);
const storyStyles = `
.ac-story-chart-storyFrame {
  width: min(600px, calc(100vw - 2rem));
}

.ac-story-chart-storyCompact {
  width: min(500px, calc(100vw - 2rem));
}

.ac-story-chart-storyLarge {
  width: min(800px, calc(100vw - 2rem));
  padding: var(--ac-space-6);
  border-radius: var(--ac-radius-lg);
  background: var(--ac-muted);
}

.ac-story-chart-storyHeading {
  margin-block: 0 var(--ac-space-4);
  color: var(--ac-foreground);
  font-size: var(--ac-text-lg);
  font-weight: 600;
}

.ac-story-chart-storySamples {
  display: flex;
  flex-wrap: wrap;
  align-items: start;
  gap: var(--ac-space-6);
}

.ac-story-chart-storyDark {
  padding: var(--ac-space-4);
  border-radius: var(--ac-radius-lg);
  background: var(--ac-background);
  color: var(--ac-foreground);
}
`;

const storyClasses = {
  storyFrame: "ac-story-chart-storyFrame",
  storyCompact: "ac-story-chart-storyCompact",
  storyLarge: "ac-story-chart-storyLarge",
  storyHeading: "ac-story-chart-storyHeading",
  storySamples: "ac-story-chart-storySamples",
  storyDark: "ac-story-chart-storyDark",
} as const;

const meta = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  title: "Components/Data Display/Chart",
  component: ChartContainer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Config-aware helpers plus identity-preserving Recharts exports. Name meaningful charts and provide accessibleData with equivalent text or a data table; hover tooltips are not alternatives. Use shape on series, not the removed Cell. Container refs/native attributes target the outer group. Separate SSR roots use distinct React identifierPrefix values. Recharts owns sizing, keyboard navigation and series animation (disable isAnimationActive for static/reduced-motion consumers). Legend content invokes only item click/enter/leave callbacks, never forwards engine events to the DOM. .dark ancestors select dark palettes; verify custom series contrast and distinguish series without color alone.",
      },
    },
  },
  args: {config: chartConfig, children: undefined as React.ReactNode, "aria-label": "Monthly visits", accessibleData: monthlyData},
} satisfies Meta<typeof ChartContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Bar chart with ChartContainer providing responsive sizing and theming.
 */
export const Default: Story = {
  render: (args): React.JSX.Element => (
    <div className={storyClasses.storyFrame}>
      <ChartContainer {...args}>
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
          <ChartLegend content={<ChartLegendContent />} />
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

/** Series shape composition replaces the removed deprecated Cell helper. */
export const ShapeComposition: Story = {
  render: () => (
    <div className={storyClasses.storyFrame}>
      <ChartContainer
        config={chartConfig}
        aria-label='Desktop visits'
        accessibleData={
          <DataTable
            data={chartData}
            columns={["month", "desktop"]}
            caption='Desktop visits data'
          />
        }>
        <BarChart
          data={chartData}
          accessibilityLayer>
          <XAxis dataKey='month' />
          <Bar
            dataKey='desktop'
            fill='var(--color-desktop)'
            shape={
              <Rectangle
                stroke='var(--ac-foreground)'
                strokeWidth={2}
              />
            }
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
  render: (): React.JSX.Element => {
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
      <div className={storyClasses.storyCompact}>
        <ChartContainer
          config={simpleConfig}
          aria-label='Sales'
          accessibleData={
            <DataTable
              data={simpleData}
              columns={["name", "value"]}
              caption='Sales data'
            />
          }>
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
  render: (): React.JSX.Element => (
    <div className={storyClasses.storyLarge}>
      <h3 className={storyClasses.storyHeading}>Monthly Revenue</h3>
      <ChartContainer
        aria-label='Monthly visits'
        accessibleData={monthlyData}
        config={chartConfig}
        aspect={2}
        minHeight={200}
        maxHeight={360}>
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
  render: (): React.JSX.Element => {
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
      <div className={storyClasses.storyFrame}>
        <ChartContainer
          config={lineConfig}
          aria-label='Sales trend'
          accessibleData={
            <DataTable
              data={lineData}
              columns={["month", "sales"]}
              caption='Sales trend data'
            />
          }>
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
            <ChartTooltip content={<ChartTooltipContent indicator='line' />} />
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
  render: (): React.JSX.Element => {
    const pieData = [
      {name: "desktop", value: 45, fill: "var(--color-desktop)"},
      {name: "mobile", value: 30, fill: "var(--color-mobile)"},
      {name: "tablet", value: 25, fill: "var(--color-tablet)"},
    ];

    const pieConfig = {
      desktop: {label: "Desktop", color: "#3b82f6"},
      mobile: {label: "Mobile", color: "#10b981"},
      tablet: {label: "Tablet", color: "#f59e0b"},
    };

    return (
      <div className={storyClasses.storyCompact}>
        <ChartContainer
          config={pieConfig}
          aria-label='Device distribution'
          accessibleData={
            <DataTable
              data={pieData}
              columns={["name", "value"]}
              caption='Device distribution data'
            />
          }>
          <RechartsPieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey='name'
                  hideLabel
                />
              }
            />
            <ChartLegend content={<ChartLegendContent nameKey='name' />} />
            <Pie
              data={pieData}
              cx='50%'
              cy='50%'
              labelLine={false}
              outerRadius={120}
              dataKey='value'
            />
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
  render: (): React.JSX.Element => {
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
      <div className={storyClasses.storyFrame}>
        <ChartContainer
          config={stackedConfig}
          aria-label='Products by month'
          accessibleData={
            <DataTable
              data={stackedData}
              columns={["month", "productA", "productB", "productC"]}
              caption='Products by month data'
            />
          }>
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
            <ChartTooltip content={<ChartTooltipContent indicator='dashed' />} />
            <ChartLegend content={<ChartLegendContent />} />
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

const themedConfig = {
  desktop: {label: "Desktop", theme: {light: "#2563eb", dark: "#93c5fd"}},
  mobile: {label: "Mobile", theme: {light: "#0891b2", dark: "#67e8f9"}},
} satisfies ChartConfig;

/**
 * The same scoped palette resolves under light and `.dark` ancestors.
 */
export const Themes: Story = {
  render: (): React.JSX.Element => (
    <div className={storyClasses.storySamples}>
      {["light", "dark"].map((theme) => (
        <div
          key={theme}
          className={theme === "dark" ? `dark ${storyClasses.storyDark}` : undefined}>
          <h3 className={storyClasses.storyHeading}>{theme === "dark" ? "Dark palette" : "Light palette"}</h3>
          <div className={storyClasses.storyCompact}>
            <ChartContainer
              config={themedConfig}
              aria-label='Monthly visits'
              accessibleData={monthlyData}>
              <BarChart
                data={chartData}
                accessibilityLayer>
                <XAxis
                  dataKey='month'
                  tickFormatter={(value: string) => value.slice(0, 3)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
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
        </div>
      ))}
    </div>
  ),
};

function SampleIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 12 12'>
      <path
        fill='currentColor'
        d='M6 0 12 6 6 12 0 6Z'
      />
    </svg>
  );
}

const contentConfig = {
  amount: {label: "Total", color: "#2563eb", unit: "EUR", formatter: (value: number) => value.toFixed(2)},
  range: {label: "Range", color: "#0891b2"},
  icon: {label: "Custom indicator", icon: SampleIcon, color: "#8b5cf6"},
} satisfies ChartConfig;

/**
 * Deterministic helper samples show zero/range values, each indicator and duplicate legend labels.
 */
export const HelperContent: Story = {
  render: (): React.JSX.Element => (
    <div className={storyClasses.storyFrame}>
      <ChartContainer
        config={contentConfig}
        width={600}
        height={320}>
        <div className={storyClasses.storySamples}>
          {(["dot", "line", "dashed"] as const).map((indicator) => (
            <ChartTooltipContent
              key={indicator}
              active
              indicator={indicator}
              label={0}
              separator=': '
              payload={[
                {graphicalItemId: "amount", name: "amount", value: 0, color: "var(--color-amount)"},
                {graphicalItemId: "range", name: "range", value: [0, 20], color: "var(--color-range)"},
                {graphicalItemId: "icon", name: "icon", value: 7},
              ]}
            />
          ))}
          <ChartTooltipContent
            active
            hideLabel
            formatter={(value, name) => [String(value), `${name} (tuple formatter)`]}
            payload={[{graphicalItemId: "amount", name: "amount", value: 0, color: "var(--color-amount)"}]}
          />
          <ChartLegendContent
            formatter={(value) => <strong>{value}</strong>}
            payload={[
              {dataKey: "first", value: "Duplicate", color: "#2563eb"},
              {dataKey: "second", value: "Duplicate", color: "#0891b2"},
              {dataKey: "icon", value: "Icon", color: "#8b5cf6"},
            ]}
          />
        </div>
      </ChartContainer>
    </div>
  ),
};
