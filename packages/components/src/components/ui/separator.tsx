"use client";

import {Separator as BaseSeparator} from "@base-ui/react/separator";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./separator.module.css";

export interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof BaseSeparator> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({className, orientation = "horizontal", decorative = true, ...props}, ref) => (
    <BaseSeparator
      ref={ref}
      className={cn(styles.separator, orientation === "horizontal" ? styles.horizontal : styles.vertical, className)}
      {...props}
    />
  ),
);
Separator.displayName = "Separator";

export {Separator};
