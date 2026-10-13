"use client";

import {NumberField as BaseNumberField} from "@base-ui/react/number-field";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./number-field.module.css";

/**
 * Provides a styled numeric input with optional steppers and scrub support.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on Base UI Number Field primitives
 *
 * @example
 * ```tsx
 * <NumberField defaultValue={2}>
 *   <NumberFieldGroup>
 *     <NumberFieldDecrement />
 *     <NumberFieldInput />
 *     <NumberFieldIncrement />
 *   </NumberFieldGroup>
 * </NumberField>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/number-field | Base UI Number Field Docs}
 */
const NumberField = React.forwardRef<HTMLDivElement, NumberField.Props>((props: Readonly<NumberField.Props>, ref): React.ReactElement => {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseNumberField.Root
      {...otherProps}
      ref={ref}
      render={render}
      className={(state) => cn(styles.root, typeof className === "function" ? className(state) : className)}>
      {children}
    </BaseNumberField.Root>
  );
});

/**
 * Wraps the interactive number-field controls in a shared container.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on Base UI Number Field group primitives
 *
 * @example
 * ```tsx
 * <NumberFieldGroup>
 *   <NumberFieldInput />
 * </NumberFieldGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/number-field | Base UI Number Field Docs}
 */
const NumberFieldGroup = React.forwardRef<React.ComponentRef<typeof BaseNumberField.Group>, NumberFieldGroup.Props>(
  (props: Readonly<NumberFieldGroup.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseNumberField.Group
        ref={ref}
        {...otherProps}
        render={render}
        className={(state) => cn(styles.group, typeof className === "function" ? className(state) : className)}>
        {children}
      </BaseNumberField.Group>
    );
  },
);

/**
 * Renders the text input used for numeric entry.
 *
 * @remarks
 * - Renders an `<input>` element by default
 * - Built on Base UI Number Field input primitives
 *
 * @example
 * ```tsx
 * <NumberFieldInput aria-label='Quantity' />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/number-field | Base UI Number Field Docs}
 */
const NumberFieldInput = React.forwardRef<React.ComponentRef<typeof BaseNumberField.Input>, NumberFieldInput.Props>(
  (props: Readonly<NumberFieldInput.Props>, ref): React.ReactElement => {
    const {className, render, ...otherProps} = props;

    return (
      <BaseNumberField.Input
        ref={ref}
        {...otherProps}
        render={render}
        className={(state) => cn(styles.input, typeof className === "function" ? className(state) : className)}
      />
    );
  },
);

/**
 * Renders the increment control for a number field.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on Base UI Number Field increment primitives
 *
 * @example
 * ```tsx
 * <NumberFieldIncrement />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/number-field | Base UI Number Field Docs}
 */
const NumberFieldIncrement = React.forwardRef<HTMLButtonElement, NumberFieldIncrement.Props>(
  (props: Readonly<NumberFieldIncrement.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseNumberField.Increment
        {...otherProps}
        ref={ref}
        render={render}
        className={(state) => cn(styles.stepper, styles.increment, typeof className === "function" ? className(state) : className)}>
        {children ?? <span className={styles.stepperSymbol}>+</span>}
      </BaseNumberField.Increment>
    );
  },
);

/**
 * Renders the decrement control for a number field.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on Base UI Number Field decrement primitives
 *
 * @example
 * ```tsx
 * <NumberFieldDecrement />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/number-field | Base UI Number Field Docs}
 */
const NumberFieldDecrement = React.forwardRef<HTMLButtonElement, NumberFieldDecrement.Props>(
  (props: Readonly<NumberFieldDecrement.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseNumberField.Decrement
        {...otherProps}
        ref={ref}
        render={render}
        className={(state) => cn(styles.stepper, styles.decrement, typeof className === "function" ? className(state) : className)}>
        {children ?? <span className={styles.stepperSymbol}>−</span>}
      </BaseNumberField.Decrement>
    );
  },
);

