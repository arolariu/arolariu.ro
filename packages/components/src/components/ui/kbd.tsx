"use client";

import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./kbd.module.css";

const Kbd = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<"kbd">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"kbd">>, ref): React.JSX.Element => (
    <kbd
      ref={ref}
      data-slot='kbd'
      className={cn(styles.kbd, className)}
      {...props}
    />
  ),
);
Kbd.displayName = "Kbd";

const KbdGroup = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<"kbd">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"kbd">>, ref): React.JSX.Element => (
    <kbd
      ref={ref}
      data-slot='kbd-group'
      className={cn(styles.group, className)}
      {...props}
    />
  ),
);
KbdGroup.displayName = "KbdGroup";

export {Kbd, KbdGroup};
