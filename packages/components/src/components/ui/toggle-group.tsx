"use client";

import {ToggleGroup as BaseToggleGroup} from "@base-ui/react/toggle-group";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {Toggle, type ToggleProps, type ToggleSize, type ToggleVariant, type ToggleVariantOptions} from "./toggle";
import styles from "./toggle-group.module.css";

interface ToggleGroupContextValue extends Pick<ToggleVariantOptions, "size" | "variant"> {
  readonly spacing: number;
  readonly orientation: NonNullable<BaseToggleGroup.Props["orientation"]>;
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({spacing: 2, orientation: "horizontal"});

// A callable view preserves generic value inference without a cast or a React 19-only ref prop.
const withRef: <Element, Props>(
  render: (props: React.PropsWithoutRef<Props>, ref: React.ForwardedRef<Element>) => React.ReactNode,
) => (props: React.PropsWithoutRef<Props> & React.RefAttributes<Element>) => React.ReactNode = React.forwardRef;

/** Readonly primitive selection/renderer props with group visual defaults. */
export type ToggleGroupProps<Value extends string = string> = Readonly<
  BaseToggleGroup.Props<Value>
    & React.RefAttributes<HTMLDivElement>
    & Partial<{
      /** Item default; an explicitly supplied item variant wins. @default undefined */
      variant: ToggleVariant | undefined;
      /** Item default; an explicitly supplied item size wins. @default undefined */
      size: ToggleSize | undefined;
      /**
       * Non-negative gap in --ac-space-1 units; zero joins adjacent items.
       * Token steps 0, 1, 2, 3, 4, 6 and 8 also work without typed CSS attr support.
       * Other numbers require typed CSS attr support, otherwise the gap is two units.
       * @default 2
       */
      spacing: number | undefined;
    }>
>;

/** Actual primitive disabled, multiple, and orientation state (not selected values). */
export type ToggleGroupState = BaseToggleGroup.State;

/**
 * Props for an individual toggle-group item.
 *
 * @remarks
 * Inherits the shared toggle API except for pressed-state props, which are controlled
 * by the surrounding {@link ToggleGroup}.
 */
export type ToggleGroupItemProps<Value extends string = string> = Readonly<
  Omit<ToggleProps, "pressed" | "defaultPressed" | "onPressedChange" | "value">
    & Partial<{
      /** Unique item value used by the surrounding group for selection. */
      value: Value | undefined;
    }>
>;

/** Actual item pressed/disabled state owned by Base UI ToggleGroup and Toggle. */
export type ToggleGroupItemState = Toggle.State;

/**
 * Groups related toggles into a single multi-select or single-select control.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on Base UI Toggle Group primitives
 * - Explicit item size/variant wins over this group's defaults (existing API precedence)
 * - Spacing defaults to two token units, zero joins items; orientation also reaches Base UI
 * - Forwarded refs work on React 18/19 while preserving selection value inference
 *
 * @example
 * ```tsx
 * <ToggleGroup
 *   defaultValue={["bold"]}
 *   multiple>
 *   <ToggleGroupItem value='bold'>Bold</ToggleGroupItem>
 *   <ToggleGroupItem value='italic'>Italic</ToggleGroupItem>
 * </ToggleGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toggle-group | Base UI Toggle Group Docs}
 */
const ToggleGroup = Object.assign(
  withRef(
    <Value extends string = string>(
      props: Readonly<Omit<ToggleGroup.Props<Value>, "ref">>,
      ref: React.ForwardedRef<HTMLDivElement>,
    ): React.JSX.Element => {
      const {className, children, size, variant, spacing = 2, orientation = "horizontal", ...otherProps} = props;

      return (
        <BaseToggleGroup
          {...otherProps}
          ref={ref}
          data-slot='toggle-group'
          data-variant={variant}
          data-size={size}
          data-spacing={spacing}
          orientation={orientation}
          className={(state) => cn(styles.root, typeof className === "function" ? className(state) : className)}>
          <ToggleGroupContext.Provider value={{variant, size, spacing, orientation}}>{children}</ToggleGroupContext.Provider>
        </BaseToggleGroup>
      );
    },
  ),
  {displayName: "ToggleGroup"},
);

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
const ToggleGroupItem = Object.assign(
  withRef(
    <Value extends string = string>(
      props: Readonly<Omit<ToggleGroupItem.Props<Value>, "ref">>,
      ref: React.ForwardedRef<HTMLElement>,
    ): React.JSX.Element => {
      const {className, size, variant, ...otherProps} = props;
      const context = React.useContext(ToggleGroupContext);

      return (
        <Toggle
          {...otherProps}
          ref={ref}
          data-slot='toggle-group-item'
          data-spacing={context.spacing}
          data-orientation={context.orientation}
          className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}
          size={size ?? context.size}
          variant={variant ?? context.variant}
        />
      );
    },
  ),
  {displayName: "ToggleGroupItem"},
);

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ToggleGroup {
  export type Props<Value extends string = string> = ToggleGroupProps<Value>;
  export type State = BaseToggleGroup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ToggleGroupItem {
  export type Props<Value extends string = string> = ToggleGroupItemProps<Value>;
  export type State = Toggle.State;
}

export {ToggleGroup, ToggleGroupItem};
