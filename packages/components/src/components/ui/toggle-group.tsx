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
  /**
   * Additional CSS classes merged with the toggle-group root styles.
   * @default undefined
   */
  className?: string;
  /**
   * Shared visual variant inherited by descendant toggle items when not explicitly overridden.
   * @default undefined
   */
  variant?: ToggleVariant;
  /**
   * Shared size inherited by descendant toggle items when not explicitly overridden.
   * @default undefined
   */
  size?: ToggleSize;
}

/**
 * Props for an individual toggle-group item.
 *
 * @remarks
 * Inherits the shared toggle API except for pressed-state props, which are controlled
 * by the surrounding {@link ToggleGroup}.
 */
export interface ToggleGroupItemProps extends Omit<ToggleProps, "pressed" | "defaultPressed" | "onPressedChange"> {}

/**
 * Groups related toggles into a single multi-select or single-select control.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on Base UI Toggle Group primitives
 * - Provides shared `size` and `variant` values to descendant items
 *
 * @example
 * ```tsx
 * <ToggleGroup
 *   defaultValue={["bold"]}
 *   toggleMultiple>
 *   <ToggleGroupItem value='bold'>Bold</ToggleGroupItem>
 *   <ToggleGroupItem value='italic'>Italic</ToggleGroupItem>
 * </ToggleGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toggle-group | Base UI Toggle Group Docs}
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
 * Renders an individual toggle item within a toggle group.
 *
 * @remarks
 * - Renders a styled toggle button
 * - Built on the shared `Toggle` component and Base UI Toggle Group state
 * - Inherits `size` and `variant` from the nearest {@link ToggleGroup} when omitted
 *
 * @example
 * ```tsx
 * <ToggleGroup defaultValue={["left"]}>
 *   <ToggleGroupItem value='left'>Left</ToggleGroupItem>
 * </ToggleGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toggle-group | Base UI Toggle Group Docs}
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

ToggleGroup.displayName = "ToggleGroup";
ToggleGroupItem.displayName = "ToggleGroupItem";

export {ToggleGroup, ToggleGroupItem};
