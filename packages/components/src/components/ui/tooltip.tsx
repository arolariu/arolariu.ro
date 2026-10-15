"use client";

import {Tooltip as BaseTooltip} from "@base-ui/react/tooltip";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./tooltip.module.css";

/** Shared primitive timing options; use Provider.delay or Trigger.delay. */
export type TooltipProviderProps = Readonly<React.ComponentProps<typeof BaseTooltip.Provider>>;

/** SDK-owned generic payload/root options. */
export type TooltipProps<Payload = unknown> = Readonly<BaseTooltip.Root.Props<Payload>>;

interface TooltipAriaContextValue {
  readonly popupId: string;
  readonly descriptionId: string | undefined;
  readonly disabled: boolean;
  readonly register: (owner: string, id: string | null) => void;
}

const TooltipAriaContext = React.createContext<TooltipAriaContextValue | null>(null);

/** Primitive trigger options and React 19 composed-element ref. */
export type TooltipTriggerProps<Payload = unknown> = Readonly<
  Omit<BaseTooltip.Trigger.Props<Payload>, "ref"> & React.RefAttributes<HTMLElement>
>;

/** Popup semantics plus explicit positioning/portal options; `side=top`, `sideOffset=4`. */
export type TooltipContentProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseTooltip.Popup>
    & Pick<
      React.ComponentPropsWithRef<typeof BaseTooltip.Positioner>,
      | "side"
      | "align"
      | "sideOffset"
      | "alignOffset"
      | "anchor"
      | "positionMethod"
      | "collisionBoundary"
      | "collisionPadding"
      | "collisionAvoidance"
      | "sticky"
      | "arrowPadding"
      | "disableAnchorTracking"
    >
    & Pick<React.ComponentPropsWithRef<typeof BaseTooltip.Portal>, "keepMounted" | "container"> & {
      /** Render the default decorative arrow. Set false when composing a custom TooltipArrow. @default true */
      showArrow?: boolean;
    }
>;

/** Base UI arrow options, including primitive-owned render state and a forwarded DOM ref. */
export type TooltipArrowProps = Readonly<React.ComponentPropsWithRef<typeof BaseTooltip.Arrow>>;

/**
 * Groups tooltips with Base UI's shared delays and instant-opening window.
 *
 * @remarks
 * - Renders no DOM element and delegates shared delay/group timing to Base UI
 * - Built on {@link https://base-ui.com/react/components/tooltip | Base UI Tooltip}
 * - Native Provider/Trigger `delay` owns timing
 * - Styling via CSS Modules with `--ac-*` custom properties through descendant components
 *
 * @example Basic usage
 * ```tsx
 * <TooltipProvider>
 *   <Tooltip>
 *     <TooltipTrigger>Hover</TooltipTrigger>
 *     <TooltipContent>Details</TooltipContent>
 *   </Tooltip>
 * </TooltipProvider>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/tooltip | Base UI Documentation}
 */
function TooltipProvider(props: Readonly<TooltipProvider.Props>): React.ReactElement {
  return <BaseTooltip.Provider {...props} />;
}
TooltipProvider.displayName = "TooltipProvider";

/**
 * Coordinates tooltip timing, open state, and accessibility semantics.
 *
 * @remarks
 * - Renders no DOM element by default and coordinates descendant tooltip parts
 * - Built on {@link https://base-ui.com/react/components/tooltip | Base UI Tooltip}
 * - Supports composition through descendant `render` props
 * - Adds subtree-local ARIA registration because Base UI 1.9 does not provide Tooltip role/description wiring
 * - SDK state, payloads, cancellation, delays and lifecycle callbacks remain primitive-owned
 * - Automatic descriptions require wrapper Trigger/Content parts beneath this root (including portals)
 * - Detached handle triggers retain SDK behavior but need caller-owned description IDs
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger>Hover</TooltipTrigger>
 *   <TooltipContent>Details</TooltipContent>
 * </Tooltip>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/tooltip | Base UI Documentation}
 */
