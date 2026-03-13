"use client";

import {NumberField as BaseNumberField} from "@base-ui/react/number-field";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./number-field.module.css";

type NumberFieldProps = React.ComponentPropsWithoutRef<typeof BaseNumberField.Root>;
type NumberFieldGroupProps = React.ComponentPropsWithoutRef<typeof BaseNumberField.Group>;
type NumberFieldInputProps = React.ComponentPropsWithoutRef<typeof BaseNumberField.Input>;
type NumberFieldIncrementProps = React.ComponentPropsWithoutRef<typeof BaseNumberField.Increment>;
type NumberFieldDecrementProps = React.ComponentPropsWithoutRef<typeof BaseNumberField.Decrement>;
type NumberFieldScrubAreaProps = React.ComponentPropsWithoutRef<typeof BaseNumberField.ScrubArea>;

/**
 * Wraps the Base UI number field root with compact Mira styling.
 */
const NumberField = React.forwardRef<HTMLDivElement, NumberFieldProps>(
  ({className, ...props}: Readonly<NumberFieldProps>, ref): React.JSX.Element => (
    <BaseNumberField.Root
      ref={ref}
      className={cn(styles.root, className)}
      {...props}
    />
  ),
);
NumberField.displayName = "NumberField";

/**
 * Groups the number field input and controls into a unified compact frame.
 */
const NumberFieldGroup = React.forwardRef<HTMLDivElement, NumberFieldGroupProps>(
  ({className, ...props}: Readonly<NumberFieldGroupProps>, ref): React.JSX.Element => (
    <BaseNumberField.Group
      ref={ref}
      className={cn(styles.group, className)}
      {...props}
    />
  ),
);
NumberFieldGroup.displayName = "NumberFieldGroup";

/**
 * Renders the text input for numeric entry with compact spacing.
 */
const NumberFieldInput = React.forwardRef<HTMLInputElement, NumberFieldInputProps>(
  ({className, ...props}: Readonly<NumberFieldInputProps>, ref): React.JSX.Element => (
    <BaseNumberField.Input
      ref={ref}
      className={cn(styles.input, className)}
      {...props}
    />
  ),
);
NumberFieldInput.displayName = "NumberFieldInput";

/**
 * Renders the increment button with a default plus glyph when no children are provided.
 */
const NumberFieldIncrement = React.forwardRef<HTMLButtonElement, NumberFieldIncrementProps>(
  ({className, children, ...props}: Readonly<NumberFieldIncrementProps>, ref): React.JSX.Element => (
    <BaseNumberField.Increment
      ref={ref}
      className={cn(styles.stepper, styles.increment, className)}
      {...props}>
      {children ?? <span className={styles.stepperSymbol}>+</span>}
    </BaseNumberField.Increment>
  ),
);
NumberFieldIncrement.displayName = "NumberFieldIncrement";

/**
 * Renders the decrement button with a default minus glyph when no children are provided.
 */
const NumberFieldDecrement = React.forwardRef<HTMLButtonElement, NumberFieldDecrementProps>(
  ({className, children, ...props}: Readonly<NumberFieldDecrementProps>, ref): React.JSX.Element => (
    <BaseNumberField.Decrement
      ref={ref}
      className={cn(styles.stepper, styles.decrement, className)}
      {...props}>
      {children ?? <span className={styles.stepperSymbol}>−</span>}
    </BaseNumberField.Decrement>
  ),
);
NumberFieldDecrement.displayName = "NumberFieldDecrement";

/**
 * Renders a compact scrub affordance for pointer-based value adjustments.
 */
const NumberFieldScrubArea = React.forwardRef<HTMLSpanElement, NumberFieldScrubAreaProps>(
  ({className, children, ...props}: Readonly<NumberFieldScrubAreaProps>, ref): React.JSX.Element => (
    <BaseNumberField.ScrubArea
      ref={ref}
      className={cn(styles.scrubArea, className)}
      {...props}>
      {children ?? <span className={styles.scrubHandle}>⋮⋮</span>}
    </BaseNumberField.ScrubArea>
  ),
);
NumberFieldScrubArea.displayName = "NumberFieldScrubArea";

export {NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput, NumberFieldScrubArea};
