"use client";

import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./textarea.module.css";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentPropsWithoutRef<"textarea">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"textarea">>, ref): React.JSX.Element => (
    <textarea
      ref={ref}
      className={cn(styles.textarea, className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export {Textarea};
