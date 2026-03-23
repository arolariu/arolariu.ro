"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {NumberField as BaseNumberField} from "@base-ui/react/number-field";
import {useRender} from "@base-ui/react/use-render";
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
        render={useRender({
          defaultTagName: "div",
          render: render as never,
          props: mergeProps({className: cn(styles.group, className)}, {}),
        })}>
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
        render={useRender({
          defaultTagName: "input",
          render: render as never,
          props: mergeProps({className: cn(styles.input, className)}, {}),
        })}
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

NumberField.displayName = "NumberField";
NumberFieldGroup.displayName = "NumberFieldGroup";
NumberFieldInput.displayName = "NumberFieldInput";
NumberFieldIncrement.displayName = "NumberFieldIncrement";
NumberFieldDecrement.displayName = "NumberFieldDecrement";
NumberFieldScrubArea.displayName = "NumberFieldScrubArea";

export {NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput, NumberFieldScrubArea};