function Tooltip<Payload = unknown>(props: Readonly<Tooltip.Props<Payload>>): React.ReactElement {
  const {disabled = false} = props;
  const popupId = `ac-tooltip-${React.useId()}`;
  const [descriptions, setDescriptions] = React.useState<ReadonlyMap<string, string>>(() => new Map());
  const register = React.useCallback((owner: string, id: string | null): void => {
    setDescriptions((current) => {
      if (id === null ? !current.has(owner) : current.get(owner) === id) return current;
      const next = new Map(current);
      if (id === null) next.delete(owner);
      else next.set(owner, id);
      return next;
    });
  }, []);
  const [descriptionId] = descriptions.values();
  const aria = React.useMemo<TooltipAriaContextValue>(
    () => ({popupId, descriptionId, disabled, register}),
    [popupId, descriptionId, disabled, register],
  );
  return (
    <TooltipAriaContext.Provider value={aria}>
      <BaseTooltip.Root {...props} />
    </TooltipAriaContext.Provider>
  );
}
Tooltip.displayName = "Tooltip";

/**
 * Anchors tooltip behavior to an interactive trigger element.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/tooltip | Base UI Tooltip}
 * - Supports the `render` prop for element composition
 * - Merges existing description IDREFs with the committed open tooltip ID; closed/disabled parts add none
 * - Custom render targets must forward the supplied DOM props/ref without overriding the merged IDREFs
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <TooltipTrigger>Hover</TooltipTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/tooltip | Base UI Documentation}
 */
function TooltipTrigger<Payload = unknown>(props: Readonly<TooltipTrigger.Props<Payload>>): React.ReactElement {
  const {ref, children, className, delay, render, disabled, ...otherProps} = props;
  const primitiveRef = React.useCallback(
    (element: HTMLElement | null): ReturnType<React.RefCallback<HTMLElement>> => {
      if (typeof ref === "function") return ref(element);
      if (ref) ref.current = element;
      return undefined;
    },
    [ref],
  );

  return (
    <BaseTooltip.Trigger
      className={typeof className === "function" ? (state) => cn(styles.trigger, className(state)) : cn(styles.trigger, className)}
      delay={delay}
      disabled={disabled}
      render={(elementProps, state) => (
        <TooltipTriggerSurface
          elementProps={elementProps}
          state={state}
          render={render}
          disabled={disabled ?? false}
        />
      )}
      {...otherProps}
      ref={primitiveRef}>
      {children}
    </BaseTooltip.Trigger>
  );
}
TooltipTrigger.displayName = "TooltipTrigger";

type TooltipTriggerRenderFunction = Exclude<BaseTooltip.Trigger.Props["render"], React.ReactElement | undefined>;
type TooltipPopupRenderFunction = Exclude<BaseTooltip.Popup.Props["render"], React.ReactElement | undefined>;

interface TooltipSemanticProps {
  readonly id?: unknown;
  readonly role?: unknown;
  readonly "aria-describedby"?: unknown;
}

function semanticElement(element: React.ReactElement): React.ReactElement<TooltipSemanticProps> {
  // eslint-disable-next-line react-x/no-children-to-array -- normalize supported lazy element boundaries through public React APIs.
  const [resolved] = React.Children.toArray(element);
  if (!React.isValidElement<TooltipSemanticProps>(resolved)) throw new TypeError("Tooltip render must resolve to a React element.");
  return resolved;
}

function descriptionTokens(...values: readonly unknown[]): string | undefined {
  const tokens = values.flatMap((value) => (typeof value === "string" ? value.split(/\s+/u).filter(Boolean) : []));
  if (tokens.length > 0) return [...new Set(tokens)].join(" ");
  return values.some((value) => typeof value === "string") ? "" : undefined;
}

interface TooltipTriggerSurfaceProps {
  readonly elementProps: Parameters<TooltipTriggerRenderFunction>[0];
  readonly state: Readonly<BaseTooltip.Trigger.State>;
  readonly render: BaseTooltip.Trigger.Props["render"];
  readonly disabled: boolean;
}

