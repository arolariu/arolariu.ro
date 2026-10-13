"use client";

import {Checkbox as BaseCheckbox} from "@base-ui/react/checkbox";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./checkbox.module.css";

/** Primitive-owned checkbox and Field state passed to render and class callbacks. */
export type CheckboxState = BaseCheckbox.Root.State;

/** Readonly primitive props, retaining the legacy checked="indeterminate" shorthand. */
export type CheckboxProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseCheckbox.Root>, "checked">
    & Partial<{
      /**
       * Only the explicit legacy string maps to checked=true and indeterminate=true.
       * Boolean/omitted checked values preserve the primitive's indeterminate prop.
       * onCheckedChange always receives a boolean and the original cancellable details.
       */
      checked: boolean | "indeterminate" | undefined;
    }>
>;

/**
 * Renders a selectable checkbox control with checked and indeterminate support.
 *
 * @remarks
 * - Renders the primitive's `<span>` and a hidden native input by default
 * - Built on {@link https://base-ui.com/react/components/checkbox | Base UI Checkbox}
 * - Render/class callbacks receive live primitive state, including Field state
 * - Set nativeButton=true with render={<button />} for a native button target
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Checkbox checked />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/checkbox | Base UI Documentation}
 */
const Checkbox = React.forwardRef<React.ComponentRef<typeof BaseCheckbox.Root>, Checkbox.Props>(
  (props: Readonly<Checkbox.Props>, ref): React.ReactElement => {
    const {checked, indeterminate, className, ...otherProps} = props;

    return (
      <BaseCheckbox.Root
        ref={ref}
        {...otherProps}
        data-slot='checkbox'
        checked={checked === "indeterminate" ? true : checked}
        indeterminate={checked === "indeterminate" ? true : indeterminate}
        className={(state) => cn(styles.checkbox, typeof className === "function" ? className(state) : className)}>
        <BaseCheckbox.Indicator
          data-slot='checkbox-indicator'
          className={styles.indicator}>
          <svg
            aria-hidden='true'
            className={styles.check}
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='3'
            strokeLinecap='round'
            strokeLinejoin='round'>
            <polyline points='20 6 9 17 4 12' />
          </svg>
          <svg
            aria-hidden='true'
            className={styles.mixed}
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='3'>
            <path d='M4 12h16' />
          </svg>
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
    );
  },
);
Checkbox.displayName = "Checkbox";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Checkbox {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- preserves the documented component namespace API alongside named props
  export type Props = CheckboxProps;
  export type State = BaseCheckbox.Root.State;
}

export {Checkbox};
