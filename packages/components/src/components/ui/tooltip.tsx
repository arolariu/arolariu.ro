"use client";

import {Tooltip as BaseTooltip} from "@base-ui/react/tooltip";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./tooltip.module.css";

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}
const TooltipProvider = ({children}: TooltipProviderProps) => children;
TooltipProvider.displayName = "TooltipProvider";

interface TooltipProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseTooltip.Root>, "delay"> {
  delayDuration?: number;
  children?: React.ReactNode;
}
function Tooltip({delayDuration, ...props}: TooltipProps): React.JSX.Element {
  const tooltipProps = delayDuration !== undefined ? {...props, delay: delayDuration} : props;
  return <BaseTooltip.Root {...tooltipProps} />;
}
Tooltip.displayName = "Tooltip";

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Trigger> & {asChild?: boolean}
>(({asChild = false, children, className, ...props}, ref) => {
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

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup> & {sideOffset?: number; side?: "top" | "right" | "bottom" | "left"}
>(({className, sideOffset = 4, side = "top", ...props}, ref) => (
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
