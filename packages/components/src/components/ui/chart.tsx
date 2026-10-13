"use client";

/* eslint-disable complexity, sonarjs/cognitive-complexity, unicorn/no-negated-condition */

import * as React from "react";
import type {
  DefaultLegendContentProps,
  DefaultTooltipContentProps,
  LegendPayload,
  ResponsiveContainerProps,
  TooltipValueType,
} from "recharts";
import * as RechartsPrimitive from "recharts";

import {cn} from "@/lib/utilities";

import styles from "./chart.module.css";

const THEMES = {light: "", dark: ".dark"} as const;
const INITIAL_DIMENSION = {width: 320, height: 200} as const;
const HEX_COLOR_LENGTHS: ReadonlySet<number> = new Set([4, 5, 7, 9]);

/**
 * Describes per-series chart metadata used by legend and tooltip renderers.
 */
type ChartConfigItem = {
  /**
   * Label rendered by shared legends and tooltips for the series.
   * @default undefined
   */
  readonly label?: React.ReactNode;
  /**
   * Optional icon rendered in legends and tooltips instead of the color swatch.
   * @default undefined
   */
  readonly icon?: React.ComponentType;
  /**
   * Unit suffix appended to rendered values when the payload does not provide one.
   * @default undefined
   */
  readonly unit?: string;
  /**
   * Shared numeric formatter used by helper content renderers when no Recharts tooltip formatter is supplied.
   * @default undefined
   */
  readonly formatter?: (value: number) => string;
  /**
   * Recharts stack identifier that consuming chart primitives can read from config.
   * @default undefined
   */
  readonly stackId?: string;
};

/** Readonly series metadata; color and theme are mutually exclusive. */
export type ChartConfig = Readonly<
  Record<
    string,
    ChartConfigItem
      & (
        | {readonly color?: string; readonly theme?: never}
        | {
            readonly color?: never;
            readonly theme: Readonly<Record<keyof typeof THEMES, string>>;
          }
      )
  >
>;

