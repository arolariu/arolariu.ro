import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {renderToString} from "react-dom/server";
import * as RechartsPrimitive from "recharts";
import * as ChartModule from "./chart";
import {afterEach, beforeEach, describe, expect, expectTypeOf, it, vi} from "vitest";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  BarStack,
  Brush,
  CartesianGrid,
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

describe("Chart accessible alternatives", () => {
  it("uses the real series shape API instead of the removed Cell helper", () => {
    render(
      <ChartContainer
        config={{}}
        accessibleData={<p>May: 42</p>}>
        <BarChart data={[{value: 42}]}>
          <Bar
            dataKey='value'
            isAnimationActive={false}
            shape={
              <Rectangle
                data-testid='custom-shape'
                stroke='#111827'
              />
            }
          />
        </BarChart>
      </ChartContainer>,
    );
    expect(screen.getByTestId("custom-shape")).toHaveAttribute("stroke", "#111827");
    expect(screen.getByText("May: 42")).toBeInTheDocument();
  });

  it("removes Cell and legacy no-op legend fields from the public contract", () => {
    expect(ChartModule).not.toHaveProperty("Cell");
    expectTypeOf<ChartLegendContentProps>().not.toHaveProperty("align");
    expectTypeOf<ChartLegendContentProps>().not.toHaveProperty("onMouseOver");
    expectTypeOf<ChartLegendContentProps>().not.toHaveProperty("onCopyCapture");
  });
  it("exposes a named chart and a persistent caller-owned data alternative", () => {
    render(
      <ChartContainer
        config={{}}
        aria-label='Revenue'
        accessibleData={
          <table>
            <caption>Revenue data</caption>
            <tbody>
              <tr>
                <th>May</th>
                <td>42</td>
              </tr>
            </tbody>
          </table>
        }>
        <BarChart data={[{month: "May", value: 42}]}>
          <Bar
            dataKey='value'
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>,
    );
    expect(screen.getByRole("group", {name: "Revenue"})).toBeInTheDocument();
    expect(screen.getByRole("table", {name: "Revenue data"})).toHaveTextContent("May42");
  });
});

function renderLegendContent(props: Readonly<DefaultLegendContentProps>): React.JSX.Element {
  return <ChartLegendContent {...props} />;
}

