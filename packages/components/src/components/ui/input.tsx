"use client";

import * as React from "react";
import { cn } from "./../../lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-neutral-200 file:text-neutral-950 placeholder:text-neutral-500 selection:bg-neutral-900 selection:text-neutral-50 flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-2xs transition-[color,box-shadow] outline-hidden file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-neutral-800 dark:file:text-neutral-50 dark:placeholder:text-neutral-400 dark:selection:bg-neutral-50 dark:selection:text-neutral-900",
        "focus-visible:border-neutral-950 focus-visible:ring-neutral-950/50 focus-visible:ring-[3px] dark:focus-visible:border-neutral-300 dark:focus-visible:ring-neutral-300/50",
        "aria-invalid:ring-red-500/20 dark:aria-invalid:ring-red-500/40 aria-invalid:border-red-500 dark:aria-invalid:ring-red-900/20 dark:dark:aria-invalid:ring-red-900/40 dark:aria-invalid:border-red-900",
        className
      )}
      {...props}
    />
  );
}

export { Input };
