"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {ToggleGroup as BaseToggleGroup} from "@base-ui/react/toggle-group";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {Toggle, toggleVariants, type ToggleProps, type ToggleSize, type ToggleVariant} from "./toggle";
import styles from "./toggle-group.module.css";

interface ToggleGroupContextValue {
  size?: ToggleSize;
  variant?: ToggleVariant;
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({});

export interface ToggleGroupProps extends Omit<React.ComponentPropsWithRef<typeof BaseToggleGroup>, "className"> {
  className?: string;
  variant?: ToggleVariant;
  size?: ToggleSize;
}

export interface ToggleGroupItemProps extends Omit<ToggleProps, "pressed" | "defaultPressed" | "onPressedChange"> {}

/**
 * Renders the toggle-group root and provides shared size and variant context.
 */
function ToggleGroup(props: Readonly<ToggleGroup.Props>): React.ReactElement {
  const {className, children, render, size, variant, ...otherProps} = props;

  return (
    <BaseToggleGroup
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.root, className)}, {}),
      })}>
      <ToggleGroupContext.Provider value={{variant, size}}>{children}</ToggleGroupContext.Provider>
    </BaseToggleGroup>
  );
}

/**
 * Renders a toggle-group item that inherits shared variants from context.
 */
function ToggleGroupItem(props: Readonly<ToggleGroupItem.Props>): React.ReactElement {
  const {className, size, variant, ...otherProps} = props;
  const context = React.useContext(ToggleGroupContext);

  return (
    <Toggle
      className={cn(
        toggleVariants({
          variant: variant ?? context.variant,
          size: size ?? context.size,
        }),
        className,
      )}
      size={size ?? context.size}
      variant={variant ?? context.variant}
      {...otherProps}
    />
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ToggleGroup {
  export type Props = ToggleGroupProps;
  export type State = BaseToggleGroup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ToggleGroupItem {
  export type Props = ToggleGroupItemProps;
  export type State = Toggle.State;
}

export {ToggleGroup, ToggleGroupItem};
