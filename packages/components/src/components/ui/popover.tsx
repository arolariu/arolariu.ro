"use client";

import {Popover as BasePopover} from "@base-ui/react/popover";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./popover.module.css";

const Popover = BasePopover.Root;

interface PopoverTriggerProps extends Omit<React.ComponentPropsWithoutRef<typeof BasePopover.Trigger>, "className"> {
  className?: string;
  /** @deprecated Prefer Base UI's `render` prop. */

  asChild?: boolean;
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(({asChild = false, children, className, ...props}, ref) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <BasePopover.Trigger
        ref={ref}
        className={className}
        render={children as React.ReactElement}
        {...props}
      />
    );
  }

  return (
    <BasePopover.Trigger
      ref={ref}
      className={className}
      {...props}>
      {children}
    </BasePopover.Trigger>
  );
});
PopoverTrigger.displayName = "PopoverTrigger";

const PopoverAnchor = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.anchor, className)}
    {...props}
  />
));
PopoverAnchor.displayName = "PopoverAnchor";

const PopoverContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BasePopover.Positioner>>(
  ({className, children, sideOffset = 4, ...props}, ref) => (
    <BasePopover.Portal>
      <BasePopover.Positioner
        className={styles.positioner}
        sideOffset={sideOffset}
        {...props}>
        <BasePopover.Popup
          ref={ref}
          className={cn(styles.popup, className)}>
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  ),
);
PopoverContent.displayName = "PopoverContent";

export {Popover, PopoverAnchor, PopoverContent, PopoverTrigger};
