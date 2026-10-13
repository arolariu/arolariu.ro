import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import * as React from "react";
import * as RechartsPrimitive from "recharts";
import {afterEach, beforeEach, describe, expect, expectTypeOf, it, vi} from "vitest";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  BarStack,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  Cross,
  Curve,
  Customized,
  DefaultZIndexes,
  Dot,
  ErrorBar,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Polygon,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Rectangle,
  RechartsLabel,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Sankey,
  Scatter,
  ScatterChart,
  Sector,
  SunburstChart,
  Symbols,
  Trapezoid,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
  ZIndexLayer,
  useActiveTooltipCoordinate,
  useActiveTooltipDataPoints,
  useActiveTooltipLabel,
  useChartHeight,
  useChartWidth,
  useIsTooltipActive,
  useMargin,
  useOffset,
  usePlotArea,
  useXAxisDomain,
  useYAxisDomain,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  type ChartContainerProps,
  type ChartStyleProps,
  type ChartTooltipContentProps,
  type ChartLegendContentProps,
  type DefaultLegendContentProps,
  type DefaultTooltipContentProps,
  type TooltipValueType,
} from "./chart";

const passThroughs = {
  Area,
  AreaChart,
  Bar,
  BarChart,
  BarStack,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  Cross,
  Curve,
  Customized,
  DefaultZIndexes,
  Dot,
  ErrorBar,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Polygon,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Rectangle,
  Label: RechartsLabel,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Sankey,
  Scatter,
  ScatterChart,
  Sector,
  SunburstChart,
  Symbols,
  Trapezoid,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
  ZIndexLayer,
  useActiveTooltipCoordinate,
  useActiveTooltipDataPoints,
  useActiveTooltipLabel,
  useChartHeight,
  useChartWidth,
  useIsTooltipActive,
  useMargin,
  useOffset,
  usePlotArea,
  useXAxisDomain,
  useYAxisDomain,
} satisfies Partial<typeof RechartsPrimitive>;

describe("Chart public pass-throughs", () => {
  it.each(Object.entries(passThroughs))("preserves the actual Recharts %s identity", (name, value) => {
    expect(value).toBe(Reflect.get(RechartsPrimitive, name));
  });

  it("retains precise dependency types and the two canonical primitive aliases", () => {
    expectTypeOf<typeof passThroughs>().toEqualTypeOf<Pick<typeof RechartsPrimitive, keyof typeof passThroughs>>();
    expect(ChartLegend).toBe(RechartsPrimitive.Legend);
    expect(ChartTooltip).toBe(RechartsPrimitive.Tooltip);
    expectTypeOf<ChartContainerProps["onResize"]>().toEqualTypeOf<RechartsPrimitive.ResponsiveContainerProps["onResize"]>();
    expectTypeOf<ChartContainerProps["children"]>().toEqualTypeOf<RechartsPrimitive.ResponsiveContainerProps["children"]>();
    expectTypeOf<ChartStyleProps["config"]>().toEqualTypeOf<ChartConfig>();
    expectTypeOf<ChartTooltipContentProps["formatter"]>().toEqualTypeOf<DefaultTooltipContentProps["formatter"]>();
    expectTypeOf<ChartLegendContentProps["onClick"]>().toEqualTypeOf<DefaultLegendContentProps["onClick"]>();
    expectTypeOf<DefaultTooltipContentProps>().toEqualTypeOf<RechartsPrimitive.DefaultTooltipContentProps>();
    expectTypeOf<DefaultLegendContentProps>().toEqualTypeOf<RechartsPrimitive.DefaultLegendContentProps>();
    expectTypeOf<TooltipValueType>().toEqualTypeOf<RechartsPrimitive.TooltipValueType>();
  });
});

const observers = new Map<ResizeObserver, {callback: ResizeObserverCallback; targets: Set<Element>}>();

class FixtureResizeObserver implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    observers.set(this, {callback, targets: new Set()});
  }
  observe(target: Element): void {
    observers.get(this)?.targets.add(target);
  }
  unobserve(target: Element): void {
    observers.get(this)?.targets.delete(target);
  }
  disconnect(): void {
    observers.delete(this);
  }
}

function notifyResize(width: number, height: number): void {
  act(() => {
    for (const [observer, {callback, targets}] of observers) {
      callback(
        Array.from(targets, (target): ResizeObserverEntry => {
          const contentRect = new DOMRect(0, 0, width, height);
          const size = {blockSize: height, inlineSize: width};
          return {target, contentRect, contentBoxSize: [size], borderBoxSize: [size], devicePixelContentBoxSize: [size]};
        }),
        observer,
      );
    }
  });
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", FixtureResizeObserver);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 480, 300));
});

