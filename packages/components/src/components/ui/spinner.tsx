"use client";

import {cn} from "@/lib/utilities";
import {Loader2Icon} from "lucide-react";
import * as React from "react";

function Spinner({className, ...props}: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role='status'
      aria-label='Loading'
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export {Spinner};
