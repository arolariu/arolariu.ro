"use client";

import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as React from "react";

import {cn} from "@/lib/utilities";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot='separator'
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-neutral-200 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px dark:bg-neutral-800",
        className,
      )}
      {...props}
    />
  );
}

export {Separator};
