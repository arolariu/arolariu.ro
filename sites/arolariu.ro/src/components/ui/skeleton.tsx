import {cn} from "@/lib/utils.generic";
import React from "react";

/**
 * Component that renders a skeleton.
 * @param props The component props.
 * @returns The rendered component.
 */
function Skeleton({className, ...props}: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-900/10 dark:bg-slate-50/10", className)}
      {...props}
    />
  );
}

export {Skeleton};
