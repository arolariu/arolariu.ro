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
  /** Additional CSS classes merged with the input styles. */
  className?: string;
  /** The HTML input type forwarded to the underlying control. */
  type?: React.HTMLInputTypeAttribute;
}

/**
 * Renders a styled Base UI input using the canonical render composition pattern.
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

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Input {
  export type Props = InputProps;
  export type State = BaseInput.State;
}

export {Input};
