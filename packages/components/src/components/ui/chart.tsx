"use client";

/* eslint-disable complexity, react/no-object-type-as-default-prop, react/no-danger, react-dom/no-dangerously-set-innerhtml, unicorn/no-negated-condition */

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type {NameType, ValueType} from "recharts/types/component/DefaultTooltipContent";

import {cn} from "@/lib/utilities";

import styles from "./chart.module.css";

const THEMES = {light: "", dark: ".dark"} as const;

/**
 * Describes per-series chart metadata used by legend and tooltip renderers.
 */
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & ({color?: string; theme?: never} | {color?: never; theme: Record<keyof typeof THEMES, string>})
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
    Omit<React.ComponentProps<"div">, "children">,
    Pick<
      React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>,
      "initialDimension" | "aspect" | "debounce" | "minHeight" | "minWidth" | "maxHeight" | "height" | "width" | "onResize" | "children"
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
function ChartContainer({
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
}: Readonly<ChartContainerProps>): React.JSX.Element {
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
}

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
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip>
  & React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  } & Omit<RechartsPrimitive.DefaultTooltipContentProps<ValueType, NameType>, "accessibilityLayer">): React.JSX.Element | null {
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

    if (!value) {
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
            const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color ?? item.payload?.fill ?? item.color ?? "transparent";
            const indicatorStyle = {
              "--chart-indicator-background": indicatorColor,
              "--chart-indicator-border": indicatorColor,
            } as React.CSSProperties & Record<"--chart-indicator-background" | "--chart-indicator-border", string>;

            return (
              <div
                key={`${key}-${index}`}
                className={cn(styles.tooltipItem, indicator === "dot" && styles.tooltipItemCenter)}>
                {formatter && item.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
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
                        <span className={styles.tooltipName}>{itemConfig?.label ?? item.name}</span>
                      </div>
                      {item.value !== null && item.value !== undefined && (
                        <span className={styles.tooltipValue}>
                          {typeof item.value === "number" ? item.value.toLocaleString() : String(item.value)}
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
              {itemConfig?.label}
            </div>
          );
        })}
    </div>
  );
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
