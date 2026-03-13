"use client";

import {Tooltip as BaseTooltip} from "@base-ui/react/tooltip";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./tooltip.module.css";

/**
 * Represents the configurable props for the TooltipProvider component.
 *
 * @remarks
 * This compatibility wrapper currently renders children directly and does not inject a
 * shared Base UI provider. `delayDuration` is accepted for API familiarity only.
 *
 * @default delayDuration `undefined`
 */
interface TooltipProviderProps {
  /**
   * The tooltip-enabled subtree rendered by the provider wrapper.
   */
  children: React.ReactNode;
  /**
   * A shared hover delay for descendant tooltips.
   *
   * @default undefined
   */
  delayDuration?: number;
}

/**
 * Represents the configurable props for the Tooltip root component.
 *
 * @remarks
 * Extends the Base UI tooltip root primitive while renaming the delay prop to match
 * the rest of the component library's public API.
 *
 * @default delayDuration `undefined`
 */
interface TooltipProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseTooltip.Root>, "delay"> {
  /**
   * Delay before the tooltip opens after pointer hover or focus.
   *
   * @default undefined
   */
  delayDuration?: number;
  /**
   * The trigger and content elements composed inside the tooltip root.
   */
  children?: React.ReactNode;
}

/**
 * Represents the configurable props for the TooltipTrigger component.
 *
 * @remarks
 * Extends the Base UI trigger primitive and adds `asChild` support for custom trigger elements.
 *
 * @default asChild `false`
 */
interface TooltipTriggerProps extends React.ComponentPropsWithoutRef<typeof BaseTooltip.Trigger> {
  /**
   * Additional CSS classes merged with the trigger reset styles.
   */
  className?: string;
  /**
   * When `true`, renders the provided child as the trigger element.
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * Represents the configurable props for the TooltipContent component.
 *
 * @remarks
 * Extends the Base UI popup primitive and documents the positioning defaults applied
 * by this wrapper.
 *
 * @default sideOffset `4`
 * @default side `"top"`
 */
interface TooltipContentProps extends React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup> {
  /**
   * Additional CSS classes merged with the tooltip popup styles.
   */
  className?: string;
  /**
   * Distance in pixels between the tooltip and its trigger.
   *
   * @default 4
   */
  sideOffset?: number;
  /**
   * Preferred side of the trigger where the tooltip should appear.
   *
   * @default "top"
   */
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * A compatibility wrapper for grouping tooltip-enabled content.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Unlike a traditional provider, this implementation is currently a pass-through that
 * simply renders its children. Keep using it to preserve a consistent API surface for
 * future shared tooltip configuration.
 *
 * @example
 * ```tsx
 * <TooltipProvider>
 *   <Tooltip>
 *     <TooltipTrigger>Hover me</TooltipTrigger>
 *     <TooltipContent>Helpful context</TooltipContent>
 *   </Tooltip>
 * </TooltipProvider>
 * ```
 *
 * @see {@link Tooltip}
 * @see {@link https://base-ui.com/react/components/tooltip Base UI Tooltip docs}
 */
const TooltipProvider = ({children}: Readonly<TooltipProviderProps>): React.ReactNode => children;
TooltipProvider.displayName = "TooltipProvider";

/**
 * A tooltip root that coordinates open state, delays, and positioning.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI tooltip root primitive and maps `delayDuration` to Base UI's
 * `delay` prop so the API aligns with the rest of the shared component library.
 *
 * @example
 * ```tsx
 * <Tooltip delayDuration={150}>
 *   <TooltipTrigger>Hover me</TooltipTrigger>
 *   <TooltipContent>Additional details</TooltipContent>
 * </Tooltip>
 * ```
 *
 * @see {@link TooltipContent}
 * @see {@link https://base-ui.com/react/components/tooltip Base UI Tooltip docs}
 */
function Tooltip({delayDuration, ...props}: Readonly<TooltipProps>): React.JSX.Element {
  const tooltipProps = delayDuration === undefined ? props : {...props, delay: delayDuration};
  return <BaseTooltip.Root {...tooltipProps} />;
}
Tooltip.displayName = "Tooltip";

/**
 * An interactive trigger that reveals tooltip content on hover or focus.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI trigger primitive and supports `asChild` composition so existing
 * buttons, links, or icons can become tooltip activators without extra wrappers.
 *
 * @example
 * ```tsx
 * <TooltipTrigger asChild>
 *   <button type="button">?</button>
 * </TooltipTrigger>
 * ```
 *
 * @see {@link TooltipContent}
 * @see {@link https://base-ui.com/react/components/tooltip Base UI Tooltip docs}
 */
const TooltipTrigger = React.forwardRef<HTMLButtonElement, TooltipTriggerProps>(({asChild = false, children, className, ...props}, ref) => {
  const composedClassName = cn(styles.trigger, className);

  if (asChild && React.isValidElement(children)) {
    return (
      <BaseTooltip.Trigger
        ref={ref}
        className={composedClassName}
        render={children as React.ReactElement}
        {...props}
      />
    );
  }

  return (
    <BaseTooltip.Trigger
      ref={ref}
      className={composedClassName}
      {...props}>
      {children}
    </BaseTooltip.Trigger>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

/**
 * The floating tooltip surface rendered in a portal.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * `TooltipContent` automatically wraps the Base UI popup in a portal and positioner,
 * applying sensible defaults for offset and placement while preserving override hooks.
 *
 * @example
 * ```tsx
 * <TooltipContent side="right">Copied to clipboard</TooltipContent>
 * ```
 *
 * @see {@link TooltipTrigger}
 * @see {@link https://base-ui.com/react/components/tooltip Base UI Tooltip docs}
 */
const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(({className, sideOffset = 4, side = "top", ...props}, ref) => (
  <BaseTooltip.Portal>
    <BaseTooltip.Positioner
      sideOffset={sideOffset}
      side={side}>
      <BaseTooltip.Popup
        ref={ref}
        className={cn(styles.popup, className)}
        {...props}
      />
    </BaseTooltip.Positioner>
  </BaseTooltip.Portal>
));
TooltipContent.displayName = "TooltipContent";

export {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger};