function renderTooltipContent(props: Readonly<RechartsPrimitive.TooltipContentProps>): React.JSX.Element {
  return <ChartTooltipContent {...props} />;
}

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
            content={renderTooltipContent}
          />
          <ChartLegend
            position={{x: 0, y: "100%"}}
            content={renderLegendContent}
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
  it("keeps distinct SSR root palettes isolated when React prefixes resemble escaped punctuation", () => {
    function serverChart(identifierPrefix: string, color: string): string {
      return renderToString(
        <ChartContainer
          id='sales'
          config={{revenue: {color}}}
          width={400}
          height={200}>
          <LineChart data={[{revenue: 0}, {revenue: 1}]}>
            <Line
              dataKey='revenue'
              stroke='var(--color-revenue)'
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>,
        {identifierPrefix},
      );
    }
    const firstMarkup = serverChart("scope!", "#123456");
    const secondMarkup = serverChart("scope_21_", "#abcdef");
    const host = document.createElement("div");
    document.body.append(host);
    try {
      host.innerHTML = firstMarkup + secondMarkup;
      const roots = host.querySelectorAll("[data-slot='chart']");
      expect(roots).toHaveLength(2);
      expect(roots[0]?.getAttribute("data-chart")).not.toBe(roots[1]?.getAttribute("data-chart"));
      expect(roots[0] && getComputedStyle(roots[0]).getPropertyValue("--color-revenue")).toBe("#123456");
      expect(roots[1] && getComputedStyle(roots[1]).getPropertyValue("--color-revenue")).toBe("#abcdef");
      const repeat = document.createElement("div");
      repeat.innerHTML = serverChart("scope!", "#123456");
      expect(repeat.querySelector("[data-slot='chart']")?.getAttribute("data-chart")).toBe(roots[0]?.getAttribute("data-chart"));
    } finally {
      host.remove();
    }
  });

  it.each([
    {color: "rgb(255\t0\n0)", normalized: "rgb(255 0 0)", bridged: "rgb(255 0 0)"},
    {color: "var(\n--ac-primary\n)", normalized: "var( --ac-primary )", bridged: "var(--ac-primary)"},
    {color: "hsl(0\r\n100%\f50%)", normalized: "hsl(0 100% 50%)", bridged: "hsl(0 100% 50%)"},
  ])("retains standard CSS whitespace in palette declarations and both indicator bridges: $color", ({color, normalized, bridged}) => {
    const {container} = render(
      <ChartContainer config={{revenue: {label: "Revenue", color}}}>
        <div>
          <ChartTooltipContent
            active
            hideLabel
            color={color}
            payload={[{graphicalItemId: "revenue", name: "revenue", value: 0}]}
          />
          <ChartLegendContent payload={[{value: "Revenue", dataKey: "revenue", color}]} />
        </div>
      </ChartContainer>,
    );
    expect(container.querySelector("style")?.textContent).toContain(`--color-revenue: ${normalized};`);
    for (const slot of ["chart-tooltip-indicator", "chart-legend-indicator"]) {
      const swatch = container.querySelector(`[data-slot='${slot}']`);
      expect(swatch instanceof HTMLElement && swatch.style.getPropertyValue("--ac-chart-indicator-background")).toBe(bridged);
    }
  });

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
    "rgb(255\t0\n0)\n; --injected: red",
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
    {value: 42, output: "tuple"},
    {value: undefined, output: "tuple"},
    {value: undefined, output: "node"},
    {value: undefined, output: "null"},
    {value: undefined, output: "undefined"},
  ] as const)("formats a real function-dataKey series with no name: $value / $output", ({value, output}) => {
    let sdkPayload: RechartsPrimitive.TooltipContentProps["payload"] | undefined;
    const formatter = vi.fn<NonNullable<ChartTooltipContentProps["formatter"]>>((entryValue) => {
      if (output === "null") return null;
      if (output === "undefined") return undefined;
      if (output === "node") return <strong>Missing reading</strong>;
      return [entryValue === undefined ? "No reading" : `Reading ${entryValue}`, "Sensor"];
    });
    const {container} = render(
      <ChartContainer
        config={{}}
        width={400}
        height={200}>
        <BarChart data={[{month: "May", reading: value}]}>
          <XAxis dataKey='month' />
          <Bar
            dataKey={(entry: {reading?: number}) => entry.reading}
            isAnimationActive={false}
          />
          <ChartTooltip
            active
            defaultIndex={0}
            filterNull={false}
            isAnimationActive={false}
            formatter={formatter}
            content={(props) => {
              sdkPayload = props.payload;
              return <ChartTooltipContent {...props} />;
            }}
          />
        </BarChart>
      </ChartContainer>,
    );
    expect(formatter).toHaveBeenCalled();
    const call = formatter.mock.calls.at(-1);
    expect(call?.[0]).toBe(value);
    expect(call?.[1]).toBeUndefined();
    expect(call?.[2]).toBe(sdkPayload?.[0]);
    expect(call?.[3]).toBe(0);
    expect(call?.[4]).toBe(sdkPayload);
    if (output === "null" || output === "undefined") {
      expect(container.querySelector("[data-slot='chart-tooltip-item']")).toBeNull();
    } else if (output === "node") {
      expect(screen.getByText("Missing reading").tagName).toBe("STRONG");
    } else {
      expect(screen.getByText("Sensor")).toBeInTheDocument();
      expect(screen.getByText(value === undefined ? "No reading" : `Reading ${value}`)).toBeInTheDocument();
    }
  });

  it("invokes a payload formatter with absent value and name while retaining the original payload", () => {
    const formatter = vi.fn<NonNullable<ChartTooltipContentProps["formatter"]>>(() => ["Unavailable", "Sensor"]);
    const payload = [{graphicalItemId: "sensor", formatter}];
    render(
      <ChartContainer config={{}}>
        <ChartTooltipContent
          active
          hideLabel
          payload={payload}
        />
      </ChartContainer>,
    );
    expect(formatter).toHaveBeenCalledWith(undefined, undefined, payload[0], 0, payload);
    expect(formatter.mock.calls[0]?.[4]).toBe(payload);
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

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
  it.each(["element", "callback"] as const)(
    "preserves original payload indices after a none-type series with %s content",
    async (contentType) => {
      const user = userEvent.setup();
      const formatter = vi.fn<NonNullable<DefaultLegendContentProps["formatter"]>>((value) => <span>{value}</span>);
      const calls: Array<{item: RechartsPrimitive.LegendPayload; index: number; type: string; target: EventTarget | null}> = [];
      const onItem: NonNullable<ChartLegendContentProps["onClick"]> = (item, index, event) =>
        calls.push({item, index, type: event.type, target: event.currentTarget});
      const {container} = render(
        <ChartContainer
          config={config}
          width={400}
          height={200}>
          <BarChart data={[{hidden: 1, revenue: 2}]}>
            <Bar
              dataKey='hidden'
              name='A hidden'
              legendType='none'
              isAnimationActive={false}
            />
            <Bar
              dataKey='revenue'
              name='B visible'
              isAnimationActive={false}
            />
            <ChartLegend
              itemSorter={null}
              content={contentType === "element" ? <ChartLegendContent aria-label='Series' /> : renderLegendContent}
              formatter={formatter}
              onClick={onItem}
              onMouseEnter={onItem}
              onMouseLeave={onItem}
            />
          </BarChart>
        </ChartContainer>,
      );
      const item = screen.getByRole("button", {name: "Revenue"});
      expect(screen.queryByText("A hidden")).not.toBeInTheDocument();
      expect(container.querySelectorAll("[data-slot='chart-legend-item']")).toHaveLength(1);
      expect(item).toHaveAttribute("type", "button");
      await user.hover(item);
      await user.click(item);
      await user.unhover(item);
      item.focus();
      await user.keyboard("{Enter} ");

      expect(formatter).toHaveBeenCalled();
      expect.soft([...new Set(formatter.mock.calls.map(([, , index]) => index))]).toEqual([1]);
      expect.soft(calls.map(({index, type}) => [index, type])).toEqual([
        [1, "mouseenter"],
        [1, "click"],
        [1, "mouseleave"],
        [1, "click"],
        [1, "click"],
      ]);
      for (const call of calls) {
        expect(call.item).toBe(formatter.mock.calls.at(-1)?.[1]);
        expect(call.item.dataKey).toBe("revenue");
        expect(call.target).toBe(item);
      }
    },
  );

  it("passes the original payload index to an item formatter instead of the legend formatter", () => {
    const formatter = vi.fn<NonNullable<DefaultLegendContentProps["formatter"]>>(() => "Legend fallback");
    const itemFormatter = vi.fn<NonNullable<DefaultLegendContentProps["formatter"]>>((value) => `Item ${value}`);
    const payload: RechartsPrimitive.LegendPayload[] = [
      {dataKey: "hidden", value: "Hidden", type: "none", formatter: itemFormatter},
      {dataKey: "revenue", value: "revenue", formatter: itemFormatter},
    ];
    render(
      <ChartContainer config={config}>
        <ChartLegendContent
          payload={payload}
          formatter={formatter}
        />
      </ChartContainer>,
    );
    expect(screen.getByText("Item Revenue")).toBeInTheDocument();
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
    expect(itemFormatter).toHaveBeenCalledExactlyOnceWith("Revenue", payload[1], 1);
    expect(formatter).not.toHaveBeenCalled();
  });

  it("exposes actual series hide/show transitions without treating every click handler as a toggle", async () => {
    const user = userEvent.setup();
    const clicked: RechartsPrimitive.LegendPayload[] = [];
    function HideableChart(): React.JSX.Element {
      const [hidden, setHidden] = React.useState(false);
      return (
        <ChartContainer
          config={config}
          width={400}
          height={200}>
          <BarChart data={[{month: "May", revenue: 42}]}>
            <XAxis dataKey='month' />
            <Bar
              dataKey='revenue'
              hide={hidden}
              isAnimationActive={false}
            />
            <ChartLegend
              position={{x: 0, y: "100%"}}
              content={<ChartLegendContent />}
              onClick={(item) => {
                clicked.push(item);
                setHidden(!hidden);
              }}
            />
          </BarChart>
        </ChartContainer>
      );
    }
    const {container} = render(<HideableChart />);
    const item = screen.getByRole("button", {name: "Revenue"});
    expect(container.querySelector(".recharts-bar-rectangles path")).toBeInTheDocument();
    expect(item).not.toHaveAttribute("aria-pressed");
    await user.click(item);
    expect(container.querySelector(".recharts-bar-rectangles path")).toBeNull();
    expect(clicked[0]?.inactive).toBe(false);
    expect(item).toHaveAccessibleName("Revenue (hidden)");
    expect(item).toHaveTextContent("(hidden)");
    expect(item).not.toHaveAttribute("aria-pressed");
    await user.keyboard("{Enter}");
    expect(container.querySelector(".recharts-bar-rectangles path")).toBeInTheDocument();
    expect(clicked[1]?.inactive).toBe(true);
    expect(item).toHaveAccessibleName("Revenue");
    expect(item).not.toHaveTextContent("(hidden)");
  });

  it("announces inactive display-only series without inventing interactive semantics", () => {
    const {container} = render(
      <ChartContainer config={config}>
        <ChartLegendContent payload={[{dataKey: "revenue", value: "Revenue", inactive: true}]} />
      </ChartContainer>,
    );
    expect(container.querySelector("[data-slot='chart-legend-item']")).toHaveTextContent("Revenue (hidden)");
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("[aria-pressed]")).toBeNull();
  });

  it("provides native keyboard activation without form submission for clickable legend items", async () => {
    const user = userEvent.setup();
    const calls: Array<readonly [number, string]> = [];
    let submissions = 0;
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submissions++;
        }}>
        <ChartContainer config={config}>
          <BarChart data={[{revenue: 1}]}>
            <Bar
              dataKey='revenue'
              isAnimationActive={false}
            />
            <ChartLegend
              content={<ChartLegendContent />}
              onClick={(_item, index, event) => calls.push([index, event.type])}
            />
          </BarChart>
        </ChartContainer>
      </form>,
    );
    const item = screen.getByRole("button", {name: "Revenue"});
    expect(item).toHaveAttribute("type", "button");
    item.focus();
    await user.keyboard("{Enter} ");
    expect(calls).toEqual([
      [0, "click"],
      [0, "click"],
    ]);
    expect(submissions).toBe(0);
  });

  it.each(["element", "callback"] as const)(
    "consumes unsupported Recharts item events rather than attaching native handlers with %s content",
    (contentType) => {
      const unsupportedCalls: unknown[][] = [];
      const supportedCalls: Array<{item: RechartsPrimitive.LegendPayload; index: number; type: string; target: EventTarget | null}> = [];
      const {container} = render(
        <ChartContainer config={config}>
          <BarChart data={[{revenue: 1}]}>
            <Bar
              dataKey='revenue'
              fill='var(--color-revenue)'
              isAnimationActive={false}
            />
            <ChartLegend
              content={contentType === "element" ? <ChartLegendContent aria-label='Chart series' /> : renderLegendContent}
              onMouseOver={(...args) => unsupportedCalls.push(args)}
              onCopyCapture={(...args) => unsupportedCalls.push(args)}
              onClick={(item, index, event) => supportedCalls.push({item, index, type: event.type, target: event.currentTarget})}
              onMouseEnter={(item, index, event) => supportedCalls.push({item, index, type: event.type, target: event.currentTarget})}
              onMouseLeave={(item, index, event) => supportedCalls.push({item, index, type: event.type, target: event.currentTarget})}
            />
          </BarChart>
        </ChartContainer>,
      );
      const row = container.querySelector("[data-slot='chart-legend-item']");
      expect(row).toBeInTheDocument();
      const label = screen.getByText("Revenue");
      fireEvent.mouseOver(label);
      fireEvent.copy(label);
      fireEvent.click(label);
      fireEvent.mouseLeave(label);
      expect(unsupportedCalls).toEqual([]);
      expect(supportedCalls.map(({type}) => type)).toEqual(["mouseenter", "click", "mouseleave"]);
      for (const call of supportedCalls) {
        expect(call.item.dataKey).toBe("revenue");
        expect(call.index).toBe(0);
        expect(call.target).toBe(row);
      }
    },
  );

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
