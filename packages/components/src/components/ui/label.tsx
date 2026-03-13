"use client";

import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./label.module.css";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({className, ...props}, ref) => (
  <label
    ref={ref}
    className={cn(styles.label, className)}
    {...props}
  />
));
Label.displayName = "Label";

export {Label};
