"use client";

import * as React from "react";

import {Button, type ButtonSize} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {cn} from "@/lib/utilities";
import styles from "./input-group.module.css";

/** Supported alignment options for {@link InputGroupAddon}. */
export type InputGroupAddonAlign = "inline-start" | "inline-end" | "block-start" | "block-end";

/** Size vocabulary inherited from {@link Button}; compact groups default to `xs`. */
export type InputGroupButtonSize = ButtonSize;

/**
 * Props for the {@link InputGroup} component.
 */
export type InputGroupProps = Readonly<React.ComponentPropsWithRef<"div">>;

/**
 * Props for the {@link InputGroupAddon} component.
 */
export interface InputGroupAddonProps extends React.ComponentPropsWithRef<"div"> {
  /** Position of the addon relative to the input control. @default "inline-start" */
  readonly align?: InputGroupAddonAlign;
}

/**
 * Props for the {@link InputGroupButton} component.
 */
export type InputGroupButtonProps = Button.Props;

/**
 * Props for the {@link InputGroupText} component.
 */
export type InputGroupTextProps = Readonly<React.ComponentPropsWithRef<"span">>;

/**
 * Props for the {@link InputGroupInput} component.
 */
export type InputGroupInputProps = Readonly<React.ComponentPropsWithRef<typeof Input>>;

/**
 * Props for the {@link InputGroupTextarea} component.
 */
export type InputGroupTextareaProps = Textarea.Props;

function getAddonAlignClass(align: InputGroupAddonAlign): string | undefined {
  switch (align) {
    case "block-end": {
      return styles.blockEnd;
    }
    case "block-start": {
      return styles.blockStart;
    }
    case "inline-end": {
      return styles.inlineEnd;
    }
    default: {
      return styles.inlineStart;
    }
  }
}

/**
 * Creates a composable shell for grouped text inputs and controls.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <InputGroup>
 *   <InputGroupInput aria-label='Search' />
 * </InputGroup>
 * ```
 *
 * @see {@link InputGroupProps} for available props
 */
const InputGroup = ({ref, className, ...props}: Readonly<InputGroupProps>): React.JSX.Element => (
  <div
    ref={ref}
    role='group'
    data-slot='input-group'
    className={cn(styles.group, className)}
    {...props}
  />
);

/**
 * Renders supplementary content around an input group control.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Pointer clicks only forward focus to the native control; keyboard users reach
 *   that control directly, so the addon has no separate action or tab stop
 *
 * @example
 * ```tsx
 * <InputGroupAddon align='inline-end'>.com</InputGroupAddon>
 * ```
 *
 * @see {@link InputGroupAddonProps} for available props
 */
const InputGroupAddon = ({
  ref,
  className,
  align = "inline-start",
  onClick,
  ...props
}: Readonly<InputGroupAddonProps>): React.JSX.Element => (
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- pointer focus convenience only; the labelled native control is the keyboard target, not this static adornment.
  <div
    ref={ref}
    data-slot='input-group-addon'
    data-align={align}
    className={cn(styles.addon, getAddonAlignClass(align), className)}
    onClick={(event): void => {
      onClick?.(event);

      if (
        event.defaultPrevented
        || (event.target instanceof Element && event.target.closest("button, [role='button'], a, input, textarea, select, label"))
      ) {
        return;
      }

      event.currentTarget.parentElement?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea")?.focus();
    }}
    {...props}
  />
);

/**
 * Renders a compact button matched to input group dimensions.
 *
 * @remarks
 * - Composes the real Base UI-backed `Button`, including its render state and sizes
 * - Ref targets `HTMLElement` for native and composed controls
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <InputGroupButton size='sm'>Search</InputGroupButton>
 * ```
 *
 * @see {@link InputGroupButtonProps} for available props
 */
const InputGroupButton = (props: Readonly<InputGroupButtonProps>): React.JSX.Element => {
  const {className, type = "button", variant = "ghost", size} = props;
  const buttonProps: Button.Props = size === undefined ? {...props, size: "xs"} : props;
  return (
    <Button
      {...buttonProps}
      type={type}
      data-slot='input-group-button'
      variant={variant}
      className={cn(styles.button, className)}
    />
  );
};

/**
 * Displays static inline text within an input group.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<span>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <InputGroupText>@</InputGroupText>
 * ```
 *
 * @see {@link InputGroupTextProps} for available props
 */
const InputGroupText = ({ref, className, ...props}: Readonly<InputGroupTextProps>): React.JSX.Element => (
  <span
    data-slot='input-group-text'
    ref={ref}
    className={cn(styles.text, className)}
    {...props}
  />
);

/**
 * Renders the primary input control inside an input group.
 *
 * @remarks
 * - Composes the real Base UI-backed `Input`, preserving primitive render/class state
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <InputGroupInput aria-label='Search' placeholder='Search...' />
 * ```
 *
 * @see {@link InputGroupInputProps} for available props
 */
const InputGroupInput = ({ref, className, ...props}: Readonly<InputGroupInputProps>): React.JSX.Element => (
  <Input
    ref={ref}
    data-slot='input-group-control'
    className={typeof className === "function" ? (state) => cn(styles.input, className(state)) : cn(styles.input, className)}
    {...props}
  />
);

/**
 * Renders a textarea control inside an input group.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a wrapped `Textarea` component
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <InputGroupTextarea aria-label='Message' rows={4} />
 * ```
 *
 * @see {@link InputGroupTextareaProps} for available props
 */
const InputGroupTextarea = ({ref, className, ...props}: Readonly<InputGroupTextareaProps>): React.JSX.Element => (
  <Textarea
    ref={ref}
    data-slot='input-group-control'
    className={cn(styles.textarea, className)}
    {...props}
  />
);

InputGroup.displayName = "InputGroup";
InputGroupAddon.displayName = "InputGroupAddon";
InputGroupButton.displayName = "InputGroupButton";
InputGroupText.displayName = "InputGroupText";
InputGroupInput.displayName = "InputGroupInput";
InputGroupTextarea.displayName = "InputGroupTextarea";

/* eslint-disable no-redeclare -- canonical component namespace typing API */
namespace InputGroup {
  export type Props = Readonly<InputGroupProps>;
}
namespace InputGroupAddon {
  export type Props = Readonly<InputGroupAddonProps>;
}
namespace InputGroupButton {
  export type Props = Readonly<InputGroupButtonProps>;
  export type State = Button.State;
}
namespace InputGroupText {
  export type Props = Readonly<InputGroupTextProps>;
}
namespace InputGroupInput {
  export type Props = Readonly<InputGroupInputProps>;
  export type State = Input.State;
}
namespace InputGroupTextarea {
  export type Props = Readonly<InputGroupTextareaProps>;
}
/* eslint-enable no-redeclare */

export {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea};
