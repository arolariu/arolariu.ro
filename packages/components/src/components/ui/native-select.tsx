import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./native-select.module.css";

/** Visual height of a native select, independent of the HTML row-count attribute. */
export type NativeSelectSize = "sm" | "default";

/** Native select attributes with a logical visual size instead of a row count. */
export interface NativeSelectProps extends Omit<React.ComponentPropsWithRef<"select">, "size"> {
  /** Visual size applied to the wrapper and control. @default "default" */
  readonly size?: NativeSelectSize;
}

/** Native option attributes, including its value, label and disabled state. */
export type NativeSelectOptionProps = React.ComponentPropsWithRef<"option">;

/** Native optgroup attributes, including its required accessible label. */
export type NativeSelectOptGroupProps = React.ComponentPropsWithRef<"optgroup">;

/**
 * Renders a styled native select with a decorative chevron.
 *
 * @remarks
 * The caller supplies the accessible label and native options. Native form,
 * selection and keyboard behavior are unchanged. `className` styles the outer
 * wrapper; the ref and all other native attributes target the `<select>`.
 * No client context or hooks are required, so static usage is server-compatible.
 *
 * @param props - Native select attributes and optional logical size.
 * @param props.ref - React 19 ref to the native select, not the decorative wrapper.
 * @returns A native select and noninteractive chevron inside a sized wrapper.
 *
 * @example
 * ```tsx
 * <label htmlFor="fruit">Fruit</label>
 * <NativeSelect id="fruit" name="fruit" defaultValue="pear">
 *   <NativeSelectOption value="pear">Pear</NativeSelectOption>
 * </NativeSelect>
 * ```
 */
const NativeSelect = ({ref, className, size = "default", ...props}: Readonly<NativeSelectProps>): React.JSX.Element => (
  <div
    data-slot='native-select-wrapper'
    data-size={size}
    className={cn(styles.wrapper, className)}>
    <select
      ref={ref}
      data-slot='native-select'
      data-size={size}
      className={styles.select}
      {...props}
    />
    <svg
      data-slot='native-select-icon'
      className={styles.icon}
      aria-hidden='true'
      focusable='false'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'>
      <path d='m6 9 6 6 6-6' />
    </svg>
  </div>
);
NativeSelect.displayName = "NativeSelect";

/**
 * Renders an option using the platform's native selection and form semantics.
 *
 * @param props - Native option attributes and optional additional CSS classes.
 * @param props.ref - React 19 ref to the underlying HTML option.
 * @returns A native option styled with the system Canvas colors.
 */
const NativeSelectOption = ({ref, className, ...props}: Readonly<NativeSelectOptionProps>): React.JSX.Element => (
  <option
    ref={ref}
    data-slot='native-select-option'
    className={cn(styles.option, className)}
    {...props}
  />
);
NativeSelectOption.displayName = "NativeSelectOption";

/**
 * Groups native options under the caller's label.
 *
 * @param props - Native optgroup attributes, including label and disabled state.
 * @param props.ref - React 19 ref to the underlying HTML optgroup.
 * @returns A native optgroup styled with the system Canvas colors.
 */
const NativeSelectOptGroup = ({ref, className, ...props}: Readonly<NativeSelectOptGroupProps>): React.JSX.Element => (
  <optgroup
    ref={ref}
    data-slot='native-select-optgroup'
    className={cn(styles.optGroup, className)}
    {...props}
  />
);
NativeSelectOptGroup.displayName = "NativeSelectOptGroup";

// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace NativeSelect {
  /** Native select props, including its React 19 ref. */
  export type Props = NativeSelectProps;
}

// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace NativeSelectOption {
  /** Native option props, including its React 19 ref. */
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- preserves the public NativeSelectOption.Props namespace alongside the named props export
  export type Props = NativeSelectOptionProps;
}

// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace NativeSelectOptGroup {
  /** Native optgroup props, including its React 19 ref. */
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- preserves the public NativeSelectOptGroup.Props namespace alongside the named props export
  export type Props = NativeSelectOptGroupProps;
}

export {NativeSelect, NativeSelectOptGroup, NativeSelectOption};
