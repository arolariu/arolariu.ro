"use client";

import {Progress as BaseProgress} from "@base-ui/react/progress";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./progress.module.css";

/**
 * Props for the shared progress wrapper.
 */
export interface ProgressProps extends Omit<React.ComponentPropsWithRef<typeof BaseProgress.Root>, "value"> {
  /** Additional CSS classes merged with the progress track styles. @default undefined */
  className?: string;
  /** The current completion percentage or normalized value rendered by the progress bar. @default 0 */
  value?: number;
}

/**
 * Visualizes task completion with a styled track and animated indicator.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/progress | Base UI Progress}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Progress value={64} />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/progress | Base UI Documentation}
 */
function Progress(props: Readonly<Progress.Props>): React.ReactElement {
  const {className, render, value = 0, ...otherProps} = props;

  return (
    <BaseProgress.Root
      value={value}
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
      })}>
      <BaseProgress.Track className={cn(styles.track, className)}>
        <BaseProgress.Indicator className={styles.indicator} />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}
Progress.displayName = "Progress";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Progress {
  export type Props = ProgressProps;
  export type State = BaseProgress.Root.State;
}

export {Progress};
