"use client";

/* eslint-disable complexity, react/no-object-type-as-default-prop, react/no-danger, react-dom/no-dangerously-set-innerhtml, unicorn/no-negated-condition */

import * as React from "react";
import type {DefaultTooltipContentProps, LegendPayload, ResponsiveContainerProps, TooltipValueType} from "recharts";
import * as RechartsPrimitive from "recharts";

import {cn} from "@/lib/utilities";

import styles from "./chart.module.css";

const THEMES = {light: "", dark: ".dark"} as const;

/**
 * Describes per-series chart metadata used by legend and tooltip renderers.
 */
type ChartConfigItem = {
  /**
   * Label rendered by shared legends and tooltips for the series.
   * @default undefined
   */
  label?: React.ReactNode;
  /**
   * Optional icon rendered in legends and tooltips instead of the color swatch.
   * @default undefined
   */
  icon?: React.ComponentType;
  /**
   * Unit suffix appended to rendered values when the payload does not provide one.
   * @default undefined
   */
  unit?: string;
  /**
   * Shared numeric formatter used by helper content renderers when no Recharts tooltip formatter is supplied.
   * @default undefined
   */
  formatter?: (value: number) => string;
  /**
   * Recharts stack identifier that consuming chart primitives can read from config.
   * @default undefined
   */
  stackId?: string;
};

export type ChartConfig = Record<
  string,
  ChartConfigItem & ({color?: string; theme?: never} | {color?: never; theme: Record<keyof typeof THEMES, string>})
>;

