"use client";

import {Radio} from "@base-ui/react/radio";
import {RadioGroup as BaseRadioGroup} from "@base-ui/react/radio-group";
import {Circle} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./radio-group.module.css";

/** Readonly radio-group props preserving the primitive's inferred selection value. */
export type RadioGroupProps<Value = string> = Readonly<BaseRadioGroup.Props<Value>>;
/** Primitive-owned group Field state; selection belongs to the items, not this state. */
export type RadioGroupState = BaseRadioGroup.State;
/** Readonly radio-item props preserving the inferred value and polymorphic span ref. */
export type RadioGroupItemProps<Value = string> = Readonly<Radio.Root.Props<Value>>;
/** Primitive-owned checked and Field state for each radio. */
export type RadioGroupItemState = Radio.Root.State;

// A callable view preserves generic value inference without a cast or a React 19-only ref prop.
const withRef: <Element, Props>(
  render: (props: React.PropsWithoutRef<Props>, ref: React.ForwardedRef<Element>) => React.ReactNode,
) => (props: React.PropsWithoutRef<Props> & React.RefAttributes<Element>) => React.ReactNode = React.forwardRef;

/**
 * Coordinates radio group state and selection behavior.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/radio-group | Base UI Radio Group}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <RadioGroup defaultValue="one" aria-label="Options">
 *   <RadioGroupItem value="one" aria-label="One" />
 * </RadioGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/radio-group | Base UI Documentation}
 */
const RadioGroup = Object.assign(
  withRef(
    <Value = string,>(
      props: Readonly<Omit<RadioGroup.Props<Value>, "ref">>,
      ref: React.ForwardedRef<HTMLDivElement>,
    ): React.JSX.Element => {
      const {className, ...otherProps} = props;

      return (
        <BaseRadioGroup
          {...otherProps}
          ref={ref}
          data-slot='radio-group'
          className={(state) => cn(styles.group, typeof className === "function" ? className(state) : className)}
        />
      );
    },
  ),
  {displayName: "RadioGroup"},
);

/**
 * Renders the radio group item.
 *
 * @remarks
 * - Renders the primitive's `<span>` and hidden radio input by default
 * - Built on {@link https://base-ui.com/react/components/radio-group | Base UI Radio Group}
 * - Supports render/class callbacks with checked and Field state
 * - Use nativeButton=true with render={<button />} for a native button target
 * - Forwarded refs work on React 18/19 while preserving generic value inference
 *
 * @example
 * ```tsx
 * <RadioGroupItem value="one" aria-label="One" />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/radio-group | Base UI Documentation}
 */
const RadioGroupItem = Object.assign(
  withRef(
    <Value = string,>(
      props: Readonly<Omit<RadioGroupItem.Props<Value>, "ref">>,
      ref: React.ForwardedRef<React.ComponentRef<typeof Radio.Root>>,
    ): React.JSX.Element => {
      const {className, ...otherProps} = props;

      return (
        <Radio.Root
          {...otherProps}
          ref={ref}
          data-slot='radio-group-item'
          className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}>
          <Radio.Indicator
            data-slot='radio-group-indicator'
            className={styles.indicator}>
            <Circle
              aria-hidden='true'
              className={styles.icon}
            />
          </Radio.Indicator>
        </Radio.Root>
      );
    },
  ),
  {displayName: "RadioGroupItem"},
);

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace RadioGroup {
  export type Props<Value = string> = RadioGroupProps<Value>;
  export type State = BaseRadioGroup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace RadioGroupItem {
  export type Props<Value = string> = RadioGroupItemProps<Value>;
  export type State = Radio.Root.State;
}

export {RadioGroup, RadioGroupItem};
