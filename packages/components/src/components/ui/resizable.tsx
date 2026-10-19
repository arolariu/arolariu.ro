"use client";

/* eslint-disable react/jsx-handler-names */

import {GripVertical} from "lucide-react";
import * as React from "react";
import type {GroupImperativeHandle, PanelImperativeHandle} from "react-resizable-panels";
import * as ResizablePrimitive from "react-resizable-panels";

import {cn} from "@/lib/utilities";
import {useMergedRefs} from "@/hooks/useMergedRefs";

import styles from "./resizable.module.css";

export type {GroupImperativeHandle, PanelImperativeHandle};

/**
 * Props for the {@link ResizablePanelGroup} component.
 */
export type ResizablePanelGroupProps = ResizablePrimitive.GroupProps;

/**
 * Props for the {@link ResizablePanel} component.
 */
export type ResizablePanelProps = ResizablePrimitive.PanelProps;

/**
 * Props for the {@link ResizableHandle} component.
 *
 * @see {@link https://github.com/bvaughn/react-resizable-panels | react-resizable-panels docs}
 */
export interface ResizableHandleProps extends ResizablePrimitive.SeparatorProps {
  /**
   * Renders a visual drag grip inside the resize handle to indicate that adjacent panels can be resized.
   *
   * @default false
   * @see {@link https://github.com/bvaughn/react-resizable-panels | react-resizable-panels docs}
   */
  withHandle?: boolean;
  /**
   * Renders the native decrease/increase step buttons after the separator: the single-pointer alternative to dragging
   * (WCAG 2.5.7). They add two tab stops per handle. Pass `false` only when the application provides another
   * single-pointer way to resize these panels; the separator's keyboard support does not replace it.
   *
   * @default true
   */
  readonly withControls?: boolean;
  /** Localizable native single-click alternative to dragging. @default "Decrease previous panel" */
  readonly decreaseLabel?: string;
  /** Localizable native single-click alternative to dragging. @default "Increase previous panel" */
  readonly increaseLabel?: string;
  /** Percentage-point step for the click controls, constrained by the primitive. @default 10 */
  readonly resizeStep?: number;
}

interface ResizeContextValue {
  readonly apiRef: React.RefObject<GroupImperativeHandle | null>;
  readonly disabled: boolean;
  readonly orientation: ResizablePanelGroupProps["orientation"];
  readonly panels: ReadonlyMap<HTMLElement, RegisteredPanel>;
  readonly layout: Readonly<Record<string, number>>;
  readonly register: (element: HTMLElement, panel: RegisteredPanel) => () => void;
}
const ResizeContext = React.createContext<ResizeContextValue | null>(null);

interface RegisteredPanel {
  readonly apiRef: React.RefObject<PanelImperativeHandle | null>;
  readonly props: Pick<ResizablePanelProps, "disabled" | "collapsible" | "collapsedSize" | "minSize" | "maxSize">;
}
type SizeInterval = readonly [minimum: number, maximum: number];
interface ResizeTargets {
  readonly previous?: RegisteredPanel;
  readonly collapsedSize?: number;
  readonly decrease?: number;
  readonly increase?: number;
}

const emptyTargets: ResizeTargets = {};
const sizeUnits = ["rem", "px", "em", "vh", "vw", "%"] as const;

function sizeUnit(value: number | string): string {
  if (typeof value === "number") return "px";
  const text = value.trim();
  return sizeUnits.find((unit) => text.endsWith(unit)) ?? (Number.isFinite(Number(text)) ? "%" : "");
}

function pixelPercentage(pixels: number, axisSize: number): number {
  return Math.round((pixels / axisSize) * 100_000) / 1000;
}