interface ChartContextProps {
  config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart(): ChartContextProps {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

interface ChartContainerProps
  extends
    Omit<React.ComponentProps<"div">, "children" | "className" | "id">,
    Pick<
      ResponsiveContainerProps,
      | "initialDimension"
      | "aspect"
      | "debounce"
      | "minHeight"
      | "minWidth"
      | "maxHeight"
      | "height"
      | "width"
      | "onResize"
      | "children"
      | "className"
      | "id"
    > {
  /**
   * Series configuration used to resolve labels, icons, and colors.
   * @default undefined
   */
  config: ChartConfig;
  /**
   * Inline styles applied to the inner `ResponsiveContainer`.
   * @default undefined
   */
  innerResponsiveContainerStyle?: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["style"];
}

/**
 * Provides responsive chart layout and series config context for Recharts content.
 *
 * @remarks
 * - Renders a wrapping `<div>` element
 * - Built on `recharts` `ResponsiveContainer`
 * - Injects CSS variables so legends and tooltips can share theme-aware colors
 *
 * @example
 * ```tsx
 * <ChartContainer config={{sales: {label: "Sales", color: "#2563eb"}}}>
 *   <RechartsPrimitive.BarChart data={data}>...</RechartsPrimitive.BarChart>
 * </ChartContainer>
 * ```
 *
 * @see {@link https://recharts.org/en-US/api/ResponsiveContainer | Recharts ResponsiveContainer Docs}
 */
const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  (
    {
      id,
      config,
      initialDimension = {width: 320, height: 200},
      className,
      children,
      innerResponsiveContainerStyle,
      aspect,
      debounce,
      height,
      maxHeight,
      minHeight,
      minWidth,
      onResize,
      width,
      ...props
    },
    ref,
  ) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id ?? uniqueId.replaceAll(":", "")}`;

    return (
      <ChartContext.Provider value={{config}}>
        <div
          data-slot='chart'
          data-chart={chartId}
          className={cn(styles.container, className)}
          {...props}>
          <ChartStyle
            id={chartId}
            config={config}
          />
          <RechartsPrimitive.ResponsiveContainer
            ref={ref}
            id={id}
            className={className}
            initialDimension={initialDimension}
            aspect={aspect}
            debounce={debounce}
            height={height}
            maxHeight={maxHeight}
            minHeight={minHeight}
            minWidth={minWidth}
            onResize={onResize}
            style={innerResponsiveContainerStyle}
            width={width}>
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  },
);

/**
 * Emits theme-aware CSS variables for configured chart series colors.
 *
 * @remarks
 * - Renders a `<style>` element
 * - Built on the shared chart configuration contract
 *
 * @example
 * ```tsx
 * <ChartStyle id='chart-sales' config={config} />
 * ```
 *
 * @see {@link https://recharts.org | Recharts Docs}
 */
const ChartStyle = ({id, config}: Readonly<{id: string; config: ChartConfig}>): React.JSX.Element | null => {
  const colorConfig = Object.entries(config).filter(([, itemConfig]) => itemConfig.theme ?? itemConfig.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ?? itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

/**
 * Re-exports the Recharts tooltip primitive for use with shared chart helpers.
 *
 * @remarks
 * - Renders the Recharts tooltip container
 * - Built on `recharts`
 *
 * @example
 * ```tsx
 * <ChartTooltip content={<ChartTooltipContent />} />
 * ```
 *
 * @see {@link https://recharts.org/en-US/api/Tooltip | Recharts Tooltip Docs}
 */
const ChartTooltip = RechartsPrimitive.Tooltip;

/**
 * Renders shared tooltip content for charts configured with {@link ChartContainer}.
 *
 * @remarks
 * - Renders a `<div>` element when active
 * - Built on `recharts` tooltip payloads and shared chart config context
 * - Honors `active`, `payload`, `label`, `labelFormatter`, `formatter`, `separator`,
 *   `className`, `labelClassName`, `color`, `nameKey`, and `labelKey`
 * - Ignores `wrapperClassName`, `contentStyle`, `itemStyle`, `labelStyle`, and
 *   `accessibilityLayer` because this helper renders its own DOM structure
 *
 * @example
 * ```tsx
 * <ChartTooltip content={<ChartTooltipContent indicator='line' />} />
 * ```
 *
 * @see {@link https://recharts.org/en-US/api/Tooltip | Recharts Tooltip Docs}
 */
function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
  separator,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip>
  & React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  } & Omit<DefaultTooltipContentProps, "accessibilityLayer">): React.JSX.Element | null {
  const {config} = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value = !labelKey && typeof label === "string" ? (config[label]?.label ?? label) : itemConfig?.label;

    if (labelFormatter) {
      return <div className={cn(styles.tooltipLabel, labelClassName)}>{labelFormatter(value, payload)}</div>;
    }

    if (value === null || value === undefined) {
      return null;
    }

    return <div className={cn(styles.tooltipLabel, labelClassName)}>{value}</div>;
  }, [config, hideLabel, label, labelClassName, labelFormatter, labelKey, payload]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div className={cn(styles.tooltip, className)}>
      {!nestLabel ? tooltipLabel : null}
      <div className={styles.tooltipBody}>
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = `${nameKey ?? item.dataKey ?? item.name ?? "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color ?? item.payload?.fill ?? item.color ?? "transparent";
            const indicatorStyle = {
              "--ac-chart-indicator-background": indicatorColor,
              "--ac-chart-indicator-border": indicatorColor,
            } as React.CSSProperties & Record<"--ac-chart-indicator-background" | "--ac-chart-indicator-border", string>;

            const itemFormatter = formatter ?? item.formatter;
            const hasFormatter = typeof itemFormatter === "function" && item.value !== undefined && item.name !== undefined;
            const formatterResult = hasFormatter ? itemFormatter(item.value, item.name, item, index, payload) : undefined;
            const formattedEntry = Array.isArray(formatterResult) && formatterResult.length === 2 ? formatterResult : undefined;
            const resolvedName = formattedEntry?.[1] ?? itemConfig?.label ?? item.name;
            const resolvedUnit = item.unit ?? itemConfig?.unit;
            const resolvedValue =
              formattedEntry?.[0] ?? (item.value !== null && item.value !== undefined ? formatChartValue(item.value, itemConfig) : null);

            return (
              <div
                key={`${key}-${index}`}
                className={cn(styles.tooltipItem, indicator === "dot" && styles.tooltipItemCenter)}>
                {formatterResult !== null && formatterResult !== undefined && !formattedEntry ? (
                  formatterResult
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            styles.tooltipIndicator,
                            indicator === "dot" && styles.tooltipIndicatorDot,
                            indicator === "line" && styles.tooltipIndicatorLine,
                            indicator === "dashed" && styles.tooltipIndicatorDashed,
                            nestLabel && indicator === "dashed" && styles.tooltipIndicatorDashedNested,
                          )}
                          style={indicatorStyle}
                        />
                      )
                    )}
                    <div className={cn(styles.tooltipValueRow, nestLabel && styles.tooltipValueRowNested)}>
                      <div className={styles.tooltipNameWrapper}>
                        {nestLabel ? tooltipLabel : null}
                        {resolvedName !== null && resolvedName !== undefined && <span className={styles.tooltipName}>{resolvedName}</span>}
                      </div>
                      {resolvedValue !== null && resolvedValue !== undefined && (
                        <span className={styles.tooltipValue}>
                          {resolvedName !== null && resolvedName !== undefined && separator ? (
                            <span aria-hidden='true'>{separator}</span>
                          ) : null}
                          {resolvedValue}
                          {resolvedUnit !== null && resolvedUnit !== undefined ? <span> {resolvedUnit}</span> : null}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

/**
 * Re-exports the Recharts legend primitive for use with shared chart helpers.
 *
 * @remarks
 * - Renders the Recharts legend container
 * - Built on `recharts`
 *
 * @example
 * ```tsx
 * <ChartLegend content={<ChartLegendContent />} />
 * ```
 *
 * @see {@link https://recharts.org/en-US/api/Legend | Recharts Legend Docs}
 */
const ChartLegend = RechartsPrimitive.Legend;

/**
 * Renders shared legend content for charts configured with {@link ChartContainer}.
 *
 * @remarks
 * - Renders a `<div>` element when legend payload exists
 * - Built on `recharts` legend payloads and shared chart config context
 * - Honors `payload`, `verticalAlign`, `className`, and the custom `hideIcon`
 *   and `nameKey` props
 * - Ignores Recharts presentational props such as `align`, `layout`, `iconSize`,
 *   `iconType`, `formatter`, and item mouse handlers because it renders custom markup
 *
 * @example
 * ```tsx
 * <ChartLegend content={<ChartLegendContent />} />
 * ```
 *
 * @see {@link https://recharts.org/en-US/api/Legend | Recharts Legend Docs}
 */
function ChartLegendContent({
  className,
  hideIcon = false,
  nameKey,
  payload,
  verticalAlign,
}: React.ComponentProps<"div"> & {
  hideIcon?: boolean;
  nameKey?: string;
} & RechartsPrimitive.DefaultLegendContentProps): React.JSX.Element | null {
  const {config} = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div className={cn(styles.legend, verticalAlign === "top" ? styles.legendTop : styles.legendBottom, className)}>
      {payload
        .filter((item) => item.type !== "none")
        .map((item) => {
          const key = `${nameKey ?? item.dataKey ?? "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);

          return (
            <div
              key={String(item.value)}
              className={styles.legendItem}>
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className={styles.legendColor}
                  style={{backgroundColor: item.color}}
                />
              )}
              {itemConfig?.label ?? item.value ?? formatLegendDataKey(item.dataKey)}
            </div>
          );
        })}
    </div>
  );
}

function formatChartValue(value: TooltipValueType, itemConfig: ChartConfig[string] | undefined): React.ReactNode {
  if (typeof value === "number") {
    return itemConfig?.formatter ? itemConfig.formatter(value) : value.toLocaleString();
  }

  return String(value);
}

function formatLegendDataKey(dataKey: LegendPayload["dataKey"]): string | null {
  return typeof dataKey === "number" || typeof dataKey === "string" ? String(dataKey) : null;
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string): ChartConfig[string] | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadObject = payload as Record<string, unknown>;
  const nestedPayload =
    typeof payloadObject["payload"] === "object" && payloadObject["payload"] !== null
      ? (payloadObject["payload"] as Record<string, unknown>)
      : undefined;

  let configLabelKey = key;

  if (typeof payloadObject[key] === "string") {
    configLabelKey = payloadObject[key] as string;
  } else if (nestedPayload && typeof nestedPayload[key] === "string") {
    configLabelKey = nestedPayload[key] as string;
  }

  return config[configLabelKey] ?? config[key];
}

ChartContainer.displayName = "ChartContainer";
ChartStyle.displayName = "ChartStyle";
Object.assign(ChartTooltip, {displayName: "ChartTooltip"});
ChartTooltipContent.displayName = "ChartTooltipContent";
Object.assign(ChartLegend, {displayName: "ChartLegend"});
ChartLegendContent.displayName = "ChartLegendContent";

export {ChartContainer, ChartLegend, ChartLegendContent, ChartStyle, ChartTooltip, ChartTooltipContent};

// ---------------------------------------------------------------------------
// Recharts v3.8+ primitive re-exports
// Consumers should import chart primitives from "@arolariu/components/chart"
// instead of importing directly from "recharts".
// ---------------------------------------------------------------------------

// -- Chart containers -------------------------------------------------------
/** @see {@link https://recharts.github.io/en-US/api/AreaChart | AreaChart API} */
export const AreaChart = RechartsPrimitive.AreaChart;
/** @see {@link https://recharts.github.io/en-US/api/BarChart | BarChart API} */
export const BarChart = RechartsPrimitive.BarChart;
/** @see {@link https://recharts.github.io/en-US/api/ComposedChart | ComposedChart API} */
export const ComposedChart = RechartsPrimitive.ComposedChart;
/** @see {@link https://recharts.github.io/en-US/api/FunnelChart | FunnelChart API} */
export const FunnelChart = RechartsPrimitive.FunnelChart;
/** @see {@link https://recharts.github.io/en-US/api/LineChart | LineChart API} */
export const LineChart = RechartsPrimitive.LineChart;
/** @see {@link https://recharts.github.io/en-US/api/PieChart | PieChart API} */
export const PieChart = RechartsPrimitive.PieChart;
/** @see {@link https://recharts.github.io/en-US/api/RadarChart | RadarChart API} */
export const RadarChart = RechartsPrimitive.RadarChart;
/** @see {@link https://recharts.github.io/en-US/api/RadialBarChart | RadialBarChart API} */
export const RadialBarChart = RechartsPrimitive.RadialBarChart;
/** @see {@link https://recharts.github.io/en-US/api/ScatterChart | ScatterChart API} */
export const ScatterChart = RechartsPrimitive.ScatterChart;
/** @see {@link https://recharts.github.io/en-US/api/Sankey | Sankey API} */
export const Sankey = RechartsPrimitive.Sankey;
/** @see {@link https://recharts.github.io/en-US/api/SunburstChart | SunburstChart API} */
export const SunburstChart = RechartsPrimitive.SunburstChart;
/** @see {@link https://recharts.github.io/en-US/api/Treemap | Treemap API} */
export const Treemap = RechartsPrimitive.Treemap;

// -- Series elements --------------------------------------------------------
/** @see {@link https://recharts.github.io/en-US/api/Area | Area API} */
export const Area = RechartsPrimitive.Area;
/** @see {@link https://recharts.github.io/en-US/api/Bar | Bar API} */
export const Bar = RechartsPrimitive.Bar;
/**
 * Groups stacked bars and configures shared stack properties such as radius.
 * @since recharts 3.6
 * @see {@link https://recharts.github.io/en-US/guide/roundedBars | BarStack Guide}
 */
export const BarStack = RechartsPrimitive.BarStack;
/** @see {@link https://recharts.github.io/en-US/api/Funnel | Funnel API} */
export const Funnel = RechartsPrimitive.Funnel;
/** @see {@link https://recharts.github.io/en-US/api/Line | Line API} */
export const Line = RechartsPrimitive.Line;
/** @see {@link https://recharts.github.io/en-US/api/Pie | Pie API} */
export const Pie = RechartsPrimitive.Pie;
/** @see {@link https://recharts.github.io/en-US/api/Radar | Radar API} */
export const Radar = RechartsPrimitive.Radar;
/** @see {@link https://recharts.github.io/en-US/api/RadialBar | RadialBar API} */
export const RadialBar = RechartsPrimitive.RadialBar;
/** @see {@link https://recharts.github.io/en-US/api/Scatter | Scatter API} */
export const Scatter = RechartsPrimitive.Scatter;

// -- Axis & grid ------------------------------------------------------------
/** @see {@link https://recharts.github.io/en-US/api/CartesianGrid | CartesianGrid API} */
export const CartesianGrid = RechartsPrimitive.CartesianGrid;
/** @see {@link https://recharts.github.io/en-US/api/PolarAngleAxis | PolarAngleAxis API} */
export const PolarAngleAxis = RechartsPrimitive.PolarAngleAxis;
/** @see {@link https://recharts.github.io/en-US/api/PolarGrid | PolarGrid API} */
export const PolarGrid = RechartsPrimitive.PolarGrid;
/** @see {@link https://recharts.github.io/en-US/api/PolarRadiusAxis | PolarRadiusAxis API} */
export const PolarRadiusAxis = RechartsPrimitive.PolarRadiusAxis;
/** @see {@link https://recharts.github.io/en-US/api/XAxis | XAxis API} – supports `type: "auto"` since v3.7. */
export const XAxis = RechartsPrimitive.XAxis;
/** @see {@link https://recharts.github.io/en-US/api/YAxis | YAxis API} – supports `type: "auto"` since v3.7. */
export const YAxis = RechartsPrimitive.YAxis;
/** @see {@link https://recharts.github.io/en-US/api/ZAxis | ZAxis API} */
export const ZAxis = RechartsPrimitive.ZAxis;

// -- Annotations & overlays ------------------------------------------------
/** @see {@link https://recharts.github.io/en-US/api/Brush | Brush API} */
export const Brush = RechartsPrimitive.Brush;
/** @see {@link https://recharts.github.io/en-US/api/ErrorBar | ErrorBar API} */
export const ErrorBar = RechartsPrimitive.ErrorBar;
/** @see {@link https://recharts.github.io/en-US/api/Label | Label API} */
export const RechartsLabel = RechartsPrimitive.Label;
/** @see {@link https://recharts.github.io/en-US/api/LabelList | LabelList API} */
export const LabelList = RechartsPrimitive.LabelList;
/** @see {@link https://recharts.github.io/en-US/api/ReferenceArea | ReferenceArea API} */
export const ReferenceArea = RechartsPrimitive.ReferenceArea;
/** @see {@link https://recharts.github.io/en-US/api/ReferenceDot | ReferenceDot API} */
export const ReferenceDot = RechartsPrimitive.ReferenceDot;
/** @see {@link https://recharts.github.io/en-US/api/ReferenceLine | ReferenceLine API} */
export const ReferenceLine = RechartsPrimitive.ReferenceLine;

// -- Layout -----------------------------------------------------------------
/**
 * Wraps a chart in a responsive container. Since recharts 3.3+, you can
 * alternatively use the `responsive` prop directly on chart containers.
 * @see {@link https://recharts.github.io/en-US/api/ResponsiveContainer | ResponsiveContainer API}
 */
export const ResponsiveContainer = RechartsPrimitive.ResponsiveContainer;
/** @see {@link https://recharts.github.io/en-US/api/Customized | Customized API} */
export const Customized = RechartsPrimitive.Customized;

// -- Shapes -----------------------------------------------------------------
/**
 * @deprecated Since recharts 3.7. Use the `shape` prop on chart series elements instead.
 * @see {@link https://recharts.github.io/en-US/api/Cell | Cell API}
 */
export const Cell = RechartsPrimitive.Cell;
export const Cross = RechartsPrimitive.Cross;
export const Curve = RechartsPrimitive.Curve;
export const Dot = RechartsPrimitive.Dot;
export const Polygon = RechartsPrimitive.Polygon;
export const Rectangle = RechartsPrimitive.Rectangle;
export const Sector = RechartsPrimitive.Sector;
export const Symbols = RechartsPrimitive.Symbols;
export const Trapezoid = RechartsPrimitive.Trapezoid;

// -- Z-index (v3.4+) -------------------------------------------------------
/** @since recharts 3.4 @see {@link https://recharts.github.io/en-US/guide/zIndex | Z-Index Guide} */
export const ZIndexLayer = RechartsPrimitive.ZIndexLayer;
/** Default z-index ordering constants. @since recharts 3.4 */
export const DefaultZIndexes = RechartsPrimitive.DefaultZIndexes;

// -- Hooks (v3+) ------------------------------------------------------------
/** Returns the current chart width in pixels. */
export const useChartWidth = RechartsPrimitive.useChartWidth;
/** Returns the current chart height in pixels. */
export const useChartHeight = RechartsPrimitive.useChartHeight;
/** Returns the chart offset (margins, axes). */
export const useOffset = RechartsPrimitive.useOffset;
/** Returns the plot area dimensions. */
export const usePlotArea = RechartsPrimitive.usePlotArea;
/** Returns the chart margin. */
export const useMargin = RechartsPrimitive.useMargin;
/** Returns whether the tooltip is currently active. @since recharts 3.7 */
export const useIsTooltipActive = RechartsPrimitive.useIsTooltipActive;
/** Returns the active tooltip coordinate. @since recharts 3.7 */
export const useActiveTooltipCoordinate = RechartsPrimitive.useActiveTooltipCoordinate;
/** Returns the active tooltip data points. */
export const useActiveTooltipDataPoints = RechartsPrimitive.useActiveTooltipDataPoints;
/** Returns the active tooltip label. */
export const useActiveTooltipLabel = RechartsPrimitive.useActiveTooltipLabel;
/** Returns the current X-axis domain. */
export const useXAxisDomain = RechartsPrimitive.useXAxisDomain;
/** Returns the current Y-axis domain. */
export const useYAxisDomain = RechartsPrimitive.useYAxisDomain;

// -- Type re-exports --------------------------------------------------------
export type {DefaultLegendContentProps, DefaultTooltipContentProps, TooltipValueType} from "recharts";
