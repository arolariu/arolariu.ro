"use client";

import {Checkbox as BaseCheckbox} from "@base-ui/react/checkbox";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./checkbox.module.css";

/**
 * Props for the shared checkbox wrapper.
 */
interface CheckboxProps extends Omit<React.ComponentPropsWithRef<typeof BaseCheckbox.Root>, "checked" | "className" | "onCheckedChange"> {
  /** Additional CSS classes merged with the checkbox control styles. @default undefined */
  className?: string;
  /** The current checked state, including support for the legacy `"indeterminate"` value. @default undefined */
  checked?: boolean | "indeterminate";
  /** Called whenever the checked state changes. @default undefined */
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
}

/**
 * Renders a selectable checkbox control with checked and indeterminate support.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/checkbox | Base UI Checkbox}
 * - Supports the `render` prop for element composition
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
    const {checked, className, onCheckedChange, render, ...otherProps} = props;
    const baseChecked = checked === "indeterminate" ? true : checked;
    const indeterminate = checked === "indeterminate";

    return (
      <BaseCheckbox.Root
        ref={ref}
        checked={baseChecked}
        indeterminate={indeterminate}
        onCheckedChange={onCheckedChange as React.ComponentPropsWithRef<typeof BaseCheckbox.Root>["onCheckedChange"]}
        {...otherProps}
        render={useRender({
          defaultTagName: "button",
          render: render as never,
          props: mergeProps({className: cn(styles.checkbox, className)}, {}),
        })}>
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
  },
);
Checkbox.displayName = "Checkbox";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Checkbox {
  export type Props = CheckboxProps;
  export type State = BaseCheckbox.Root.State;
}

export {Checkbox};
