"use client";

import {Checkbox as BaseCheckbox} from "@base-ui/react/checkbox";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./checkbox.module.css";

/** V1 compatibility — Radix used checked: boolean | "indeterminate" */
interface CheckboxProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root>, "checked" | "onCheckedChange"> {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(({className, checked, onCheckedChange, ...props}, ref) => {
  const baseChecked = checked === "indeterminate" ? true : checked;
  const indeterminate = checked === "indeterminate";

  return (
    <BaseCheckbox.Root
      ref={ref}
      className={cn(styles.checkbox, className)}
      checked={baseChecked}
      indeterminate={indeterminate}
      onCheckedChange={onCheckedChange as never}
      {...props}>
      <BaseCheckbox.Indicator className={styles.indicator}>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='3'
          strokeLinecap='round'
          strokeLinejoin='round'>
          <polyline points='20 6 9 17 4 12' />
        </svg>
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
});
Checkbox.displayName = "Checkbox";

export {Checkbox};
