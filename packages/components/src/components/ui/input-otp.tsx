"use client";

import {
  OTPInput,
  OTPInputContext,
  REGEXP_ONLY_CHARS,
  REGEXP_ONLY_DIGITS,
  REGEXP_ONLY_DIGITS_AND_CHARS,
  type OTPInputProps,
  type SlotProps,
} from "input-otp";
import {Minus} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./input-otp.module.css";

const DEFAULT_SLOT_PLACEHOLDER_CHARACTER = "·";

export {REGEXP_ONLY_CHARS, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS};
export type {OTPInputProps, SlotProps};

/**
 * Props for the {@link InputOTP} component.
 */
export type InputOTPProps = React.ComponentPropsWithoutRef<typeof OTPInput>;

/**
 * Props for the {@link InputOTPGroup} component.
 */
export type InputOTPGroupProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Props for the {@link InputOTPSlot} component.
 */
export interface InputOTPSlotProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Zero-based slot index resolved from the shared OTP input context. */
  index: number;
}

/**
 * Props for the {@link InputOTPSeparator} component.
 */
export type InputOTPSeparatorProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Wraps the `input-otp` root component with shared library styling.
 *
 * @remarks
 * - Third-party wrapper component
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Forwards all supported `input-otp` root props to the underlying primitive
 *
 * @example
 * ```tsx
 * <InputOTP maxLength={6} />
 * ```
 *
 * @param props.maxLength - Required OTP length used to generate the expected number of slots.
 * @param props.pattern - Optional validation pattern forwarded to the underlying input, often paired with
 * `REGEXP_ONLY_DIGITS`, `REGEXP_ONLY_CHARS`, or `REGEXP_ONLY_DIGITS_AND_CHARS`.
 * @param props.onComplete - Callback invoked after the user fills all slots with a complete value.
 * @param props.pushPasswordManagerStrategy - Controls how password manager UI is handled inside the input
 * container.
 * @param props.render - Custom render function for complete control over OTP input rendering. Receives
 * slot data array and allows fully custom layouts.
 * @param props.pasteTransformer - Transform pasted text before it is applied. Useful for stripping
 * spaces or dashes from pasted codes.
 * @example
 * ```tsx
 * <InputOTP pasteTransformer={(text) => text.replace(/\D/g, "")} />
 * ```
 * @param props.value - Controlled OTP value. Use with `onChange` for controlled mode.
 * @param props.onChange - Callback fired when the OTP value changes in controlled mode.
 * @param props.containerClassName - Additional CSS class for the outer container element.
 * @param props.noScriptCSSFallback - CSS string to inject for no-JavaScript fallback styling.
 * @param props.textAlign - Sets how typed characters are aligned inside the hidden backing input.
 * @see {@link InputOTPProps} for available props
 * @see {@link https://github.com/guilhermerodz/input-otp | input-otp library docs}
 * @see {@link https://github.com/guilhermerodz/input-otp | input-otp API reference}
 */
const InputOTP = React.forwardRef<React.ComponentRef<typeof OTPInput>, InputOTPProps>(
  ({className, containerClassName, ...props}: Readonly<InputOTPProps>, ref): React.JSX.Element => (
    <OTPInput
      ref={ref}
      containerClassName={cn(styles.container, containerClassName)}
      className={cn(styles.input, className)}
      {...props}
    />
  ),
);

/**
 * Groups OTP slots into a shared layout row.
 *
 * @remarks
 * - Third-party wrapper component
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <InputOTPGroup>
 *   <InputOTPSlot index={0} />
 * </InputOTPGroup>
 * ```
 *
 * @see {@link InputOTPGroupProps} for available props
 * @see {@link https://github.com/guilhermerodz/input-otp | input-otp library docs}
 */
const InputOTPGroup = React.forwardRef<React.ComponentRef<"div">, InputOTPGroupProps>(
  ({className, ...props}: Readonly<InputOTPGroupProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      className={cn(styles.group, className)}
      {...props}
    />
  ),
);

/**
 * Renders an individual OTP slot based on shared input context state.
 *
 * @remarks
 * - Third-party wrapper component
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <InputOTPSlot index={0} />
 * ```
 *
 * @see {@link InputOTPSlotProps} for available props
 * @see {@link https://github.com/guilhermerodz/input-otp | input-otp library docs}
 */
const InputOTPSlot = React.forwardRef<React.ComponentRef<"div">, InputOTPSlotProps>(
  ({index, className, ...props}: Readonly<InputOTPSlotProps>, ref): React.JSX.Element => {
    const inputOTPContext = React.useContext(OTPInputContext);
    const slot = inputOTPContext.slots[index];

    if (!slot) {
      throw new Error(`InputOTPSlot could not find slot at index ${index}.`);
    }

    const {char, hasFakeCaret, isActive, placeholderChar} = slot;
    const shouldRenderPlaceholderCharacter = char === null && hasFakeCaret === false;
    const displayCharacter = shouldRenderPlaceholderCharacter ? (placeholderChar ?? DEFAULT_SLOT_PLACEHOLDER_CHARACTER) : char;

    return (
      <div
        ref={ref}
        className={cn(styles.slot, isActive && styles.slotActive, className)}
        {...props}>
        {displayCharacter}
        {Boolean(hasFakeCaret) && (
          <div className={styles.fakeCaretContainer}>
            <div className={styles.fakeCaret} />
          </div>
        )}
      </div>
    );
  },
);

/**
 * Displays a visual separator between OTP groups.
 *
 * @remarks
 * - Third-party wrapper component
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <InputOTPSeparator />
 * ```
 *
 * @see {@link InputOTPSeparatorProps} for available props
 * @see {@link https://github.com/guilhermerodz/input-otp | input-otp library docs}
 */
const InputOTPSeparator = React.forwardRef<React.ComponentRef<"div">, InputOTPSeparatorProps>(
  ({className, ...props}: Readonly<InputOTPSeparatorProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      role='separator'
      className={cn(styles.separator, className)}
      {...props}>
      <Minus className={styles.separatorIcon} />
    </div>
  ),
);

InputOTP.displayName = "InputOTP";
InputOTPGroup.displayName = "InputOTPGroup";
InputOTPSlot.displayName = "InputOTPSlot";
InputOTPSeparator.displayName = "InputOTPSeparator";

export {InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot};