function TooltipTriggerSurface({elementProps, state, render, disabled}: TooltipTriggerSurfaceProps): React.ReactElement {
  const aria = React.useContext(TooltipAriaContext);
  const description = state.open && !disabled && !aria?.disabled ? aria?.descriptionId : undefined;
  const describedBy = descriptionTokens(elementProps["aria-describedby"], description);
  const element = semanticElement(
    useRender({
      defaultTagName: "button",
      state,
      stateAttributesMapping: {open: (): null => null},
      render,
      props: {...elementProps, "aria-describedby": describedBy},
    }),
  );
  // eslint-disable-next-line react-x/no-clone-element -- merge only IDREF tokens; public useRender owns events, refs and native composition.
  return React.cloneElement(element, {
    "aria-describedby": descriptionTokens(elementProps["aria-describedby"], element.props["aria-describedby"], description),
  });
}

/**
 * Renders positioned tooltip content inside a portal.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/tooltip | Base UI Tooltip}
 * - Supports the `render` prop for element composition
 * - Defaults only absent role/ID values; caller IDs and roles take precedence
 * - Registers the committed DOM ID only while real SDK Popup state is open and its role is exactly `tooltip`
 * - One Content per root is the supported compound layout; hidden, unmounted or non-tooltip content adds no description
 * - Automatic association is committed in layout effects, not guaranteed in pre-hydration server HTML
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <TooltipContent>Details</TooltipContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/tooltip | Base UI Documentation}
 */
