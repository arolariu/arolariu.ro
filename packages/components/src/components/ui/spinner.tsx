import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./spinner.module.css";

/**
 * Props for the {@link Spinner} component.
 */
export interface SpinnerProps extends Readonly<React.ComponentPropsWithRef<"svg">> {
  /** Enables rotation unless reduced motion is requested. `false` retains a static indicator. @default true */
  readonly animated?: boolean;
}

/**
 * Renders an animated loading indicator.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders an `<svg>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Reduced motion or `animated={false}` retains the visible indicator and accessible status
 *
 * @example
 * ```tsx
 * <Spinner aria-label='Loading data' />
 * ```
 *
 * @see {@link SpinnerProps} for available props
 */
const Spinner = ({ref, children, className, animated = true, ...props}: Readonly<SpinnerProps>): React.JSX.Element => (
  <svg
    ref={ref}
    data-slot='spinner'
    data-animated={animated}
    role='status'
    aria-label={props["aria-label"] ?? "Loading"}
    viewBox='0 0 24 24'
    fill='none'
    className={cn(styles.spinner, className)}
    {...props}>
    {children}
    <circle
      className={styles.track}
      cx='12'
      cy='12'
      r='9'
      stroke='currentColor'
      strokeWidth='3'
    />
    <path
      className={styles.indicator}
      d='M21 12a9 9 0 0 0-9-9'
      stroke='currentColor'
      strokeWidth='3'
    />
  </svg>
);

Spinner.displayName = "Spinner";

// eslint-disable-next-line no-redeclare -- public component namespace
namespace Spinner {
  export type Props = SpinnerProps;
}

export {Spinner};