interface ChartContextProps {
  readonly config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart(): ChartContextProps {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

/** Native chart root props plus the actual Recharts responsive sizing contract. */
export interface ChartContainerProps
  extends
    Omit<React.ComponentPropsWithoutRef<"div">, "children" | "onResize">,
    Pick<
      ResponsiveContainerProps,
      "initialDimension" | "aspect" | "debounce" | "minHeight" | "minWidth" | "maxHeight" | "height" | "width" | "onResize" | "children"
    > {
  /**
   * Series configuration used to resolve labels, icons, and colors.
   */
  readonly config: ChartConfig;
  /**
   * Inline styles applied to the inner `ResponsiveContainer`.
   * @default undefined
   */
  readonly innerResponsiveContainerStyle?: ResponsiveContainerProps["style"];
}

/**
 * Provides responsive chart layout and series config context for Recharts content.
 *
 * @remarks
 * - Renders a wrapping `<div>` element
 * - Built on `recharts` `ResponsiveContainer`
 * - Injects CSS variables so legends and tooltips can share theme-aware colors
 * - `ref`, `id`, `className`, and native attributes belong to the outer chart div.
 *   The responsive implementation receives only sizing options and the existing
 *   caller-owned `innerResponsiveContainerStyle` compatibility passthrough.
 * - CSS scope preserves React's identifier identity, independently of native id.
 *   When combining separate SSR roots in one document, callers must assign a
 *   distinct React `identifierPrefix` to each server root and pass the same
 *   prefix to that root's hydrateRoot. Uncoordinated server roots can share useId
 *   values; this helper does not invent a global or random namespace for them.
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
      initialDimension = INITIAL_DIMENSION,
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
    }: Readonly<ChartContainerProps>,
    ref,
  ): React.JSX.Element => {
    const uniqueId = React.useId();
    const chartId = `chart-${encodeChartScope(uniqueId)}`;

    return (
      <ChartContext.Provider value={{config}}>
        <div
          {...props}
          ref={ref}
          id={id}
          data-slot='chart'
          data-chart={chartId}
          className={cn(styles.container, className)}>
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
  },
);

/** Scope and palette inputs for the generated chart stylesheet. */
export interface ChartStyleProps {
  /** Exact data-chart scope to target; escaped before inclusion in CSS. */
  readonly id: string;
  /** Palette and metadata; unsafe palette entries are omitted independently. */
  readonly config: ChartConfig;
}

/**
 * Emits theme-aware CSS variables for configured chart series colors.
 *
 * @remarks
 * - Renders a `<style>` element
 * - Built on the shared chart configuration contract
 * - Series keys must be ASCII letters, digits, underscores or hyphens.
 * - Colors accept hex/named colors and balanced CSS color/var functions, not
 *   declaration delimiters, comments, URLs, escapes or HTML. Invalid entries
 *   are omitted. Standard CSS whitespace is normalized to spaces. Selectors
 *   are escaped and quoted; theme scope remains `.dark`.
 *
 * @example
 * ```tsx
 * <ChartStyle id='chart-sales' config={config} />
 * ```
 *
 * @see {@link https://recharts.org | Recharts Docs}
 */
const ChartStyle = ({id, config}: Readonly<ChartStyleProps>): React.JSX.Element | null => {
  const rules = (["light", "dark"] as const)
    .map((theme) => {
      const declarations = Object.entries(config)
        .map(([key, itemConfig]) => {
          if (!/^[\w-]+$/u.test(key)) {
            return null;
          }
          const color = getSafeChartColor(itemConfig.theme?.[theme] ?? itemConfig.color);
          return color ? `  --color-${key}: ${color};` : null;
        })
        .filter((declaration) => declaration !== null);
      return declarations.length ? `${THEMES[theme]} [data-chart="${escapeChartSelector(id)}"] {\n${declarations.join("\n")}\n}` : null;
    })
    .filter((rule) => rule !== null);

  if (!rules.length) {
    return null;
  }

  return <style>{rules.join("\n")}</style>;
};

function encodeChartScope(id: string): string {
  // Fixed-width UTF-16 encoding is injective, including literal escape-like prefixes.
  let encoded = "";
  for (let index = 0; index < id.length; index++) {
    // eslint-disable-next-line unicorn/prefer-code-point -- Preserve every UTF-16 code unit, including lone surrogates.
    encoded += id.charCodeAt(index).toString(16).padStart(4, "0");
  }
  return encoded;
}

function escapeChartSelector(id: string): string {
  return id.replaceAll(/[^\w-]/gu, (character) => `\\${character.codePointAt(0)?.toString(16)} `);
}

function getSafeChartColor(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const color = value.replaceAll(/[\t\n\f\r ]+/gu, " ").trim();
  if ((HEX_COLOR_LENGTHS.has(color.length) && /^#[\da-f]+$/iu.test(color)) || /^[a-z]+$/iu.test(color)) {
    return color;
  }
  if (
    !/^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|var)\(/iu.test(color)
    || !/^[\w#%.,()+*/ -]+$/u.test(color)
    || /\/\*|\*\/|\b(?:url|expression)\s*\(/iu.test(color)
  ) {
    return undefined;
  }
  let depth = 0;
  for (const character of color) {
    if (character === "(") depth++;
    if (character === ")") depth--;
    if (depth < 0) return undefined;
  }
  return depth === 0 && color.endsWith(")") ? color : undefined;
}

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

/** Tooltip renderer props derived from Recharts 3 content and native div attributes. */
export type ChartTooltipContentProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  keyof React.ComponentProps<typeof RechartsPrimitive.Tooltip> | keyof DefaultTooltipContentProps
>
  & Omit<React.ComponentProps<typeof RechartsPrimitive.Tooltip>, keyof DefaultTooltipContentProps>
  & Omit<DefaultTooltipContentProps, "accessibilityLayer">
  & Partial<Pick<RechartsPrimitive.TooltipContentProps, "coordinate" | "activeIndex" | "accessibilityLayer">> & {
    /** Hides the heading, including a nested single-series heading. */
    readonly hideLabel?: boolean;
    /** Hides color swatches; explicit config icons remain available. */
    readonly hideIndicator?: boolean;
    /** Shape of the color swatch. @default "dot" */
    readonly indicator?: "line" | "dot" | "dashed";
    /** Direct or nested payload field identifying a config entry. */
    readonly nameKey?: string;
    /** Direct or nested payload field identifying the heading config entry. */
    readonly labelKey?: string;
  };

/**
 * Renders shared tooltip content for charts configured with {@link ChartContainer}.
 *
 * @remarks
 * - Renders a `<div>` element when active
 * - Built on `recharts` tooltip payloads and shared chart config context
 * - Honors `active`, `payload`, `label`, `labelFormatter`, `formatter`, `separator`,
 *   `className`, `labelClassName`, `color`, `nameKey`, and `labelKey`
 * - Name lookup prefers `nameKey`, then the series name. With no explicit
 *   nameKey, an unmatched name falls back to dataKey config metadata.
 * - The explicit formatter precedes a payload formatter, receives the full
 *   payload array, and can return a row node, a value/name tuple or null to hide
 *   a row. Config formatters/units apply when no row formatter supplies a value.
 * - Native DOM attributes and the ref target the tooltip div.
 * - Ref-capable content helpers must be instantiated: migrate the former
 *   `content={ChartTooltipContent}` pattern to `content={<ChartTooltipContent />}`
 *   or `content={(props) => <ChartTooltipContent {...props} />}`.
 * - Ignores `wrapperClassName`, `contentStyle`, `itemStyle`, `labelStyle`, and
 *   primitive positioning/animation/sorting props because this helper renders
 *   its own DOM structure. Accessibility-layer content uses a live status.
 *
 * @example
 * ```tsx
 * <ChartTooltip content={<ChartTooltipContent indicator='line' />} />
 * ```
 *
 * @see {@link https://recharts.org/en-US/api/Tooltip | Recharts Tooltip Docs}
 */
const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
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
      accessibilityLayer,
      children: _children,
      wrapperClassName: _wrapperClassName,
      contentStyle: _contentStyle,
      itemStyle: _itemStyle,
      labelStyle: _labelStyle,
      itemSorter: _itemSorter,
      allowEscapeViewBox: _allowEscapeViewBox,
      animationDuration: _animationDuration,
      animationEasing: _animationEasing,
      axisId: _axisId,
      content: _content,
      cursor: _cursor,
      defaultIndex: _defaultIndex,
      filterNull: _filterNull,
      includeHidden: _includeHidden,
      isAnimationActive: _isAnimationActive,
      offset: _offset,
      payloadUniqBy: _payloadUniqBy,
      portal: _portal,
      position: _position,
      reverseDirection: _reverseDirection,
      shared: _shared,
      trigger: _trigger,
      useTranslate3d: _useTranslate3d,
      wrapperStyle: _wrapperStyle,
      coordinate: _coordinate,
      activeIndex: _activeIndex,
      ...props
    }: Readonly<ChartTooltipContentProps>,
    ref,
  ): React.JSX.Element | null => {
    const {config} = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const item = payload.find((entry) => entry.type !== "none");
      if (!item) return null;
      const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      const value =
        !labelKey && (typeof label === "string" || typeof label === "number")
          ? typeof label === "string"
            ? (getConfigItem(config, label)?.label ?? label)
            : label
          : itemConfig?.label;

      if (labelFormatter) {
        return <div className={cn(styles.tooltipLabel, labelClassName)}>{labelFormatter(value, payload)}</div>;
      }

      if (value === null || value === undefined) {
        return null;
      }

      return <div className={cn(styles.tooltipLabel, labelClassName)}>{value}</div>;
    }, [config, hideLabel, label, labelClassName, labelFormatter, labelKey, payload]);

    const visiblePayload = payload?.filter((item) => item.type !== "none");
    if (!active || !payload?.length || !visiblePayload?.length) {
      return null;
    }

    const nestLabel = visiblePayload.length === 1 && indicator !== "dot";

    return (
      <div
        {...props}
        ref={ref}
        data-slot='chart-tooltip'
        role={props.role ?? (accessibilityLayer ? "status" : undefined)}
        aria-live={props["aria-live"] ?? (accessibilityLayer ? "polite" : undefined)}
        className={cn(styles.tooltip, className)}>
        {!nestLabel ? tooltipLabel : null}
        <div className={styles.tooltipBody}>
          {visiblePayload.map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
            const itemConfig =
              getPayloadConfigFromPayload(config, item, key)
              ?? (!nameKey ? getPayloadConfigFromPayload(config, item, `${item.dataKey ?? "value"}`) : undefined);
            const indicatorColor =
              getSafeChartColor(color)
              ?? getSafeChartColor(getRecordValue(item.payload, "fill"))
              ?? getSafeChartColor(item.color)
              ?? "transparent";
            // D4: runtime palette only; all indicator presentation lives in CSS.
            const indicatorStyle: React.CSSProperties & Record<"--ac-chart-indicator-background" | "--ac-chart-indicator-border", string> =
              {
                "--ac-chart-indicator-background": indicatorColor,
                "--ac-chart-indicator-border": indicatorColor,
              };

            const itemFormatter = formatter ?? item.formatter;
            const hasFormatter = typeof itemFormatter === "function" && item.value !== undefined && item.name !== undefined;
            const formatterResult = hasFormatter ? itemFormatter(item.value, item.name, item, index, payload) : undefined;
            if (hasFormatter && (formatterResult === null || formatterResult === undefined)) return null;
            const formattedEntry = isFormatterTuple(formatterResult) ? formatterResult : undefined;
            const resolvedName = formattedEntry ? formattedEntry[1] : (itemConfig?.label ?? item.name);
            const resolvedUnit = item.unit ?? itemConfig?.unit;
            const resolvedValue = formattedEntry
              ? formattedEntry[0]
              : item.value !== null && item.value !== undefined
                ? formatChartValue(item.value, itemConfig)
                : null;

            return (
              <div
                key={`${key}-${index}`}
                data-slot='chart-tooltip-item'
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
                          data-slot='chart-tooltip-indicator'
                          data-indicator={indicator}
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
  },
);

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

type LegendItemEventKey = Extract<keyof DefaultLegendContentProps, `on${string}`>;
type LegendRootAttributes = Omit<React.ComponentPropsWithoutRef<"div">, `on${string}`>;

/** Recharts item-event signatures, native non-event div attributes and config lookup options. */
export type ChartLegendContentProps = LegendRootAttributes
  & Omit<DefaultLegendContentProps, keyof React.ComponentPropsWithoutRef<"div"> | "layout" | "align" | "verticalAlign">
  & Pick<DefaultLegendContentProps, LegendItemEventKey>
  & Pick<
    RechartsPrimitive.LegendProps,
    | "layout"
    | "content"
    | "wrapperStyle"
    | "width"
    | "height"
    | "payloadUniqBy"
    | "onBBoxUpdate"
    | "portal"
    | "itemSorter"
    | "position"
    | "offset"
  > & {
    /** Replaces a configured icon with its series swatch. */
    readonly hideIcon?: boolean;
    /** Direct or nested payload field identifying a config entry. */
    readonly nameKey?: string;
    /** Content spacing only; outer legend positioning remains primitive-owned. @default "bottom" */
    readonly verticalAlign?: "top" | "bottom" | "middle";
    /** Accepted legacy container alignment; unused by the custom content layout. */
    readonly align?: "left" | "center" | "right";
  };

// Recharts also injects these internal dimensions into cloned legend content.
type InjectedLegendDimensions = {
  readonly chartWidth?: number;
  readonly chartHeight?: number;
  readonly margin?: unknown;
};

/**
 * Renders shared legend content for charts configured with {@link ChartContainer}.
 *
 * @remarks
 * - Renders a `<div>` element when legend payload exists
 * - Built on `recharts` legend payloads and shared chart config context
 * - Honors `payload`, `verticalAlign`, `className`, and the custom `hideIcon`
 *   and `nameKey` props, formatters, native non-event attributes and DOM refs.
 * - Only `onClick`, `onMouseEnter` and `onMouseLeave` are invoked per item with
 *   Recharts' entry/index/event arguments. All other primitive item-event props
 *   are accepted for content compatibility but consumed without invocation;
 *   they are never native root handlers. Attach native handlers to a parent
 *   element or ChartContainer instead.
 * - Items with an onClick handler use native, non-submit buttons for keyboard
 *   activation. Other items remain display-only divs.
 * - Migrate `content={ChartLegendContent}` to `content={<ChartLegendContent />}`
 *   or `content={(props) => <ChartLegendContent {...props} />}`; a forwardRef
 *   component object is not a Recharts content function or instantiated element.
 * - Text falls back from config label to payload value to a string/number dataKey.
 * - `middle` uses the same content spacing as `bottom`; positioning remains
 *   owned by the Recharts Legend primitive.
 * - Ignores Recharts presentational props such as `align`, `layout`, `iconSize`,
 *   `iconType` and `labelStyle` because it renders custom CSS Module markup.
 *   Container sizing, positioning, sorting and portal props remain owned by
 *   ChartLegend and are not forwarded to the content DOM.
 *
 * @example
 * ```tsx
 * <ChartLegend content={<ChartLegendContent />} />
 * ```
 *
 * @see {@link https://recharts.org/en-US/api/Legend | Recharts Legend Docs}
 */
const ChartLegendContent: React.ForwardRefExoticComponent<ChartLegendContentProps & React.RefAttributes<HTMLDivElement>> = React.forwardRef<
  HTMLDivElement,
  ChartLegendContentProps
>(
  (
    {
      className,
      hideIcon = false,
      nameKey,
      payload,
      verticalAlign = "bottom",
      formatter,
      onClick,
      onMouseEnter,
      onMouseLeave,
      align: _align,
      layout: _layout,
      iconSize: _iconSize,
      iconType: _iconType,
      inactiveColor: _inactiveColor,
      labelStyle: _labelStyle,
      children: _children,
      content: _content,
      wrapperStyle: _wrapperStyle,
      width: _width,
      height: _height,
      payloadUniqBy: _payloadUniqBy,
      onBBoxUpdate: _onBBoxUpdate,
      portal: _portal,
      itemSorter: _itemSorter,
      position: _position,
      offset: _offset,
      chartWidth: _chartWidth,
      chartHeight: _chartHeight,
      margin: _margin,
      ...props
    }: Readonly<ChartLegendContentProps & InjectedLegendDimensions>,
    ref,
  ): React.JSX.Element | null => {
    const {config} = useChart();

    const visiblePayload = payload?.filter((item) => item.type !== "none");
    if (!visiblePayload?.length) {
      return null;
    }

    return (
      <div
        {...getLegendRootAttributes(props)}
        ref={ref}
        data-slot='chart-legend'
        className={cn(styles.legend, verticalAlign === "top" ? styles.legendTop : styles.legendBottom, className)}>
        {visiblePayload.map((item, index) => {
          const key = `${nameKey ?? item.dataKey ?? "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const value = itemConfig?.label ?? item.value ?? formatLegendDataKey(item.dataKey);
          const itemFormatter = item.formatter ?? formatter;
          // D4: series color only, not inline authored presentation.
          const indicatorStyle: React.CSSProperties & Record<"--ac-chart-indicator-background", string> = {
            "--ac-chart-indicator-background": getSafeChartColor(item.color) ?? "transparent",
          };

          const mouseHandlers: Pick<React.HTMLAttributes<HTMLElement>, "onMouseEnter" | "onMouseLeave"> = {
            onMouseEnter: onMouseEnter ? (event) => onMouseEnter(item, index, event) : undefined,
            onMouseLeave: onMouseLeave ? (event) => onMouseLeave(item, index, event) : undefined,
          };
          const content = (
            <>
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  data-slot='chart-legend-indicator'
                  className={styles.legendColor}
                  style={indicatorStyle}
                />
              )}
              {itemFormatter ? itemFormatter(value, item, index) : value}
            </>
          );

          return onClick ? (
            <button
              key={`${key}-${index}`}
              type='button'
              data-slot='chart-legend-item'
              {...mouseHandlers}
              onClick={(event) => onClick(item, index, event)}
              className={cn(styles.legendItem, styles.legendButton)}>
              {content}
            </button>
          ) : (
            <div
              key={`${key}-${index}`}
              data-slot='chart-legend-item'
              {...mouseHandlers}
              className={styles.legendItem}>
              {content}
            </div>
          );
        })}
      </div>
    );
  },
);

function getLegendRootAttributes(
  props: Readonly<LegendRootAttributes & Pick<DefaultLegendContentProps, LegendItemEventKey>>,
): LegendRootAttributes {
  const attributes = {...props};
  for (const key of Object.keys(attributes)) {
    if (key.startsWith("on")) {
      Reflect.deleteProperty(attributes, key);
    }
  }
  return attributes;
}

function isFormatterTuple(value: React.ReactNode): value is readonly [React.ReactNode, React.ReactNode] {
  return Array.isArray(value) && value.length === 2;
}

function formatChartValue(value: TooltipValueType, itemConfig: ChartConfig[string] | undefined): string {
  if (typeof value === "number") {
    return itemConfig?.formatter ? itemConfig.formatter(value) : value.toLocaleString();
  }

  return typeof value === "string" ? value : value.map((entry) => formatChartValue(entry, itemConfig)).join(" ~ ");
}

// eslint-disable-next-line sonarjs/function-return-type
function formatLegendDataKey(dataKey: LegendPayload["dataKey"]): string | null {
  return typeof dataKey === "number" || typeof dataKey === "string" ? String(dataKey) : null;
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string): ChartConfig[string] | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const directKey = getRecordValue(payload, key);
  const nestedKey = getRecordValue(getRecordValue(payload, "payload"), key);
  const configLabelKey = typeof directKey === "string" ? directKey : typeof nestedKey === "string" ? nestedKey : key;
  return getConfigItem(config, configLabelKey) ?? getConfigItem(config, key);
}

function getRecordValue(value: unknown, key: string): unknown {
  return isRecord(value) && Object.hasOwn(value, key) ? value[key] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getConfigItem(config: ChartConfig, key: string): ChartConfig[string] | undefined {
  return Object.hasOwn(config, key) ? config[key] : undefined;
}

ChartContainer.displayName = "ChartContainer";
ChartStyle.displayName = "ChartStyle";
ChartTooltipContent.displayName = "ChartTooltipContent";
ChartLegendContent.displayName = "ChartLegendContent";

export {ChartContainer, ChartLegend, ChartLegendContent, ChartStyle, ChartTooltip, ChartTooltipContent};

// ---------------------------------------------------------------------------
// Recharts primitive re-exports (identity and typing remain dependency-owned)
// Consumers should import chart primitives from "@arolariu/components/chart"
// instead of importing directly from "recharts".
// ---------------------------------------------------------------------------

// -- Chart containers -------------------------------------------------------
/** @see {@link https://recharts.github.io/en-US/api/AreaChart | AreaChart API} */
export const {AreaChart} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/BarChart | BarChart API} */
export const {BarChart} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/ComposedChart | ComposedChart API} */
export const {ComposedChart} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/FunnelChart | FunnelChart API} */
export const {FunnelChart} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/LineChart | LineChart API} */
export const {LineChart} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/PieChart | PieChart API} */
export const {PieChart} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/RadarChart | RadarChart API} */
export const {RadarChart} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/RadialBarChart | RadialBarChart API} */
export const {RadialBarChart} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/ScatterChart | ScatterChart API} */
export const {ScatterChart} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/Sankey | Sankey API} */
export const {Sankey} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/SunburstChart | SunburstChart API} */
export const {SunburstChart} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/Treemap | Treemap API} */
export const {Treemap} = RechartsPrimitive;

// -- Series elements --------------------------------------------------------
/** @see {@link https://recharts.github.io/en-US/api/Area | Area API} */
export const {Area} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/Bar | Bar API} */
export const {Bar} = RechartsPrimitive;
/**
 * Groups stacked bars and configures shared stack properties such as radius.
 * @since recharts 3.6
 * @see {@link https://recharts.github.io/en-US/guide/roundedBars | BarStack Guide}
 */
export const {BarStack} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/Funnel | Funnel API} */
export const {Funnel} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/Line | Line API} */
export const {Line} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/Pie | Pie API} */
export const {Pie} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/Radar | Radar API} */
export const {Radar} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/RadialBar | RadialBar API} */
export const {RadialBar} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/Scatter | Scatter API} */
export const {Scatter} = RechartsPrimitive;

// -- Axis & grid ------------------------------------------------------------
/** @see {@link https://recharts.github.io/en-US/api/CartesianGrid | CartesianGrid API} */
export const {CartesianGrid} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/PolarAngleAxis | PolarAngleAxis API} */
export const {PolarAngleAxis} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/PolarGrid | PolarGrid API} */
export const {PolarGrid} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/PolarRadiusAxis | PolarRadiusAxis API} */
export const {PolarRadiusAxis} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/XAxis | XAxis API} – supports `type: "auto"` since v3.7. */
export const {XAxis} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/YAxis | YAxis API} – supports `type: "auto"` since v3.7. */
export const {YAxis} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/ZAxis | ZAxis API} */
export const {ZAxis} = RechartsPrimitive;

// -- Annotations & overlays ------------------------------------------------
/** @see {@link https://recharts.github.io/en-US/api/Brush | Brush API} */
export const {Brush} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/ErrorBar | ErrorBar API} */
export const {ErrorBar} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/Label | Label API} */
export const {Label: RechartsLabel} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/LabelList | LabelList API} */
export const {LabelList} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/ReferenceArea | ReferenceArea API} */
export const {ReferenceArea} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/ReferenceDot | ReferenceDot API} */
export const {ReferenceDot} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/ReferenceLine | ReferenceLine API} */
export const {ReferenceLine} = RechartsPrimitive;

// -- Layout -----------------------------------------------------------------
/**
 * Wraps a chart in a responsive container. Since recharts 3.3+, you can
 * alternatively use the `responsive` prop directly on chart containers.
 * @see {@link https://recharts.github.io/en-US/api/ResponsiveContainer | ResponsiveContainer API}
 */
export const {ResponsiveContainer} = RechartsPrimitive;
/** @see {@link https://recharts.github.io/en-US/api/Customized | Customized API} */
export const {Customized} = RechartsPrimitive;

// -- Shapes -----------------------------------------------------------------
/**
 * @deprecated Since recharts 3.7. Use the `shape` prop on chart series elements instead.
 * @see {@link https://recharts.github.io/en-US/api/Cell | Cell API}
 */
// eslint-disable-next-line sonarjs/deprecation
export const {Cell} = RechartsPrimitive;
export const {Cross} = RechartsPrimitive;
export const {Curve} = RechartsPrimitive;
export const {Dot} = RechartsPrimitive;
export const {Polygon} = RechartsPrimitive;
export const {Rectangle} = RechartsPrimitive;
export const {Sector} = RechartsPrimitive;
export const {Symbols} = RechartsPrimitive;
export const {Trapezoid} = RechartsPrimitive;

// -- Z-index (v3.4+) -------------------------------------------------------
/** @since recharts 3.4 @see {@link https://recharts.github.io/en-US/guide/zIndex | Z-Index Guide} */
export const {ZIndexLayer} = RechartsPrimitive;
/** Default z-index ordering constants. @since recharts 3.4 */
export const {DefaultZIndexes} = RechartsPrimitive;

// -- Hooks (v3+) ------------------------------------------------------------
/** Returns the current chart width in pixels. */
export const {useChartWidth} = RechartsPrimitive;
/** Returns the current chart height in pixels. */
export const {useChartHeight} = RechartsPrimitive;
/** Returns the chart offset (margins, axes). */
export const {useOffset} = RechartsPrimitive;
/** Returns the plot area dimensions. */
export const {usePlotArea} = RechartsPrimitive;
/** Returns the chart margin. */
export const {useMargin} = RechartsPrimitive;
/** Returns whether the tooltip is currently active. @since recharts 3.7 */
export const {useIsTooltipActive} = RechartsPrimitive;
/** Returns the active tooltip coordinate. @since recharts 3.7 */
export const {useActiveTooltipCoordinate} = RechartsPrimitive;
/** Returns the active tooltip data points. */
export const {useActiveTooltipDataPoints} = RechartsPrimitive;
/** Returns the active tooltip label. */
export const {useActiveTooltipLabel} = RechartsPrimitive;
/** Returns the current X-axis domain. */
export const {useXAxisDomain} = RechartsPrimitive;
/** Returns the current Y-axis domain. */
export const {useYAxisDomain} = RechartsPrimitive;

// -- Type re-exports --------------------------------------------------------
export type {DefaultLegendContentProps, DefaultTooltipContentProps, TooltipValueType};
