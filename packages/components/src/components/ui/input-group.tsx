"use client";

import * as React from "react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {cn} from "@/lib/utilities";
import styles from "./input-group.module.css";

/** Supported alignment options for {@link InputGroupAddon}. */
export type InputGroupAddonAlign = "inline-start" | "inline-end" | "block-start" | "block-end";

/** Supported compact button sizes for {@link InputGroupButton}. */
export type InputGroupButtonSize = "xs" | "sm" | "icon-xs" | "icon-sm";

/**
 * Props for the {@link InputGroup} component.
 */
export type InputGroupProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Props for the {@link InputGroupAddon} component.
 */
export interface InputGroupAddonProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Position of the addon relative to the input control. @default "inline-start" */
  align?: InputGroupAddonAlign;
}

/**
 * Props for the {@link InputGroupButton} component.
 */
export interface InputGroupButtonProps extends Omit<React.ComponentPropsWithoutRef<typeof Button>, "size"> {
  /** Compact button size used within the group chrome. @default "xs" */
  size?: InputGroupButtonSize;
}

/**
 * Props for the {@link InputGroupText} component.
 */
export type InputGroupTextProps = React.ComponentPropsWithoutRef<"span">;

/**
 * Props for the {@link InputGroupInput} component.
 */
export type InputGroupInputProps = React.ComponentPropsWithoutRef<"input">;

/**
 * Props for the {@link InputGroupTextarea} component.
 */
export type InputGroupTextareaProps = React.ComponentPropsWithoutRef<"textarea">;

function getAddonAlignClass(align: InputGroupAddonAlign): string {
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

function getButtonSizeClass(size: InputGroupButtonSize): string {
  switch (size) {
    case "icon-sm": {
      return styles.buttonIconSm;
    }
    case "icon-xs": {
      return styles.buttonIconXs;
    }
    case "sm": {
      return styles.buttonSm;
    }
    default: {
      return styles.buttonXs;
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
 *   <InputGroupInput />
 * </InputGroup>
 * ```
 *
 * @see {@link InputGroupProps} for available props
 */
const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({className, ...props}: Readonly<InputGroupProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      role='group'
      data-slot='input-group'
      className={cn(styles.group, className)}
      {...props}
    />
  ),
);

/**
 * Renders supplementary content around an input group control.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <InputGroupAddon align='inline-end'>.com</InputGroupAddon>
 * ```
 *
 * @see {@link InputGroupAddonProps} for available props
 */
const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({className, align = "inline-start", onClick, ...props}: Readonly<InputGroupAddonProps>, ref): React.JSX.Element => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- clicking the addon focuses the related control.
    <div
      ref={ref}
      role='group'
      data-slot='input-group-addon'
      data-align={align}
      className={cn(styles.addon, getAddonAlignClass(align), className)}
      onClick={(event): void => {
        if ((event.target as HTMLElement).closest("button")) {
          onClick?.(event);
          return;
        }

        onClick?.(event);

        if (event.defaultPrevented) {
          return;
        }

        event.currentTarget.parentElement?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea")?.focus();
      }}
      {...props}
    />
  ),
);

/**
 * Renders a compact button matched to input group dimensions.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a wrapped `Button` component
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <InputGroupButton size='sm'>Search</InputGroupButton>
 * ```
 *
 * @see {@link InputGroupButtonProps} for available props
 */
const InputGroupButton = React.forwardRef<HTMLButtonElement, InputGroupButtonProps>(
  ({className, type = "button", variant = "ghost", size = "xs", ...props}: Readonly<InputGroupButtonProps>, ref): React.JSX.Element => (
    <Button
      ref={ref}
      type={type}
      data-size={size}
      variant={variant}
      className={cn(styles.button, getButtonSizeClass(size), className)}
      {...props}
    />
  ),
);

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
const InputGroupText = React.forwardRef<HTMLSpanElement, InputGroupTextProps>(
  ({className, ...props}: Readonly<InputGroupTextProps>, ref): React.JSX.Element => (
    <span
      ref={ref}
      className={cn(styles.text, className)}
      {...props}
    />
  ),
);

/**
 * Renders the primary input control inside an input group.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a wrapped `Input` component
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <InputGroupInput placeholder='Search...' />
 * ```
 *
 * @see {@link InputGroupInputProps} for available props
 */
const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(
  ({className, ...props}: Readonly<InputGroupInputProps>, ref): React.JSX.Element => (
    <Input
      ref={ref}
      data-slot='input-group-control'
      className={cn(styles.input, className)}
      {...props}
    />
  ),
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
 * <InputGroupTextarea rows={4} />
 * ```
 *
 * @see {@link InputGroupTextareaProps} for available props
 */
const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, InputGroupTextareaProps>(
  ({className, ...props}: Readonly<InputGroupTextareaProps>, ref): React.JSX.Element => (
    <Textarea
      ref={ref}
      data-slot='input-group-control'
      className={cn(styles.textarea, className)}
      {...props}
    />
  ),
);

InputGroup.displayName = "InputGroup";
InputGroupAddon.displayName = "InputGroupAddon";
InputGroupButton.displayName = "InputGroupButton";
InputGroupText.displayName = "InputGroupText";
InputGroupInput.displayName = "InputGroupInput";
InputGroupTextarea.displayName = "InputGroupTextarea";

export {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea};