/** Resolve the SDK's documented size units against its available panel axis, rounded like the SDK. */
function percentageSize(value: number | string, element: HTMLElement, axisSize: number): number {
  const amount = typeof value === "number" ? value : Number.parseFloat(value);
  switch (sizeUnit(value)) {
    case "%": {
      return Math.round(amount * 1000) / 1000;
    }
    case "px": {
      return pixelPercentage(amount, axisSize);
    }
    case "em": {
      return pixelPercentage(amount * Number.parseFloat(getComputedStyle(element).fontSize), axisSize);
    }
    case "rem": {
      return pixelPercentage(amount * Number.parseFloat(getComputedStyle(element.ownerDocument.documentElement).fontSize), axisSize);
    }
    case "vh": {
      return pixelPercentage((amount * (element.ownerDocument.defaultView?.innerHeight ?? 0)) / 100, axisSize);
    }
    case "vw": {
      return pixelPercentage((amount * (element.ownerDocument.defaultView?.innerWidth ?? 0)) / 100, axisSize);
    }
    default: {
      return Number.NaN;
    }
  }
}

function panelIntervals(panel: RegisteredPanel, element: HTMLElement, axisSize: number): SizeInterval[] {
  const {minSize = "0%", maxSize = "100%", collapsedSize = "0%", collapsible} = panel.props;
  const intervals: SizeInterval[] = [[percentageSize(minSize, element, axisSize), percentageSize(maxSize, element, axisSize)]];
  if (collapsible) {
    const collapsed = percentageSize(collapsedSize, element, axisSize);
    intervals.push([collapsed, collapsed]);
  }
  return intervals;
}

/** Select a legal adjacent-pair value, stepping across the non-resizable collapsed/minimum gap. */
function nextPanelSize(intervals: readonly SizeInterval[], current: number, direction: -1 | 1, step: number): number | undefined {
  const ordered = intervals.toSorted((first, second) => (direction === 1 ? first[0] - second[0] : second[1] - first[1]));
  for (const [minimum, maximum] of ordered) {
    const target = Math.max(minimum, Math.min(maximum, current + direction * step));
    if (direction * (target - current) > 0.0005) return Math.round(target * 1000) / 1000;
  }
  return undefined;
}

function adjacentPanelElements(separator: HTMLDivElement): readonly [HTMLElement, HTMLElement] | undefined {
  let before = separator.previousElementSibling;
  let after = separator.nextElementSibling;
  while (before && !before.hasAttribute("data-panel")) before = before.previousElementSibling;
  while (after && !after.hasAttribute("data-panel")) after = after.nextElementSibling;
  return before instanceof HTMLElement && after instanceof HTMLElement ? [before, after] : undefined;
}

function isEnabledPanel(element: HTMLElement, panel: RegisteredPanel | undefined): panel is RegisteredPanel {
  return panel !== undefined && !panel.props.disabled && !element.hasAttribute("data-disabled");
}

function adjacentSizeIntervals(
  before: HTMLElement,
  after: HTMLElement,
  previousPanel: RegisteredPanel,
  nextPanel: RegisteredPanel,
  axisSize: number,
  totalSize: number,
): SizeInterval[] {
  const intervals: SizeInterval[] = [];
  for (const [previousMin, previousMax] of panelIntervals(previousPanel, before, axisSize)) {
    for (const [nextMin, nextMax] of panelIntervals(nextPanel, after, axisSize)) {
      const minimum = Math.max(previousMin, totalSize - nextMax);
      const maximum = Math.min(previousMax, totalSize - nextMin);
      if (Number.isFinite(minimum) && Number.isFinite(maximum) && minimum <= maximum) intervals.push([minimum, maximum]);
    }
  }
  return intervals;
}

