"use client";

import {OTPInput, OTPInputContext} from "input-otp";
import {Minus} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";

const InputOTP = React.forwardRef<React.ComponentRef<typeof OTPInput>, React.ComponentPropsWithoutRef<typeof OTPInput>>(
  ({className, containerClassName, ...props}, ref) => (
    <OTPInput
      ref={ref}
      containerClassName={cn("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  ),
);
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<React.ComponentRef<"div">, React.ComponentPropsWithoutRef<"div">>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center", className)}
    {...props}
  />
));
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<React.ComponentRef<"div">, React.ComponentPropsWithoutRef<"div"> & {index: number}>(
  ({index, className, ...props}, ref) => {
    const inputOTPContext = React.useContext(OTPInputContext);
    const {char, hasFakeCaret, isActive} = inputOTPContext.slots[index];

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center border-y border-r border-neutral-200 text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md dark:border-neutral-800",
          isActive && "z-10 ring-1 ring-neutral-950 dark:ring-neutral-300",
          className,
        )}
        {...props}>
        {char}
        {Boolean(hasFakeCaret) && (
          <div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
            <div className='animate-caret-blink h-4 w-px bg-neutral-950 duration-1000 dark:bg-neutral-50' />
          </div>
        )}
      </div>
    );
  },
);
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<React.ComponentRef<"div">, React.ComponentPropsWithoutRef<"div">>(({...props}, ref) => (
  <div
    ref={ref}
    role='separator'
    {...props}>
    <Minus />
  </div>
));
InputOTPSeparator.displayName = "InputOTPSeparator";

export {InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot};
