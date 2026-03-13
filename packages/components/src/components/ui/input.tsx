"use client";

import {Input as BaseInput} from "@base-ui/react/input";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./input.module.css";

const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<typeof BaseInput>>(({className, type, ...props}, ref) => (
  <BaseInput
    ref={ref}
    type={type}
    className={cn(styles.input, className)}
    {...props}
  />
));
Input.displayName = "Input";

export {Input};