function resolveResizeTargets(
  separator: HTMLDivElement | null,
  context: ResizeContextValue | null,
  resizeStep: number,
  disabled: boolean,
  layout: Readonly<Record<string, number>>,
): ResizeTargets {
  if (!separator || !context || disabled) return emptyTargets;
  const elements = adjacentPanelElements(separator);
  if (!elements) return emptyTargets;
  const [before, after] = elements;
  const previousPanel = context.panels.get(before);
  const nextPanel = context.panels.get(after);
  // Imperative SDK methods intentionally override disabled constraints. Never
  // call them for a locked pair, or request movement outside this pair.
  if (!isEnabledPanel(before, previousPanel) || !isEnabledPanel(after, nextPanel)) return emptyTargets;
  const previous = layout[before.id];
  const next = layout[after.id];
  if (previous === undefined || next === undefined) return emptyTargets;
  // The SDK's available axis is the sum of panel sizes, excluding separators.
  const axisSize = context.panels
    .keys()
    .reduce((total, panel) => total + (context.orientation === "vertical" ? panel.offsetHeight : panel.offsetWidth), 0);
  if (axisSize <= 0) return emptyTargets;
  const intervals = adjacentSizeIntervals(before, after, previousPanel, nextPanel, axisSize, previous + next);
  return {
    previous: previousPanel,
    collapsedSize: previousPanel.props.collapsible
      ? percentageSize(previousPanel.props.collapsedSize ?? "0%", before, axisSize)
      : undefined,
    decrease: nextPanelSize(intervals, previous, -1, resizeStep),
    increase: nextPanelSize(intervals, previous, 1, resizeStep),
  };
}

function sameResizeTargets(first: ResizeTargets, second: ResizeTargets): boolean {
  return (
    first.previous === second.previous
    && Object.is(first.collapsedSize, second.collapsedSize)
    && Object.is(first.decrease, second.decrease)
    && Object.is(first.increase, second.increase)
  );
}

/** A per-handle native geometry snapshot; React owns subscription updates, not an effect-driven state copy. */
function createResizeTargetStore(
  separator: HTMLDivElement | null,
  context: ResizeContextValue | null,
  resizeStep: number,
  disabled: boolean,
): {readonly snapshot: () => ResizeTargets; readonly subscribe: (notify: () => void) => () => void} {
  let previous = emptyTargets;
  return {
    snapshot(): ResizeTargets {
      const next = resolveResizeTargets(separator, context, resizeStep, disabled, context?.layout ?? {});
      if (!sameResizeTargets(previous, next)) previous = next;
      return previous;
    },
    subscribe(notify: () => void): () => void {
      let active = true;
      const observer = new ResizeObserver(() => {
        if (active) notify();
      });
      const group = separator?.parentElement;
      if (group) observer.observe(group);
      return (): void => {
        active = false;
        observer.disconnect();
      };
    },
  };
}

function serverResizeTargets(): ResizeTargets {
  return emptyTargets;
}

/** Handles without step controls neither observe geometry nor read layout while rendering. */
const unsubscribeNothing = (): void => undefined;
const inertResizeTargetStore: ReturnType<typeof createResizeTargetStore> = {
  snapshot: serverResizeTargets,
  subscribe: (): (() => void) => unsubscribeNothing,
};

/**
 * Wraps `react-resizable-panels` panel groups with shared styles.
 *
 * @remarks
 * - Third-party wrapper component (v4 API: `Group` with `orientation` prop)
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Use `elementRef` for the DOM element and `groupRef` for the v4 imperative layout API.
 * - The primitive owns inline flex direction; separator ARIA orientation is perpendicular to this group.
 *
 * @example
 * ```tsx
 * <ResizablePanelGroup orientation='horizontal'>...</ResizablePanelGroup>
 * ```
 *
 * @see {@link ResizablePanelGroupProps} for available props
 * @see {@link https://github.com/bvaughn/react-resizable-panels | react-resizable-panels docs}
 */