afterEach(() => {
  cleanup();
  observers.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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
        id={id}>
        <LineChart
          data={[
            {name: "Jan", revenue: 42},
            {name: "Feb", revenue: 64},
          ]}>
          <Line
            isAnimationActive={false}
            dataKey='revenue'
            stroke='var(--color-revenue)'
            type='monotone'
          />
        </LineChart>
      </ChartContainer>,
    );
  }

  it("renders chart content with config styles", () => {
    // Arrange
    const {container} = renderChart();

    // Assert
    expect(container.querySelector(".recharts-surface")).toBeInTheDocument();
    expect(container.querySelector("style")?.textContent).toContain("--color-revenue: #123456;");
  });

  it("renders children inside the responsive container", () => {
    // Arrange
    renderChart();

    // Assert
    expect(document.querySelector(".recharts-responsive-container")).toBeInTheDocument();
    expect(document.querySelector(".recharts-line-curve")).toBeInTheDocument();
  });

  it("forwards native attributes, className, and ref to the chart root, not its sizing implementation", () => {
    // Arrange
    const ref = React.createRef<HTMLDivElement>();
    render(
      <ChartContainer
        ref={ref}
        className='responsive-class'
        config={config}
        id='sales-chart'
        aria-label='Sales chart'>
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
    const root = screen.getByLabelText("Sales chart");
    expect(root).toHaveAttribute("id", "sales-chart");
    expect(root).toHaveClass("responsive-class");
    expect(ref.current).toBe(root);
    expect(root.querySelector(".recharts-responsive-container")).not.toHaveClass("responsive-class");
  });

  it("delivers responsive sizing options to real chart SVG state", () => {
    const sizes: Array<readonly [number, number]> = [];
    const {container} = render(
      <ChartContainer
        config={config}
        aspect={2}
        maxHeight={240}
        minWidth={120}
        minHeight={80}
        initialDimension={{width: 160, height: 80}}
        onResize={(width, height) => sizes.push([width, height])}>
        <LineChart data={[{revenue: 0}, {revenue: 12}]}>
          <Line
            dataKey='revenue'
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>,
    );
    notifyResize(600, 400);
    expect(sizes).toContainEqual([600, 400]);
    expect(container.querySelector(".recharts-surface")).toHaveAttribute("viewBox", "0 0 600 240");
    expect(container.querySelector(".recharts-line-curve")).toBeInTheDocument();
  });

  it("keeps a root ref and children with fixed Recharts dimensions", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {container} = render(
      <ChartContainer
        ref={ref}
        config={config}
        width={400}
        height={200}>
        <LineChart data={[{revenue: 0}, {revenue: 1}]}>
          <Line
            dataKey='revenue'
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>,
    );
    expect(ref.current).toBe(container.querySelector("[data-slot='chart']"));
    expect(container.querySelector(".recharts-surface")).toHaveAttribute("viewBox", "0 0 400 200");
  });

  it("composes real tooltip and legend primitives with config-aware content without leaking positioning props", () => {
    const errors = vi.spyOn(console, "error");
    const {container} = render(
      <ChartContainer config={config}>
        <BarChart
          data={[
            {month: "Jan", revenue: 0},
            {month: "Feb", revenue: 12},
          ]}
          accessibilityLayer>
          <XAxis dataKey='month' />
          <Bar
            dataKey='revenue'
            fill='var(--color-revenue)'
            isAnimationActive={false}
          />
          <ChartTooltip
            active
            defaultIndex={0}
            isAnimationActive={false}
            content={<ChartTooltipContent />}
          />
          <ChartLegend
            position={{x: 0, y: "100%"}}
            content={<ChartLegendContent />}
          />
        </BarChart>
      </ChartContainer>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("JanRevenue : USD 0 EUR");
    expect(container.querySelector("[data-slot='chart-legend']")).toHaveTextContent("Revenue");
    expect(container.querySelector("[data-slot='chart-legend']")).not.toHaveAttribute("position");
    expect(errors).not.toHaveBeenCalled();
  });
});

