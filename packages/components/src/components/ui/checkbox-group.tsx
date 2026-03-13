"use client";

import {CheckboxGroup as BaseCheckboxGroup} from "@base-ui/react/checkbox-group";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./checkbox-group.module.css";

type CheckboxGroupProps = React.ComponentPropsWithoutRef<typeof BaseCheckboxGroup>;

/**
 * Wraps the Base UI checkbox group with compact stacked spacing.
 */
const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
  ({className, ...props}: Readonly<CheckboxGroupProps>, ref): React.JSX.Element => (
    <BaseCheckboxGroup
      ref={ref}
      className={cn(styles.group, className)}
      {...props}
    />
  ),
);
CheckboxGroup.displayName = "CheckboxGroup";

export {CheckboxGroup};