function ResizablePanelGroup({
  className,
  groupRef,
  disabled = false,
  orientation = "horizontal",
  onLayoutChange,
  ...props
}: Readonly<ResizablePanelGroupProps>): React.JSX.Element {
  const apiRef = React.useRef<GroupImperativeHandle>(null);
  const mergedRef = useMergedRefs(apiRef, groupRef);
  const [panels, setPanels] = React.useState<ReadonlyMap<HTMLElement, RegisteredPanel>>(() => new Map());
  const [layout, setLayout] = React.useState<Readonly<Record<string, number>>>({});
  const register = React.useCallback((element: HTMLElement, panel: RegisteredPanel): (() => void) => {
    setPanels((previous) => new Map(previous).set(element, panel));
    return (): void => {
      setPanels((previous) => {
        if (previous.get(element) !== panel) return previous;
        const next = new Map(previous);
        next.delete(element);
        return next;
      });
    };
  }, []);
  const handleLayoutChange = React.useCallback<NonNullable<ResizablePanelGroupProps["onLayoutChange"]>>(
    (next) => {
      setLayout(next);
      onLayoutChange?.(next);
    },
    [onLayoutChange],
  );
  return (
    <ResizeContext.Provider value={{apiRef, disabled, orientation, panels, layout, register}}>
      <ResizablePrimitive.Group
        className={cn(styles.group, className)}
        groupRef={mergedRef}
        disabled={disabled}
        orientation={orientation}
        onLayoutChange={handleLayoutChange}
        {...props}
      />
    </ResizeContext.Provider>
  );
}

/**
 * Composes the native resizable panel and registers its real imperative API for adjacent click controls.
 *
 * @remarks
 * - Third-party wrapper component
 * - Styling is applied by parent panel group and handles
 * - Use `elementRef` for the DOM element and `panelRef` for the v4 imperative sizing API.
 * - Numeric sizes represent pixels; use percentage strings such as `"50%"` for relative sizes.
 *
 * @example
 * ```tsx
 * <ResizablePanel defaultSize="50%">Content</ResizablePanel>
 * ```
 *
 * @see {@link ResizablePanelProps} for available props
 * @see {@link https://github.com/bvaughn/react-resizable-panels | react-resizable-panels docs}
 */
function ResizablePanel({
  elementRef,
  panelRef,
  disabled,
  collapsible,
  collapsedSize,
  minSize,
  maxSize,
  ...props
}: Readonly<ResizablePanelProps>): React.JSX.Element {
  const context = React.useContext(ResizeContext);
  const register = context?.register;
  const internalElementRef = React.useRef<HTMLDivElement>(null);
  const apiRef = React.useRef<PanelImperativeHandle>(null);
  const mergedElementRef = useMergedRefs(internalElementRef, elementRef);
  const mergedPanelRef = useMergedRefs(apiRef, panelRef);
  React.useLayoutEffect(() => {
    if (!internalElementRef.current || !register) return;
    return register(internalElementRef.current, {apiRef, props: {disabled, collapsible, collapsedSize, minSize, maxSize}});
  }, [register, disabled, collapsible, collapsedSize, minSize, maxSize]);
  return (
    <ResizablePrimitive.Panel
      elementRef={mergedElementRef}
      panelRef={mergedPanelRef}
      disabled={disabled}
      collapsible={collapsible}
      collapsedSize={collapsedSize}
      minSize={minSize}
      maxSize={maxSize}
      {...props}
    />
  );
}

/**
 * Renders a draggable resize handle between resizable panels.
 *
 * @remarks
 * - Third-party wrapper component (v4 API: `Separator`)
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Vertical groups emit a horizontal separator; the stylesheet rotates only the optional visual grip.
 * - `elementRef`, consumer children and primitive keyboard/pointer handlers are preserved.
 * - By default renders native step buttons right after the separator — the single-pointer alternative to dragging
 *   (WCAG 2.5.7) — adding two tab stops per handle: `data-slot="resizable-controls"` wraps
 *   `data-slot="resizable-decrease"` and `data-slot="resizable-increase"`. `withControls={false}` omits them; supply
 *   another single-pointer resize alternative when you do.
 * - The step buttons sit at least 11px clear of the 1px separator line, outside the primitive's widened pointer hit area
 *   (10px fine / 20px coarse by default, centred on the line), so pressing them never starts a drag. Keep that clearance
 *   through the data-slot hooks if you widen the separator or raise the group's `resizeTargetMinimumSize` above 22px.
 * - The controls container carries the primitive's `data-resize-preview` marker so it is left out of separator hit
 *   regions; scope any `[data-resize-preview]` styling to the primitive's own preview overlays.
 *
 * @example
 * ```tsx
 * <ResizableHandle withHandle />
 * <ResizableHandle withControls={false} /> // only alongside another single-pointer resize alternative
 * ```
 *
 * @see {@link ResizableHandleProps} for available props
 * @see {@link https://github.com/bvaughn/react-resizable-panels | react-resizable-panels docs}
 */
