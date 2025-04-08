"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";
import { cn } from "./../../lib/utils";

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number;
}) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const slot = inputOTPContext.slots[index];
  const { char, hasFakeCaret, isActive } = slot || {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "border-neutral-200 data-[active=true]:border-neutral-950 data-[active=true]:ring-neutral-950/50 data-[active=true]:aria-invalid:ring-red-500/20 dark:data-[active=true]:aria-invalid:ring-red-500/40 aria-invalid:border-red-500 data-[active=true]:aria-invalid:border-red-500 relative flex h-9 w-9 items-center justify-center border-y border-r text-sm shadow-2xs transition-all outline-hidden first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px] dark:border-neutral-800 dark:data-[active=true]:border-neutral-300 dark:data-[active=true]:ring-neutral-300/50 dark:data-[active=true]:aria-invalid:ring-red-900/20 dark:dark:data-[active=true]:aria-invalid:ring-red-900/40 dark:aria-invalid:border-red-900 dark:data-[active=true]:aria-invalid:border-red-900",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-neutral-950 h-4 w-px duration-1000 dark:bg-neutral-50" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
