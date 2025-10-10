"use client";

import {cn} from "@/lib/utilities";
import * as React from "react";

function Kbd({className, ...props}: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot='kbd'
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-neutral-100 px-1 font-sans text-xs font-medium text-neutral-500 select-none dark:bg-neutral-800 dark:text-neutral-400",
        "[&_svg:not([class*='size-'])]:size-3",
        "[[data-slot=tooltip-content]_&]:bg-white/20 [[data-slot=tooltip-content]_&]:text-white dark:[[data-slot=tooltip-content]_&]:bg-neutral-950/20 dark:[[data-slot=tooltip-content]_&]:bg-white/10 dark:dark:[[data-slot=tooltip-content]_&]:bg-neutral-950/10 dark:[[data-slot=tooltip-content]_&]:text-neutral-950",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({className, ...props}: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot='kbd-group'
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

export {Kbd, KbdGroup};
