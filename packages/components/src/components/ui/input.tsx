"use client";

import {Input as BaseInput} from "@base-ui/react/input";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./input.module.css";

/**
 * Props for the shared input wrapper.
 */
export interface InputProps extends Omit<React.ComponentPropsWithRef<typeof BaseInput>, "className"> {
  /** Additional CSS classes merged with the input styles. @default undefined */
  className?: string;
  /** The HTML input type forwarded to the underlying control. @default undefined */
  type?: React.HTMLInputTypeAttribute;
}

/**
 * Renders a styled text input for free-form single-line entry.
 *
 * @remarks
 * - Renders an `<input>` element by default
 * - Built on {@link https://base-ui.com/react/components/input | Base UI Input}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Input type="email" placeholder="name@example.com" />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/input | Base UI Documentation}
 */
function Input(props: Readonly<Input.Props>): React.ReactElement {
  const {className, render, type, ...otherProps} = props;

  return (
    <BaseInput
      type={type}
      {...otherProps}
      render={useRender({
        defaultTagName: "input",
        render: render as never,
        props: mergeProps({className: cn(styles.input, className)}, {}),
      })}
    />
  );
}
Input.displayName = "Input";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Input {
  export type Props = InputProps;
  export type State = BaseInput.State;
}

export {Input};
