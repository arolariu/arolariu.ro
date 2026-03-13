"use client";

import {ToggleGroup as BaseToggleGroup} from "@base-ui/react/toggle-group";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {Toggle, toggleVariants, type ToggleProps, type ToggleSize, type ToggleVariant} from "./toggle";
import styles from "./toggle-group.module.css";

interface ToggleGroupContextValue {
  size?: ToggleSize;
  variant?: ToggleVariant;
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({});

export interface ToggleGroupProps extends React.ComponentPropsWithoutRef<typeof BaseToggleGroup> {
  variant?: ToggleVariant;
  size?: ToggleSize;
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(({className, variant, size, children, ...props}, ref) => (
  <BaseToggleGroup
    ref={ref}
    className={cn(styles.root, className)}
    {...props}>
    <ToggleGroupContext.Provider value={{variant, size}}>{children}</ToggleGroupContext.Provider>
  </BaseToggleGroup>
));
ToggleGroup.displayName = "ToggleGroup";

export interface ToggleGroupItemProps extends Omit<ToggleProps, "pressed" | "defaultPressed" | "onPressedChange"> {}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(({className, variant, size, ...props}, ref) => {
  const context = React.useContext(ToggleGroupContext);

  return (
    <Toggle
      ref={ref}
      className={cn(
        toggleVariants({
          variant: variant ?? context.variant,
          size: size ?? context.size,
        }),
        className,
      )}
      variant={variant ?? context.variant}
      size={size ?? context.size}
      {...props}
    />
  );
});
ToggleGroupItem.displayName = "ToggleGroupItem";

export {ToggleGroup, ToggleGroupItem};
