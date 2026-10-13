"use client";

import {Tooltip as BaseTooltip} from "@base-ui/react/tooltip";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./tooltip.module.css";

/** Shared primitive timing options with the legacy delayDuration alias. */
export type TooltipProviderProps = Readonly<
  React.ComponentProps<typeof BaseTooltip.Provider> & {
    /** Delay in milliseconds before tooltip content becomes visible. @default undefined */
    readonly delayDuration?: number;
  }
>;

/** Primitive root options; legacy delayDuration is supplied to descendant triggers, never Root.delay. */
export type TooltipProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseTooltip.Root> & {
    /** Delay in milliseconds before tooltip content becomes visible. @default undefined */
    readonly delayDuration?: number;
  }
>;

const TooltipDelayContext = React.createContext<number | undefined>(undefined);

/** Primitive trigger options and legacy child-slot compatibility. */
export type TooltipTriggerProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseTooltip.Trigger>, "ref">
    & React.RefAttributes<HTMLElement> & {
      /** Backward-compatible child-slot API that maps the child element to `render`. @default false @deprecated Prefer Base UI's `render` prop. */
      readonly asChild?: boolean;
    }
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
 * - `delay` takes precedence over the legacy `delayDuration` alias
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
function TooltipProvider({delayDuration, delay, ...props}: Readonly<TooltipProvider.Props>): React.ReactElement {
  return (
    <BaseTooltip.Provider
      delay={delay ?? delayDuration}
      {...props}
    />
  );
}
TooltipProvider.displayName = "TooltipProvider";

/**
 * Coordinates tooltip timing, open state, and accessibility semantics.
 *
 * @remarks
 * - Renders no DOM element by default and coordinates descendant tooltip parts
 * - Built on {@link https://base-ui.com/react/components/tooltip | Base UI Tooltip}
 * - Supports composition through descendant `render` props
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
function Tooltip(props: Readonly<Tooltip.Props>): React.ReactElement {
  const {delayDuration, ...otherProps} = props;
  return (
    <TooltipDelayContext.Provider value={delayDuration}>
      <BaseTooltip.Root {...otherProps} />
    </TooltipDelayContext.Provider>
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
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <TooltipTrigger>Hover</TooltipTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/tooltip | Base UI Documentation}
 */
const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTrigger.Props>(
  (props: Readonly<TooltipTrigger.Props>, ref): React.ReactElement => {
    // eslint-disable-next-line sonarjs/deprecation -- backward-compatible asChild support is part of the public API.
    const {asChild = false, children, className, delay, render, ...otherProps} = props;
    const rootDelay = React.useContext(TooltipDelayContext);
    // eslint-disable-next-line react-x/no-children-to-array -- public React normalization supports Base UI lazy element slots.
    const slotChildren = asChild ? React.Children.toArray(children) : [];
    const child = slotChildren.length === 1 ? slotChildren[0] : undefined;
    const renderProp = React.isValidElement(child) ? child : render;
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
        delay={delay ?? rootDelay}
        render={renderProp}
        {...otherProps}
        ref={primitiveRef}>
        {React.isValidElement(child) ? undefined : children}
      </BaseTooltip.Trigger>
    );
  },
);
TooltipTrigger.displayName = "TooltipTrigger";

/**
 * Renders positioned tooltip content inside a portal.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/tooltip | Base UI Tooltip}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <TooltipContent>Details</TooltipContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/tooltip | Base UI Documentation}
 */
const TooltipContent = React.forwardRef<React.ComponentRef<typeof BaseTooltip.Popup>, TooltipContent.Props>(
  (props: Readonly<TooltipContent.Props>, ref): React.ReactElement => {
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
  },
);
TooltipContent.displayName = "TooltipContent";

type TooltipPopupWithArrowProps = Readonly<React.ComponentPropsWithRef<typeof BaseTooltip.Popup> & {showArrow: boolean}>;

// This part only renders inside a mounted Portal, so unopened lazy render elements are not eagerly resolved.
const TooltipPopupWithArrow = React.forwardRef<HTMLDivElement, TooltipPopupWithArrowProps>(
  ({render, children, showArrow, ...props}: TooltipPopupWithArrowProps, ref): React.ReactElement => {
    const renderWithArrow: BaseTooltip.Popup.Props["render"] =
      !showArrow || !render
        ? render
        : typeof render === "function"
          ? (renderProps, state) => appendTooltipArrow(render(renderProps, state), children)
          : appendTooltipArrow(render, children);

    return (
      <BaseTooltip.Popup
        {...props}
        render={renderWithArrow}
        ref={ref}>
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
  },
);
TooltipPopupWithArrow.displayName = "TooltipPopupWithArrow";

/** Decorative arrow positioned by Base UI; omit the default arrow with `TooltipContent.showArrow=false` when composing this part. */
const TooltipArrow = React.forwardRef<HTMLDivElement, TooltipArrow.Props>(
  ({className, ...props}: Readonly<TooltipArrow.Props>, ref): React.ReactElement => (
    <BaseTooltip.Arrow
      ref={ref}
      data-slot='tooltip-arrow'
      aria-hidden='true'
      className={typeof className === "function" ? (state) => cn(styles.arrow, className(state)) : cn(styles.arrow, className)}
      {...props}
    />
  ),
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
      {element.props.children === undefined ? children : element.props.children}
      <TooltipArrow />
    </>,
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Tooltip {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = TooltipProps;
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
  export type Props = TooltipTriggerProps;
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