/**
 * Renders the scrub handle used for drag-to-adjust interactions.
 *
 * @remarks
 * - Renders a `<span>` element by default
 * - Built on Base UI Number Field scrub-area primitives
 *
 * @example
 * ```tsx
 * <NumberFieldScrubArea />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/number-field | Base UI Number Field Docs}
 */
const NumberFieldScrubArea = React.forwardRef<HTMLSpanElement, NumberFieldScrubArea.Props>(
  (props: Readonly<NumberFieldScrubArea.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseNumberField.ScrubArea
        {...otherProps}
        ref={ref}
        render={render}
        className={(state) => cn(styles.scrubArea, typeof className === "function" ? className(state) : className)}>
        {children ?? <span className={styles.scrubHandle}>⋮⋮</span>}
      </BaseNumberField.ScrubArea>
    );
  },
);

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NumberField {
  export type Props = React.ComponentPropsWithRef<typeof BaseNumberField.Root>;
  export type State = BaseNumberField.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NumberFieldGroup {
  export type Props = React.ComponentPropsWithRef<typeof BaseNumberField.Group>;
  export type State = BaseNumberField.Group.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NumberFieldInput {
  export type Props = React.ComponentPropsWithRef<typeof BaseNumberField.Input>;
  export type State = BaseNumberField.Input.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NumberFieldIncrement {
  export type Props = React.ComponentPropsWithRef<typeof BaseNumberField.Increment>;
  export type State = BaseNumberField.Increment.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NumberFieldDecrement {
  export type Props = React.ComponentPropsWithRef<typeof BaseNumberField.Decrement>;
  export type State = BaseNumberField.Decrement.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NumberFieldScrubArea {
  export type Props = React.ComponentPropsWithRef<typeof BaseNumberField.ScrubArea>;
  export type State = BaseNumberField.ScrubArea.State;
}

/** Props for the numeric field root, including value, locale, bounds and DOM refs. */
export type NumberFieldProps = React.ComponentPropsWithRef<typeof BaseNumberField.Root>;
/** Primitive-owned numeric field state exposed to composition callbacks. */
export type NumberFieldState = BaseNumberField.Root.State;
/** Props for the numeric field control group. */
export type NumberFieldGroupProps = React.ComponentPropsWithRef<typeof BaseNumberField.Group>;
/** Primitive-owned numeric field group state. */
export type NumberFieldGroupState = BaseNumberField.Group.State;
/** Props for the numeric text input. */
export type NumberFieldInputProps = React.ComponentPropsWithRef<typeof BaseNumberField.Input>;
/** Primitive-owned numeric input state. */
export type NumberFieldInputState = BaseNumberField.Input.State;
/** Props for the increment button. */
export type NumberFieldIncrementProps = React.ComponentPropsWithRef<typeof BaseNumberField.Increment>;
/** Primitive-owned increment button state. */
export type NumberFieldIncrementState = BaseNumberField.Increment.State;
/** Props for the decrement button. */
export type NumberFieldDecrementProps = React.ComponentPropsWithRef<typeof BaseNumberField.Decrement>;
/** Primitive-owned decrement button state. */
export type NumberFieldDecrementState = BaseNumberField.Decrement.State;
/** Props for the drag-to-adjust scrub area. */
export type NumberFieldScrubAreaProps = React.ComponentPropsWithRef<typeof BaseNumberField.ScrubArea>;
/** Primitive-owned scrub area state. */
export type NumberFieldScrubAreaState = BaseNumberField.ScrubArea.State;

NumberField.displayName = "NumberField";
NumberFieldGroup.displayName = "NumberFieldGroup";
NumberFieldInput.displayName = "NumberFieldInput";
NumberFieldIncrement.displayName = "NumberFieldIncrement";
NumberFieldDecrement.displayName = "NumberFieldDecrement";
NumberFieldScrubArea.displayName = "NumberFieldScrubArea";

export {NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput, NumberFieldScrubArea};