describe("ChartStyle", () => {
  it("scopes each chart palette independently even when caller IDs repeat", () => {
    const {container} = render(
      <>
        <ChartContainer
          id='sales'
          config={{value: {color: "#123456"}}}>
          <span>First</span>
        </ChartContainer>
        <ChartContainer
          id='sales'
          config={{value: {color: "#abcdef"}}}>
          <span>Second</span>
        </ChartContainer>
      </>,
    );
    const roots = container.querySelectorAll("[data-slot='chart']");
    expect(roots[0]?.getAttribute("data-chart")).not.toBe(roots[1]?.getAttribute("data-chart"));
    expect(roots[0] && getComputedStyle(roots[0]).getPropertyValue("--color-value")).toBe("#123456");
    expect(roots[1] && getComputedStyle(roots[1]).getPropertyValue("--color-value")).toBe("#abcdef");
  });

  it("emits light and dark config colors with the existing .dark ancestor convention", () => {
    const themeConfig: ChartConfig = {value: {theme: {light: "oklch(60% 0.1 200)", dark: "var(--ac-primary)"}}};
    const {container} = render(
      <div className='dark'>
        <style>{".dark { --ac-primary: #abcdef; }"}</style>
        <ChartContainer config={themeConfig}>
          <span>Dark chart</span>
        </ChartContainer>
      </div>,
    );
    const root = container.querySelector("[data-slot='chart']");
    expect(root && getComputedStyle(root).getPropertyValue("--color-value")).toBe("#abcdef");
    container.firstElementChild?.classList.remove("dark");
    expect(root && getComputedStyle(root).getPropertyValue("--color-value")).toBe("oklch(60% 0.1 200)");
  });

  it("escapes selector IDs rather than allowing style or HTML injection", () => {
    const id = 'sales"] { --injected: red; } </style><script>alert(1)</script>';
    const {container} = render(
      <div data-chart={id}>
        <ChartStyle
          id={id}
          config={{value: {color: "#123456"}}}
        />
      </div>,
    );
    const style = container.querySelector("style");
    expect(style?.textContent).not.toContain("</style>");
    expect(style?.textContent).not.toContain("<script>");
    expect(style?.sheet?.cssRules).toHaveLength(2);
    expect(container.querySelector("script")).toBeNull();
    expect(container.firstElementChild && getComputedStyle(container.firstElementChild).getPropertyValue("--injected")).toBe("");
  });

  it.each([
    "red; --injected: blue",
    "red} body {color:blue",
    "</style><script>alert(1)</script>",
    "url(https://invalid.example/image)",
    "red/*comment*/",
    "rgb(1 2 3",
    "#xyz",
  ])("rejects unsafe or malformed color %s", (color) => {
    const {container} = render(
      <ChartStyle
        id='safe'
        config={{value: {color}}}
      />,
    );
    expect(container.querySelector("style")).toBeNull();
  });

  it("rejects unsafe series keys while retaining independently valid colors", () => {
    const {container} = render(
      <div data-chart='safe'>
        <ChartStyle
          id='safe'
          config={{"evil; color": {color: "red"}, safe: {color: "color-mix(in oklch, red, blue)"}}}
        />
      </div>,
    );
    expect(container.querySelector("style")?.textContent).not.toContain("--color-evil");
    expect(container.firstElementChild && getComputedStyle(container.firstElementChild).getPropertyValue("--color-safe")).toBe(
      "color-mix(in oklch, red, blue)",
    );
  });

  it("omits a rejected dark declaration without losing the valid light color", () => {
    const {container} = render(
      <ChartStyle
        id='safe'
        config={{value: {theme: {light: "red", dark: "blue;display:none"}}}}
      />,
    );
    const style = container.querySelector("style");
    expect(style?.textContent).toContain("--color-value: red;");
    expect(style?.textContent).not.toContain("display");
  });
});

