import {render, screen} from "@testing-library/react";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

vi.mock("recharts", async (importActual) => {
  const actual = await importActual<typeof import("recharts")>();

  const ResponsiveContainer = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
      children?: React.ReactNode;
      debounce?: number;
      initialDimension?: {height: number; width: number};
      maxHeight?: number;
      minHeight?: number | string;
      minWidth?: number | string;
      onResize?: (width: number, height: number) => void;
    }
  >(
    (
      {
        children,
        debounce: _debounce,
        initialDimension: _initialDimension,
        maxHeight: _maxHeight,
        minHeight: _minHeight,
        minWidth: _minWidth,
        onResize: _onResize,
        ...props
      },
      ref,
    ): React.JSX.Element => (
      <div
        ref={ref}
        data-testid='responsive-container'
        {...props}>
        {children}
      </div>
    ),
  );

  ResponsiveContainer.displayName = "ResponsiveContainer";

  return {
    ...actual,
    Line: (): React.JSX.Element => <path data-testid='chart-line' />,
    LineChart: ({children}: Readonly<{children?: React.ReactNode}>): React.JSX.Element => <svg data-testid='line-chart'>{children}</svg>,
    ResponsiveContainer,
  };
});

import {Line, LineChart} from "recharts";

import {ChartContainer, ChartLegendContent, ChartTooltipContent, type ChartConfig} from "./chart";

const config: ChartConfig = {
  orders: {
    color: "#654321",
  },
  revenue: {
    color: "#123456",
    formatter: (value) => `USD ${value}`,
    label: "Revenue",
    stackId: "finance",
    unit: "EUR",
  },
  visitors: {
    color: "#abcdef",
  },
};

describe("ChartContainer", () => {
  function renderChart({className = undefined, id = undefined}: Readonly<{className?: string; id?: string}> = {}): ReturnType<
    typeof render
  > {
    return render(
      <ChartContainer
        className={className}
        config={config}
        id={id}
        style={{height: 300, width: 400}}>
        <LineChart data={[{name: "Jan", revenue: 42}]}>
          <Line
            dataKey='revenue'
            stroke='var(--color-revenue)'
            type='monotone'
          />
        </LineChart>
      </ChartContainer>,
    );
  }

  it("renders without crashing", () => {
    // Arrange
    renderChart();

    // Assert
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("renders chart content with config styles", () => {
    // Arrange
    const {container} = renderChart();

    // Assert
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(container.querySelector("style")?.textContent).toContain("--color-revenue: #123456;");
  });

  it("merges the root className", () => {
    // Arrange
    const {container} = renderChart({className: "custom-chart"});

    // Assert
    expect(container.querySelector("[data-slot='chart']")).toHaveClass("custom-chart");
  });

  it("renders children inside the responsive container", () => {
    // Arrange
    renderChart();

    // Assert
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("chart-line")).toBeInTheDocument();
  });

  it("forwards id, className, and ref to the responsive container", () => {
    // Arrange
    const ref = React.createRef<HTMLDivElement>();
    render(
      <ChartContainer
        ref={ref}
        className='responsive-class'
        config={config}
        id='sales-chart'
        style={{height: 300, width: 400}}>
        <LineChart data={[{name: "Jan", revenue: 42}]}>
          <Line
            dataKey='revenue'
            stroke='var(--color-revenue)'
            type='monotone'
          />
        </LineChart>
      </ChartContainer>,
    );

    // Assert
    const responsiveContainer = screen.getByTestId("responsive-container");
    expect(responsiveContainer).toHaveAttribute("id", "sales-chart");
    expect(responsiveContainer).toHaveClass("responsive-class");
    expect(ref.current).toBe(responsiveContainer);
  });
});

describe("ChartTooltipContent", () => {
  it("renders separator, payload unit, and tuple formatter output for falsey names", () => {
    // Arrange
    const {container} = render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          formatter={(value, name) => [String(value), name ?? ""]}
          payload={[
            {
              color: "#123456",
              dataKey: "revenue",
              name: 0,
              payload: {fill: "#abcdef"},
              unit: "kg",
              value: 42,
            },
          ]}
          separator=' = '
        />
      </ChartContainer>,
    );

    // Assert
    expect(container).toHaveTextContent("0 = 42 kg");
  });

  it("falls back to config formatter and config unit when payload values omit them", () => {
    // Arrange
    const {container} = render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          payload={[
            {
              color: "#123456",
              dataKey: "revenue",
              name: "Revenue",
              payload: {fill: "#abcdef"},
              value: 42,
            },
          ]}
          separator=': '
        />
      </ChartContainer>,
    );

    // Assert
    expect(container).toHaveTextContent("USD 42 EUR");
  });
});

