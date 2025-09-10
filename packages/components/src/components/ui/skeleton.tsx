"use client";

import {cn} from "@/lib/utils";
import * as React from "react";

function Skeleton({className, ...props}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='skeleton'
      className={cn("animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800", className)}
      {...props}
    />
  );
}

export {Skeleton};