function ResizableHandle({
  withHandle = false,
  withControls = true,
  className,
  children,
  elementRef,
  decreaseLabel = "Decrease previous panel",
  increaseLabel = "Increase previous panel",
  resizeStep = 10,
  ...props
}: Readonly<ResizableHandleProps>): React.JSX.Element {
  if (!Number.isFinite(resizeStep) || resizeStep <= 0 || resizeStep > 100) throw new RangeError("resizeStep must be in (0, 100].");
  const context = React.useContext(ResizeContext);
  const [separator, setSeparator] = React.useState<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(setSeparator, elementRef);
  const disabled = Boolean(props.disabled || context?.disabled);
  const store = React.useMemo(
    () => (withControls ? createResizeTargetStore(separator, context, resizeStep, disabled) : inertResizeTargetStore),
    [withControls, separator, context, resizeStep, disabled],
  );
  const targets = React.useSyncExternalStore(store.subscribe, store.snapshot, serverResizeTargets);
  const resize = (direction: -1 | 1): void => {
    // Re-read real layout/disabled constraints rather than trusting a stale UI snapshot.
    const layout = context?.apiRef.current?.getLayout();
    if (!layout) return;
    const current = resolveResizeTargets(separator, context, resizeStep, disabled, layout);
    const target = direction === -1 ? current.decrease : current.increase;
    const panel = current.previous?.apiRef.current;
    if (!panel || target === undefined) return;
    if (current.collapsedSize === target) panel.collapse();
    else panel.resize(`${target}%`);
  };
  return (
    <>
      <ResizablePrimitive.Separator
        elementRef={mergedRef}
        className={cn(styles.handle, className)}
        aria-label='Resize panels'
        {...props}>
        {Boolean(withHandle) && (
          <div className={styles.handleGrip}>
            <GripVertical
              aria-hidden='true'
              className={styles.handleGripIcon}
            />
          </div>
        )}
        {children}
      </ResizablePrimitive.Separator>
      {withControls ? (
        <div
          // react-resizable-panels builds pointer hit regions from the Group's element children, skipping only
          // `[data-resize-preview]` (its own preview-overlay marker; v4.14.4 calculateHitRegions). Unmarked, this 0×0
          // container counts as interleaved static content and adds a separator-less region that wins separator
          // presses: no focus, no `active` state, no double-click reset. Guarded in resizable.test.tsx by "forwards
          // $orientation drag updates…" and "restores the default sizes on a %s separator double-click…".
          data-resize-preview
          data-slot='resizable-controls'
          className={styles.resizeControls}
          data-orientation={context?.orientation}>
          <button
            type='button'
            data-slot='resizable-decrease'
            className={styles.resizeDecrease}
            disabled={disabled || targets.decrease === undefined}
            aria-label={decreaseLabel}
            onClick={() => resize(-1)}>
            −
          </button>
          <button
            type='button'
            data-slot='resizable-increase'
            className={styles.resizeIncrease}
            disabled={disabled || targets.increase === undefined}
            aria-label={increaseLabel}
            onClick={() => resize(1)}>
            +
          </button>
        </div>
      ) : null}
    </>
  );
}

ResizablePanelGroup.displayName = "ResizablePanelGroup";
ResizablePanel.displayName = "ResizablePanel";
ResizableHandle.displayName = "ResizableHandle";

export {ResizableHandle, ResizablePanel, ResizablePanelGroup};