const TooltipContent = ({ref, ...props}: Readonly<TooltipContent.Props>): React.ReactElement => {
  const {
    className,
    children,
    render,
    side = "top",
    sideOffset = 4,
    align = "center",
    alignOffset = 0,
    anchor,
    positionMethod,
    collisionBoundary,
    collisionPadding,
    collisionAvoidance,
    sticky,
    arrowPadding,
    disableAnchorTracking,
    keepMounted,
    container,
    showArrow = true,
    ...popupProps
  } = props;
  return (
    <BaseTooltip.Portal
      keepMounted={keepMounted}
      container={container}>
      <BaseTooltip.Positioner
        className={styles.positioner}
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        positionMethod={positionMethod}
        collisionBoundary={collisionBoundary}
        collisionPadding={collisionPadding}
        collisionAvoidance={collisionAvoidance}
        sticky={sticky}
        arrowPadding={arrowPadding}
        disableAnchorTracking={disableAnchorTracking}>
        <TooltipPopupWithArrow
          ref={ref}
          className={typeof className === "function" ? (state) => cn(styles.popup, className(state)) : cn(styles.popup, className)}
          render={render}
          showArrow={showArrow}
          {...popupProps}>
          {children}
        </TooltipPopupWithArrow>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
};
TooltipContent.displayName = "TooltipContent";

type TooltipPopupWithArrowProps = Readonly<React.ComponentPropsWithRef<typeof BaseTooltip.Popup> & {showArrow: boolean}>;

// This part only renders inside a mounted Portal, so unopened lazy render elements are not eagerly resolved.
const TooltipPopupWithArrow = ({ref, render, children, showArrow, ...props}: Readonly<TooltipPopupWithArrowProps>): React.ReactElement => {
  const renderWithArrow: BaseTooltip.Popup.Props["render"] =
    !showArrow || !render
      ? render
      : typeof render === "function"
        ? (renderProps, state) => appendTooltipArrow(render(renderProps, state), children)
        : appendTooltipArrow(render, children);

  return (
    <BaseTooltip.Popup
      render={(elementProps, state) => (
        <TooltipPopupSurface
          elementProps={elementProps}
          state={state}
          render={renderWithArrow}
        />
      )}
      ref={ref}
      {...props}>
      {render !== undefined ? (
        children
      ) : (
        <>
          {children}
          {showArrow ? <TooltipArrow /> : null}
        </>
      )}
    </BaseTooltip.Popup>
  );
};
TooltipPopupWithArrow.displayName = "TooltipPopupWithArrow";

interface TooltipPopupSurfaceProps {
  readonly elementProps: Parameters<TooltipPopupRenderFunction>[0];
  readonly state: Readonly<BaseTooltip.Popup.State>;
  readonly render: BaseTooltip.Popup.Props["render"];
}

function TooltipPopupSurface({elementProps, state, render}: TooltipPopupSurfaceProps): React.ReactElement {
  const aria = React.useContext(TooltipAriaContext);
  const ownerId = React.useId();
  const nodeRef = React.useRef<HTMLElement | null>(null);
  const element = semanticElement(
    useRender({
      defaultTagName: "div",
      ref: nodeRef,
      state,
      stateAttributesMapping: {
        open: (): null => null,
        side: (): null => null,
        align: (): null => null,
        instant: (): null => null,
        transitionStatus: (): null => null,
      },
      render,
      props: {...elementProps, id: elementProps.id ?? aria?.popupId ?? `ac-tooltip-${ownerId}`, role: elementProps.role ?? "tooltip"},
    }),
  );
  const register = aria?.register;
  React.useLayoutEffect(() => {
    const node = nodeRef.current;
    const id =
      state.open
      && node?.getAttribute("role") === "tooltip"
      && !node.hidden
      && node.getAttribute("aria-hidden") !== "true"
      && node.id
      && !/\s/u.test(node.id)
        ? node.id
        : null;
    register?.(ownerId, id);
  });
  React.useLayoutEffect(() => () => register?.(ownerId, null), [ownerId, register]);
  // eslint-disable-next-line react-x/no-clone-element -- default only absent semantic props; preserve caller IDs/roles and all merged refs/events.
  return React.cloneElement(element, {
    id: element.props.id === undefined ? (elementProps.id ?? aria?.popupId ?? `ac-tooltip-${ownerId}`) : element.props.id,
    role: element.props.role === undefined ? (elementProps.role ?? "tooltip") : element.props.role,
  });
}

/** Decorative arrow positioned by Base UI; omit the default arrow with `TooltipContent.showArrow=false` when composing this part. */
const TooltipArrow = ({ref, className, ...props}: Readonly<TooltipArrow.Props>): React.ReactElement => (
  <BaseTooltip.Arrow
    ref={ref}
    data-slot='tooltip-arrow'
    aria-hidden='true'
    className={typeof className === "function" ? (state) => cn(styles.arrow, className(state)) : cn(styles.arrow, className)}
    {...props}
  />
);
TooltipArrow.displayName = "TooltipArrow";

function appendTooltipArrow(render: React.ReactElement, children: React.ReactNode): React.ReactElement {
  // eslint-disable-next-line react-x/no-children-to-array -- resolves supported lazy elements through public React APIs.
  const [element] = React.Children.toArray(render);
  if (!React.isValidElement<{children?: React.ReactNode}>(element)) {
    throw new TypeError("TooltipContent render must resolve to a React element.");
  }
  // eslint-disable-next-line react-x/no-clone-element -- append decorative children only; Base UI owns props/state/ref/event composition.
  return React.cloneElement(
    element,
    undefined,
    <>
      {Object.hasOwn(element.props, "children") ? element.props.children : children}
      <TooltipArrow />
    </>,
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Tooltip {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props<Payload = unknown> = TooltipProps<Payload>;
  export type State = BaseTooltip.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TooltipProvider {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = TooltipProviderProps;
  export type State = BaseTooltip.Provider.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TooltipTrigger {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props<Payload = unknown> = TooltipTriggerProps<Payload>;
  export type State = BaseTooltip.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TooltipContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = TooltipContentProps;
  export type State = BaseTooltip.Popup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TooltipArrow {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = TooltipArrowProps;
  export type State = BaseTooltip.Arrow.State;
}

export {Tooltip, TooltipArrow, TooltipContent, TooltipProvider, TooltipTrigger};
