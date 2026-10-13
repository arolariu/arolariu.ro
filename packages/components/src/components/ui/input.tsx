"use client";

import {Input as BaseInput} from "@base-ui/react/input";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./input.module.css";

/**
 * Props for the shared input wrapper.
 */
export type InputProps = Readonly<React.ComponentPropsWithRef<typeof BaseInput>>;

/**
 * Renders a styled Base UI input while preserving native form contracts.
 *
 * @remarks
 * - Renders an `<input>` element by default
 * - Built on {@link https://base-ui.com/react/components/input | Base UI Input}
 * - Supports the `render` prop for element composition
 * - Primitive-owned `render` and `className` callbacks receive actual field state
 * - The ref targets `HTMLElement` to support composed render targets
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Input type="email" placeholder="name@example.com" />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/input | Base UI Documentation}
 */
const Input = React.forwardRef<React.ComponentRef<typeof BaseInput>, Input.Props>(
  (props: Readonly<Input.Props>, ref): React.ReactElement => {
    const {className, ...otherProps} = props;

    return (
      <BaseInput
        data-slot='input'
        {...otherProps}
        ref={ref}
        className={typeof className === "function" ? (state) => cn(styles.input, className(state)) : cn(styles.input, className)}
      />
    );
  },
);
Input.displayName = "Input";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Input {
  export type Props = Readonly<InputProps>;
  export type State = BaseInput.State;
  export type ChangeEventDetails = BaseInput.ChangeEventDetails;
}

export {Input};
