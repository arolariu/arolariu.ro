"use client";

import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./spinner.module.css";

const Spinner = React.forwardRef<SVGSVGElement, React.ComponentPropsWithoutRef<"svg">>(
  ({children, className, ...props}: Readonly<React.ComponentPropsWithoutRef<"svg">>, ref): React.JSX.Element => (
    <svg
      ref={ref}
      role='status'
      aria-label={props["aria-label"] ?? "Loading"}
      viewBox='0 0 24 24'
      fill='none'
      className={cn(styles.spinner, className)}
      {...props}>
      {children}
      <circle
        className={styles.track}
        cx='12'
        cy='12'
        r='9'
        stroke='currentColor'
        strokeWidth='3'
      />
      <path
        className={styles.indicator}
        d='M21 12a9 9 0 0 0-9-9'
        stroke='currentColor'
        strokeWidth='3'
      />
    </svg>
  ),
);
Spinner.displayName = "Spinner";

export {Spinner};
