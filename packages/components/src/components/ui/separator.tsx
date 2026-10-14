"use client";

import {Separator as BaseSeparator} from "@base-ui/react/separator";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./separator.module.css";

/**
 * Props for the shared separator wrapper.
 */
export interface SeparatorProps extends Readonly<React.ComponentPropsWithRef<typeof BaseSeparator>> {
  /** The visual axis used when rendering the separator line. @default "horizontal" */
  readonly orientation?: "horizontal" | "vertical";
}

/**
 * Separates adjacent content areas with a horizontal or vertical rule.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/separator | Base UI Separator}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Separator />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/separator | Base UI Documentation}
 */
const Separator = ({ref: forwardedRef, ...props}: Readonly<Separator.Props>): React.JSX.Element => {
  const {className, orientation = "horizontal", render, ...otherProps} = props;

  return (
    <BaseSeparator
      orientation={orientation}
      data-slot='separator'
      {...otherProps}
      ref={forwardedRef}
      render={render}
      className={(state) =>
        cn(
          styles.separator,
          state.orientation === "horizontal" ? styles.horizontal : styles.vertical,
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  );
};
Separator.displayName = "Separator";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Separator {
  export type Props = Readonly<SeparatorProps>;
  export type State = BaseSeparator.State;
}

export {Separator};
