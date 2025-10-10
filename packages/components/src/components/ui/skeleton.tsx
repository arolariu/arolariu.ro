"use client";

import {cn} from "@/lib/utilities";
import * as React from "react";

function Skeleton({className, ...props}: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-neutral-900/10 dark:bg-neutral-50/10", className)}
      {...props}
    />
  );
}

export {Skeleton};
