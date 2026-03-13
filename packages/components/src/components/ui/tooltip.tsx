"use client";

import {Tooltip as BaseTooltip} from "@base-ui/react/tooltip";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./tooltip.module.css";

interface TooltipProviderProps {
  /** Tooltip content and triggers managed by the provider. @default undefined */
  children: React.ReactNode;
  /** Delay in milliseconds before tooltip content becomes visible. @default undefined */
  delayDuration?: number;
}

interface TooltipProps extends Omit<React.ComponentPropsWithRef<typeof BaseTooltip.Root>, "delay"> {
  /** Delay in milliseconds before tooltip content becomes visible. @default undefined */
  delayDuration?: number;
}

interface TooltipTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseTooltip.Trigger>, "className"> {
  /** Additional CSS classes merged with the tooltip trigger styles. @default undefined */
  className?: string;
  /** Backward-compatible child-slot API that maps the child element to `render`. @default false @deprecated Prefer Base UI's `render` prop. */
  asChild?: boolean;
}

interface TooltipContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseTooltip.Popup>, "className"> {
  /** Additional CSS classes merged with the tooltip popup styles. @default undefined */
  className?: string;
  /** The offset in pixels between the trigger and the tooltip popup. @default 4 */
  sideOffset?: number;
  /** Preferred side on which the tooltip should appear. @default "top" */
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * Provides a compatibility wrapper for grouping tooltip triggers and content.
 *
 * @remarks
 * - Renders no DOM element by default and returns its children directly
 * - Built on {@link https://base-ui.com/react/components/tooltip | Base UI Tooltip}
 * - Does not expose a `render` prop because it is a pass-through provider shim
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
const TooltipProvider = ({children}: Readonly<TooltipProviderProps>): React.ReactNode => children;
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
  const tooltipProps = delayDuration === undefined ? otherProps : {...otherProps, delay: delayDuration};

  return <BaseTooltip.Root {...tooltipProps} />;
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
function TooltipTrigger(props: Readonly<TooltipTrigger.Props>): React.ReactElement {
  const {asChild = false, children, className, ...otherProps} = props;

  if (asChild && React.isValidElement(children)) {
    return (
      <BaseTooltip.Trigger
        className={cn(styles.trigger, className)}
        render={children as React.ReactElement}
        {...otherProps}
      />
    );
  }

  return (
    <BaseTooltip.Trigger
      className={cn(styles.trigger, className)}
      {...otherProps}>
      {children}
    </BaseTooltip.Trigger>
  );
}
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
function TooltipContent(props: Readonly<TooltipContent.Props>): React.ReactElement {
  const {className, children, side = "top", sideOffset = 4, ...otherProps} = props;

  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        side={side}
        sideOffset={sideOffset}>
        <BaseTooltip.Popup
          className={cn(styles.popup, className)}
          {...otherProps}>
          {children}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}
TooltipContent.displayName = "TooltipContent";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Tooltip {
  export type Props = TooltipProps;
  export type State = BaseTooltip.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TooltipTrigger {
  export type Props = TooltipTriggerProps;
  export type State = BaseTooltip.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TooltipContent {
  export type Props = TooltipContentProps;
  export type State = BaseTooltip.Popup.State;
}

export {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger};
