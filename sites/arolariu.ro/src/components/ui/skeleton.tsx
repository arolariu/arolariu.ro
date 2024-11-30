/** @format */

import {cn} from "@/lib/utils.generic";

/**
 *
 */
function Skeleton({className, ...props}: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      aria-live='polite'
      aria-busy='true'
      className={cn("animate-pulse rounded-md bg-slate-900/10 dark:bg-slate-50/10", className)}
      {...props}
    />
  );
}

export {Skeleton};