describe("ChartTooltipContent", () => {
  it.each([
    {nameKey: "name", item: {name: "direct", payload: {name: "nested"}}, want: "Direct"},
    {nameKey: "category", item: {name: "Raw", payload: {category: "nested"}}, want: "Nested"},
    {nameKey: "category", item: {name: "Raw", payload: {category: "absent"}}, want: "Fallback"},
    {nameKey: "category", item: {name: "Raw", payload: null}, want: "Fallback"},
    {nameKey: "category", item: {name: "Raw", payload: {category: 0}}, want: "Fallback"},
  ])("resolves direct/nested config lookup or its explicit key fallback: $want", ({nameKey, item, want}) => {
    render(
      <ChartContainer config={{direct: {label: "Direct"}, nested: {label: "Nested"}, category: {label: "Fallback"}}}>
        <ChartTooltipContent
          active
          hideLabel
          nameKey={nameKey}
          payload={[{...item, graphicalItemId: "lookup", value: 0}]}
        />
      </ChartContainer>,
    );
    expect(screen.getByText(want)).toBeInTheDocument();
  });

  it("resolves labelKey independently of nameKey and preserves a zero config label", () => {
    render(
      <ChartContainer config={{heading: {label: 0}, row: {label: "Series"}}}>
        <ChartTooltipContent
          active
          labelKey='category'
          nameKey='name'
          labelClassName='zero-label'
          payload={[{graphicalItemId: "series", name: "row", value: 1, payload: {category: "heading"}}]}
        />
      </ChartContainer>,
    );
    expect(document.querySelector(".zero-label")).toHaveTextContent("0");
    expect(screen.getByText("Series")).toBeInTheDocument();
  });

  it("does not resolve inherited config entries", () => {
    const ownConfig: ChartConfig = {};
    Object.setPrototypeOf(ownConfig, {inherited: {label: "Unowned"}});
    render(
      <ChartContainer config={ownConfig}>
        <ChartTooltipContent
          active
          hideLabel
          payload={[{graphicalItemId: "own", name: "inherited", value: 1}]}
        />
      </ChartContainer>,
    );
    expect(screen.getByText("inherited")).toBeInTheDocument();
    expect(screen.queryByText("Unowned")).toBeNull();
  });
  it("prefers the canonical series name over dataKey when both resolve a config", () => {
    render(
      <ChartContainer config={{value: {label: "Data key label"}, Named: {label: "Series name label"}}}>
        <ChartTooltipContent
          active
          hideLabel
          payload={[{graphicalItemId: "series", dataKey: "value", name: "Named", value: 0}]}
        />
      </ChartContainer>,
    );
    expect(screen.getByText("Series name label")).toBeInTheDocument();
    expect(screen.queryByText("Data key label")).toBeNull();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders numeric zero headings rather than replacing them with a series label", () => {
    render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          label={0}
          labelClassName='heading'
          payload={[{graphicalItemId: "revenue", name: "revenue", value: 0}]}
        />
      </ChartContainer>,
    );
    expect(document.querySelector(".heading")).toHaveTextContent("0");
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("USD 0")).toHaveTextContent("USD 0 EUR");
  });

  it("formats a range value with an explicit range separator", () => {
    render(
      <ChartContainer config={{range: {label: "Range"}}}>
        <ChartTooltipContent
          active
          hideLabel
          payload={[{graphicalItemId: "range", name: "range", value: [0, 20]}]}
        />
      </ChartContainer>,
    );
    expect(screen.getByText("0 ~ 20")).toBeInTheDocument();
  });

  it("lets a null formatter suppress a row without silently restoring its default value", () => {
    const {container} = render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          hideLabel
          formatter={() => null}
          payload={[{graphicalItemId: "revenue", name: "revenue", value: 42}]}
        />
      </ChartContainer>,
    );
    expect(container).not.toHaveTextContent("USD 42");
    expect(container.querySelector("[data-slot='chart-tooltip-item']")).toBeNull();
  });

  it("forwards tooltip DOM refs and native attributes while retaining formatter payload identity", () => {
    const ref = React.createRef<HTMLDivElement>();
    const payload = [{graphicalItemId: "revenue", dataKey: "revenue", name: 0, value: 0}];
    const calls: unknown[][] = [];
    render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          ref={ref}
          active
          aria-label='Details'
          formatter={(...args) => {
            calls.push(args);
            return ["Zero", 0];
          }}
          payload={payload}
        />
      </ChartContainer>,
    );
    expect(ref.current).toBe(screen.getByLabelText("Details"));
    expect(calls[0]).toEqual([0, 0, payload[0], 0, payload]);
    expect(calls[0]?.[4]).toBe(payload);
    expect(screen.getByText("Zero")).toHaveTextContent("Zero EUR");
  });

  it("filters hidden-type entries before choosing a nested line label", () => {
    render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          indicator='line'
          label='Heading'
          payload={[
            {graphicalItemId: "none", type: "none", name: "Ignored", value: 99},
            {graphicalItemId: "revenue", name: "revenue", value: 1},
          ]}
        />
      </ChartContainer>,
    );
    expect(screen.queryByText("Ignored")).toBeNull();
    const row = screen.getByText("Revenue").closest("[data-slot='chart-tooltip-item']");
    expect(row).toHaveTextContent("Heading");
  });

  it.each(["dot", "line", "dashed"] as const)("emits the %s indicator color bridge with no inline presentation", (indicator) => {
    const {container} = render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          indicator={indicator}
          color='oklch(60% 0.1 200)'
          payload={[{graphicalItemId: "revenue", name: "revenue", value: 1, color: "red", payload: {fill: "blue"}}]}
        />
      </ChartContainer>,
    );
    const swatch = container.querySelector("[data-slot='chart-tooltip-indicator']");
    expect(swatch).toHaveAttribute("data-indicator", indicator);
    expect(swatch?.getAttribute("style")).toContain("--ac-chart-indicator-background: oklch(60% 0.1 200)");
    expect(swatch?.getAttribute("style")).not.toContain("background-color");
  });

  it("uses a config icon as a custom indicator and honors hideIndicator for ordinary swatches", () => {
    function Icon(): React.JSX.Element {
      return <svg aria-label='Custom indicator' />;
    }
    const {container, rerender} = render(
      <ChartContainer config={{revenue: {label: "Revenue", icon: Icon}}}>
        <ChartTooltipContent
          active
          hideIndicator
          payload={[{graphicalItemId: "revenue", name: "revenue", value: 1}]}
        />
      </ChartContainer>,
    );
    expect(screen.getByLabelText("Custom indicator")).toBeInTheDocument();
    rerender(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          hideIndicator
          payload={[{graphicalItemId: "revenue", name: "revenue", value: 1}]}
        />
      </ChartContainer>,
    );
    expect(screen.queryByLabelText("Custom indicator")).toBeNull();
    expect(container.querySelector("[data-slot='chart-tooltip-indicator']")).toBeNull();
  });

  it.each([
    {active: false, payload: [{graphicalItemId: "revenue", name: "revenue", value: 1}]},
    {active: true, payload: []},
    {active: true, payload: undefined},
  ] as const)("renders no inactive or empty tooltip for %j", (props) => {
    const {container} = render(
      <ChartContainer config={config}>
        <ChartTooltipContent {...props} />
      </ChartContainer>,
    );
    expect(container.querySelector("[data-slot='chart-tooltip']")).toBeNull();
  });

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
              graphicalItemId: "revenue",
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
              graphicalItemId: "revenue",
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
  it("retains duplicate labels without colliding React keys across updates", () => {
    const errors = vi.spyOn(console, "error");
    const payload = [
      {dataKey: "a", color: "red", value: "Duplicate"},
      {dataKey: "b", color: "blue", value: "Duplicate"},
    ];
    const {rerender} = render(
      <ChartContainer config={{}}>
        <ChartLegendContent payload={payload} />
      </ChartContainer>,
    );
    expect(screen.getAllByText("Duplicate")).toHaveLength(2);
    rerender(
      <ChartContainer config={{}}>
        <ChartLegendContent payload={[payload[1], payload[0]].filter((item) => item !== undefined)} />
      </ChartContainer>,
    );
    expect(screen.getAllByText("Duplicate")).toHaveLength(2);
    expect(errors).not.toHaveBeenCalled();
  });

  it("honors legend formatters, item events, native attributes and root refs", () => {
    const ref = React.createRef<HTMLDivElement>();
    const payload = [{value: "revenue", dataKey: "revenue", color: "red"}];
    const clicked: unknown[] = [];
    render(
      <ChartContainer config={config}>
        <ChartLegendContent
          ref={ref}
          aria-label='Legend'
          payload={payload}
          formatter={(value) => <span>Formatted {value}</span>}
          onClick={(item, index) => clicked.push(item, index)}
        />
      </ChartContainer>,
    );
    expect(ref.current).toBe(screen.getByLabelText("Legend"));
    fireEvent.click(screen.getByText("Formatted Revenue"));
    expect(clicked).toEqual([payload[0], 0]);
  });

  it("uses only a narrow custom-property bridge for legend colors", () => {
    const {container} = render(
      <ChartContainer config={config}>
        <ChartLegendContent payload={[{dataKey: "revenue", value: "Revenue", color: "var(--color-revenue)"}]} />
      </ChartContainer>,
    );
    const swatch = container.querySelector("[data-slot='chart-legend-indicator']");
    expect(swatch?.getAttribute("style")).toContain("--ac-chart-indicator-background: var(--color-revenue)");
    expect(swatch?.getAttribute("style")).not.toContain("background-color");
  });
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
              graphicalItemId: "custom",
              value: 42,
            },
          ]}
        />
      </ChartContainer>,
    );

    expect(container).toHaveTextContent("Revenue");
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

    expect(container).toHaveTextContent("Revenue");
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
              graphicalItemId: "status",
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
              graphicalItemId: "nested",
              value: 100,
            },
          ]}
        />
      </ChartContainer>,
    );

    expect(container).toHaveTextContent("Nested Value");
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
              graphicalItemId: "deep",
              payload: {
                payload: {nestedKey: "deepKey"},
              },
              value: 50,
            },
          ]}
        />
      </ChartContainer>,
    );

    expect(container).toHaveTextContent("Data");
    expect(container).not.toHaveTextContent("Deep Config");
  });

  it("does not render chart styles when the config has no colors", () => {
    // Arrange
    const {container} = render(
      <ChartContainer config={{plain: {label: "Plain"}}}>
        <LineChart data={[{name: "Jan", plain: 42}]}>
          <Line
            dataKey='plain'
            stroke='currentColor'
            type='monotone'
          />
        </LineChart>
      </ChartContainer>,
    );

    // Assert
    expect(container.querySelector("style")).toBeNull();
  });

  it("renders formatter-provided React nodes for tooltip rows", () => {
    // Arrange
    render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          formatter={() => <span data-testid='custom-tooltip-row'>Custom tooltip row</span>}
          payload={[
            {
              color: "#123456",
              dataKey: "revenue",
              name: "Revenue",
              graphicalItemId: "revenue",
              value: 42,
            },
          ]}
        />
      </ChartContainer>,
    );

    // Assert
    expect(screen.getByTestId("custom-tooltip-row")).toBeInTheDocument();
  });

  it("formats nested line labels with labelFormatter", () => {
    // Arrange
    render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          indicator='line'
          label='revenue'
          labelFormatter={(value) => `Label: ${String(value)}`}
          payload={[
            {
              color: "#123456",
              dataKey: "revenue",
              name: "Revenue",
              graphicalItemId: "revenue",
              value: 42,
            },
          ]}
        />
      </ChartContainer>,
    );

    // Assert
    expect(screen.getByText("Label: Revenue")).toBeInTheDocument();
    expect(screen.getByText(/USD 42/)).toBeInTheDocument();
  });

  it("renders nothing when legend payload is empty", () => {
    // Arrange
    const {container} = render(
      <ChartContainer config={config}>
        <ChartLegendContent payload={[]} />
      </ChartContainer>,
    );

    // Assert
    expect(container).not.toHaveTextContent("Revenue");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders configured legend icons unless hideIcon is requested", () => {
    // Arrange
    const TestIcon = (): React.JSX.Element => <svg data-testid='legend-icon' />;
    const iconConfig: ChartConfig = {
      revenue: {
        color: "#123456",
        icon: TestIcon,
        label: "Revenue",
      },
    };
    const payload = [
      {
        color: "#123456",
        dataKey: "revenue",
        value: "Revenue",
      },
    ];
    const {container, rerender} = render(
      <ChartContainer config={iconConfig}>
        <ChartLegendContent
          payload={payload}
          verticalAlign='top'
        />
      </ChartContainer>,
    );

    expect(screen.getByTestId("legend-icon")).toBeInTheDocument();

    // Act
    rerender(
      <ChartContainer config={iconConfig}>
        <ChartLegendContent
          hideIcon
          payload={payload}
          verticalAlign='bottom'
        />
      </ChartContainer>,
    );

    // Assert
    expect(screen.queryByTestId("legend-icon")).toBeNull();
    expect(container).toHaveTextContent("Revenue");
  });

  it.each(["top", "bottom", "middle", undefined] as const)("preserves legend spacing for verticalAlign=%s", (verticalAlign) => {
    // Arrange
    render(
      <ChartContainer config={config}>
        <ChartLegendContent
          className='custom-legend'
          payload={[{color: "#123456", dataKey: "revenue", value: "Revenue"}]}
          verticalAlign={verticalAlign}
        />
      </ChartContainer>,
    );

    // Assert
    const legend = screen.getByText("Revenue").closest(".custom-legend");
    expect(legend).toHaveClass("custom-legend");
    expect(legend?.className).toContain(verticalAlign === "top" ? "legendTop" : "legendBottom");
    expect(legend?.className).not.toContain(verticalAlign === "top" ? "legendBottom" : "legendTop");
  });
});
