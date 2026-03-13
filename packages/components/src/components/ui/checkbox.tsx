"use client";

import {Checkbox as BaseCheckbox} from "@base-ui/react/checkbox";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./checkbox.module.css";

/**
 * Represents the configurable props for the Checkbox component.
 *
 * @remarks
 * This compatibility wrapper preserves the library's historical `"indeterminate"`
 * checked state API while adapting it to the Base UI checkbox primitive.
 */
interface CheckboxProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root>, "checked" | "onCheckedChange"> {
  /**
   * Additional CSS classes merged with the checkbox control styles.
   */
  className?: string;
  /**
   * The current checked state, including support for the legacy `"indeterminate"` value.
   */
  checked?: boolean | "indeterminate";
  /**
   * Called whenever the checked state changes.
   */
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
}

/**
 * A checkbox control with support for checked, unchecked, and indeterminate states.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI checkbox primitive and maps the legacy shared-library state model
 * to Base UI's `checked` plus `indeterminate` props. The indicator icon is rendered
 * inline to keep the component self-contained and theme-aware.
 *
 * @example
 * ```tsx
 * <Checkbox checked="indeterminate" aria-label="Select all rows" />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/checkbox Base UI Checkbox docs}
 */
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
