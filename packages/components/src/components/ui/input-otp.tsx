"use client";

import {OTPInput, OTPInputContext} from "input-otp";
import {Minus} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./input-otp.module.css";

const InputOTP = React.forwardRef<React.ComponentRef<typeof OTPInput>, React.ComponentPropsWithoutRef<typeof OTPInput>>(
  ({className, containerClassName, ...props}, ref) => (
    <OTPInput
      ref={ref}
      containerClassName={cn(styles.container, containerClassName)}
      className={cn(styles.input, className)}
      {...props}
    />
  ),
);
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<React.ComponentRef<"div">, React.ComponentPropsWithoutRef<"div">>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.group, className)}
    {...props}
  />
));
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<React.ComponentRef<"div">, React.ComponentPropsWithoutRef<"div"> & {index: number}>(
  ({index, className, ...props}, ref) => {
    const inputOTPContext = React.useContext(OTPInputContext);
    const slot = inputOTPContext.slots[index];

    if (!slot) {
      throw new Error(`InputOTPSlot could not find slot at index ${index}.`);
    }

    const {char, hasFakeCaret, isActive} = slot;

    return (
      <div
        ref={ref}
        className={cn(styles.slot, isActive && styles.slotActive, className)}
        {...props}>
        {char}
        {Boolean(hasFakeCaret) && (
          <div className={styles.fakeCaretContainer}>
            <div className={styles.fakeCaret} />
          </div>
        )}
      </div>
    );
  },
);
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<React.ComponentRef<"div">, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}, ref) => (
    <div
      ref={ref}
      role='separator'
      className={cn(styles.separator, className)}
      {...props}>
      <Minus className={styles.separatorIcon} />
    </div>
  ),
);
InputOTPSeparator.displayName = "InputOTPSeparator";

export {InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot};
