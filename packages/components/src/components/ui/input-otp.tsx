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
export type InputOTPProps = Readonly<React.ComponentPropsWithRef<typeof OTPInput>>;

/**
 * Props for the {@link InputOTPGroup} component.
 */
export type InputOTPGroupProps = Readonly<React.ComponentPropsWithRef<"div">>;

/**
 * Props for the {@link InputOTPSlot} component.
 */
export interface InputOTPSlotProps extends Omit<React.ComponentPropsWithRef<"div">, "children"> {
  /** Zero-based slot index resolved from the shared OTP input context. */
  readonly index: number;
}

/**
 * Props for the {@link InputOTPSeparator} component.
 */
export type InputOTPSeparatorProps = Readonly<Omit<React.ComponentPropsWithRef<"div">, "children">>;

/**
 * Wraps the `input-otp` root component with shared library styling.
 *
 * @remarks
 * - Third-party wrapper component
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Forwards all supported `input-otp` root props to the underlying primitive
 * - Provide either slot children or a custom `render` callback, as required by input-otp
 * - Spell checking retains the dependency's false default; callers can opt in
 *
 * @example
 * ```tsx
 * <InputOTP maxLength={4} aria-label="Verification code">
 *   <InputOTPGroup>
 *     {[0, 1, 2, 3].map((index) => <InputOTPSlot key={index} index={index} />)}
 *   </InputOTPGroup>
 * </InputOTP>
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
 * <InputOTP
 *   maxLength={4}
 *   pasteTransformer={(text) => text.replace(/\D/g, "")}
 *   render={({slots}) => <output>{slots.map((slot) => slot.char).join("")}</output>}
 * />
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
const InputOTP = ({ref, className, containerClassName, ...props}: Readonly<InputOTPProps>): React.JSX.Element => (
  <OTPInput
    data-slot='input-otp'
    ref={ref}
    containerClassName={cn(styles.container, containerClassName)}
    className={cn(styles.input, className)}
    {...props}
  />
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
const InputOTPGroup = ({ref, className, ...props}: Readonly<InputOTPGroupProps>): React.JSX.Element => (
  <div
    data-slot='input-otp-group'
    ref={ref}
    className={cn(styles.group, className)}
    {...props}
  />
);

/**
 * Renders an individual OTP slot based on shared input context state.
 *
 * @remarks
 * - Third-party wrapper component
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Empty inactive slots display the primitive's placeholder, falling back to `·`
 * - Fake-caret slots suppress the placeholder while the backing input is focused
 * - Invalid indexes and slots outside an OTP root fail fast with an index error
 *
 * @example
 * ```tsx
 * <InputOTPSlot index={0} />
 * ```
 *
 * @see {@link InputOTPSlotProps} for available props
 * @see {@link https://github.com/guilhermerodz/input-otp | input-otp library docs}
 */
const InputOTPSlot = ({ref, index, className, ...props}: Readonly<InputOTPSlotProps>): React.JSX.Element => {
  const inputOTPContext = React.useContext(OTPInputContext);
  const slot = Number.isSafeInteger(index) && index >= 0 ? inputOTPContext.slots?.[index] : undefined;

  if (!slot) {
    throw new Error(`InputOTPSlot could not find slot at index ${index}.`);
  }

  const {char, hasFakeCaret, isActive, placeholderChar} = slot;
  const shouldRenderPlaceholderCharacter = char === null && hasFakeCaret === false;
  const displayCharacter = shouldRenderPlaceholderCharacter ? (placeholderChar ?? DEFAULT_SLOT_PLACEHOLDER_CHARACTER) : char;

  return (
    <div
      data-slot='input-otp-slot'
      data-active={isActive}
      ref={ref}
      className={cn(styles.slot, isActive && styles.slotActive, className)}
      aria-hidden='true'
      {...props}>
      {displayCharacter}
      {Boolean(hasFakeCaret) && (
        <div
          data-slot='input-otp-caret'
          aria-hidden='true'
          className={styles.fakeCaretContainer}>
          <div className={styles.fakeCaret} />
        </div>
      )}
    </div>
  );
};

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
const InputOTPSeparator = ({ref, className, ...props}: Readonly<InputOTPSeparatorProps>): React.JSX.Element => (
  <div
    data-slot='input-otp-separator'
    ref={ref}
    className={cn(styles.separator, className)}
    aria-hidden='true'
    {...props}>
    <Minus
      aria-hidden='true'
      className={styles.separatorIcon}
    />
  </div>
);

InputOTP.displayName = "InputOTP";
InputOTPGroup.displayName = "InputOTPGroup";
InputOTPSlot.displayName = "InputOTPSlot";
InputOTPSeparator.displayName = "InputOTPSeparator";

/* eslint-disable no-redeclare -- canonical component namespace typing API */
namespace InputOTP {
  export type Props = Readonly<InputOTPProps>;
}
namespace InputOTPGroup {
  export type Props = Readonly<InputOTPGroupProps>;
}
namespace InputOTPSlot {
  export type Props = Readonly<InputOTPSlotProps>;
  export type State = Readonly<SlotProps>;
}
namespace InputOTPSeparator {
  export type Props = Readonly<InputOTPSeparatorProps>;
}
/* eslint-enable no-redeclare */

export {InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot};
