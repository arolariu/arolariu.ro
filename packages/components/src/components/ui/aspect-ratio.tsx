"use client";

import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./aspect-ratio.module.css";

export interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: number | string;
}

const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
  ({className, ratio = 1, style, ...props}: Readonly<AspectRatioProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      className={cn(styles.root, className)}
      style={{...style, aspectRatio: String(ratio)}}
      {...props}
    />
  ),
);
AspectRatio.displayName = "AspectRatio";

export {AspectRatio};
