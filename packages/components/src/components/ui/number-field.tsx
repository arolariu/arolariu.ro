"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {NumberField as BaseNumberField} from "@base-ui/react/number-field";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./number-field.module.css";

type NumberFieldProps = React.ComponentPropsWithRef<typeof BaseNumberField.Root>;
type NumberFieldGroupProps = React.ComponentPropsWithRef<typeof BaseNumberField.Group>;
type NumberFieldInputProps = React.ComponentPropsWithRef<typeof BaseNumberField.Input>;
type NumberFieldIncrementProps = React.ComponentPropsWithRef<typeof BaseNumberField.Increment>;
type NumberFieldDecrementProps = React.ComponentPropsWithRef<typeof BaseNumberField.Decrement>;
type NumberFieldScrubAreaProps = React.ComponentPropsWithRef<typeof BaseNumberField.ScrubArea>;

/**
 * Renders the number field root.
 */
function NumberField(props: Readonly<NumberField.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseNumberField.Root
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.root, className)}, {}),
      })}>
      {children}
    </BaseNumberField.Root>
  );
}

/**
 * Renders the number field group frame.
 */
function NumberFieldGroup(props: Readonly<NumberFieldGroup.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseNumberField.Group
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.group, className)}, {}),
      })}>
      {children}
    </BaseNumberField.Group>
  );
}

/**
 * Renders the numeric text input.
 */
function NumberFieldInput(props: Readonly<NumberFieldInput.Props>): React.ReactElement {
  const {className, render, ...otherProps} = props;

  return (
    <BaseNumberField.Input
      {...otherProps}
      render={useRender({
        defaultTagName: "input",
        render: render as never,
        props: mergeProps({className: cn(styles.input, className)}, {}),
      })}
    />
  );
}

/**
 * Renders the increment button.
 */
function NumberFieldIncrement(props: Readonly<NumberFieldIncrement.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseNumberField.Increment
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps({className: cn(styles.stepper, styles.increment, className)}, {}),
      })}>
      {children ?? <span className={styles.stepperSymbol}>+</span>}
    </BaseNumberField.Increment>
  );
}

/**
 * Renders the decrement button.
 */
function NumberFieldDecrement(props: Readonly<NumberFieldDecrement.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseNumberField.Decrement
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps({className: cn(styles.stepper, styles.decrement, className)}, {}),
      })}>
      {children ?? <span className={styles.stepperSymbol}>−</span>}
    </BaseNumberField.Decrement>
  );
}

/**
 * Renders the scrub-area affordance.
 */
function NumberFieldScrubArea(props: Readonly<NumberFieldScrubArea.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseNumberField.ScrubArea
      {...otherProps}
      render={useRender({
        defaultTagName: "span",
        render: render as never,
        props: mergeProps({className: cn(styles.scrubArea, className)}, {}),
      })}>
      {children ?? <span className={styles.scrubHandle}>⋮⋮</span>}
    </BaseNumberField.ScrubArea>
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NumberField {
  export type Props = NumberFieldProps;
  export type State = BaseNumberField.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NumberFieldGroup {
  export type Props = NumberFieldGroupProps;
  export type State = BaseNumberField.Group.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NumberFieldInput {
  export type Props = NumberFieldInputProps;
  export type State = BaseNumberField.Input.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NumberFieldIncrement {
  export type Props = NumberFieldIncrementProps;
  export type State = BaseNumberField.Increment.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NumberFieldDecrement {
  export type Props = NumberFieldDecrementProps;
  export type State = BaseNumberField.Decrement.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NumberFieldScrubArea {
  export type Props = NumberFieldScrubAreaProps;
  export type State = BaseNumberField.ScrubArea.State;
}

export {NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput, NumberFieldScrubArea};