describe("ChartLegendContent", () => {
  it("falls back to legend value and dataKey when config labels are missing", () => {
    // Arrange
    const {container} = render(
      <ChartContainer config={config}>
        <ChartLegendContent
          payload={[
            {
              color: "#123456",
              dataKey: "visitors",
              value: "Visitors",
            },
            {
              color: "#654321",
              dataKey: "orders",
              value: undefined,
            },
          ]}
        />
      </ChartContainer>,
    );

    // Assert
    expect(container).toHaveTextContent("Visitors");
    expect(container).toHaveTextContent("orders");
  });

  it("should render ChartTooltipContent with nameKey prop", () => {
    // Arrange
    const {container} = render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          nameKey='customKey'
          payload={[
            {
              color: "#123456",
              dataKey: "revenue",
              name: "Revenue",
              payload: {customKey: "Custom Label", fill: "#abcdef"},
              value: 42,
            },
          ]}
        />
      </ChartContainer>,
    );

    // Assert - verify component renders
    expect(container).toBeInTheDocument();
  });

  it("should render ChartLegendContent with nameKey prop", () => {
    // Arrange
    const {container} = render(
      <ChartContainer config={config}>
        <ChartLegendContent
          nameKey='customKey'
          payload={[
            {
              color: "#123456",
              dataKey: "revenue",
              payload: {customKey: "Custom Revenue Label"},
              value: "Revenue",
            },
          ]}
        />
      </ChartContainer>,
    );

    // Assert - verify component renders
    expect(container).toBeInTheDocument();
  });

  it("should handle non-number values in formatChartValue", () => {
    // Arrange
    const {container} = render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          payload={[
            {
              color: "#123456",
              dataKey: "status",
              name: "Status",
              value: "active",
            },
          ]}
        />
      </ChartContainer>,
    );

    // Assert
    expect(container).toHaveTextContent("active");
  });

  it("should render ChartTooltipContent with nested payload", () => {
    // Arrange
    const nestedConfig: ChartConfig = {
      nested: {
        color: "#ff0000",
        label: "Nested Value",
      },
    };

    const {container} = render(
      <ChartContainer config={nestedConfig}>
        <ChartTooltipContent
          active
          nameKey='category'
          payload={[
            {
              color: "#ff0000",
              dataKey: "value",
              name: "Value",
              payload: {category: "nested"},
              value: 100,
            },
          ]}
        />
      </ChartContainer>,
    );

    // Assert - verify component renders
    expect(container).toBeInTheDocument();
  });

  it("should render ChartTooltipContent with deeply nested payload", () => {
    // Arrange
    const deepConfig: ChartConfig = {
      deepKey: {
        color: "#00ff00",
        label: "Deep Config",
      },
    };

    const {container} = render(
      <ChartContainer config={deepConfig}>
        <ChartTooltipContent
          active
          nameKey='nestedKey'
          payload={[
            {
              color: "#00ff00",
              dataKey: "data",
              name: "Data",
              payload: {
                payload: {nestedKey: "deepKey"},
              },
              value: 50,
            },
          ]}
        />
      </ChartContainer>,
    );

    // Assert - verify component renders
    expect(container).toBeInTheDocument();
  });
});
