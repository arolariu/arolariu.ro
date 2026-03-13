"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Separator as BaseSeparator} from "@base-ui/react/separator";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./separator.module.css";

/**
 * Props for the shared separator wrapper.
 */
export interface SeparatorProps extends Omit<React.ComponentPropsWithRef<typeof BaseSeparator>, "className"> {
  /** Additional CSS classes merged with the separator styles. */
  className?: string;
  /** The visual axis used when rendering the separator line. */
  orientation?: "horizontal" | "vertical";
  /** Legacy compatibility flag retained by the wrapper but not forwarded to Base UI. */
  decorative?: boolean;
}

/**
 * Renders a styled separator using Base UI's canonical render composition pattern.
 */
function Separator(props: Readonly<Separator.Props>): React.ReactElement {
  const {className, decorative: _decorative = true, orientation = "horizontal", render, ...otherProps} = props;

  return (
    <BaseSeparator
      orientation={orientation}
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps(
          {
            className: cn(styles.separator, orientation === "horizontal" ? styles.horizontal : styles.vertical, className),
          },
          {},
        ),
      })}
    />
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Separator {
  export type Props = SeparatorProps;
  export type State = BaseSeparator.State;
}

export {Separator};
