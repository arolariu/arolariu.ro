"use client";

import {Progress as BaseProgress} from "@base-ui/react/progress";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./progress.module.css";

/**
 * Represents the configurable props for the Progress component.
 *
 * @remarks
 * Extends the Base UI progress root primitive while documenting the numeric progress
 * value and the styling hook exposed by this wrapper.
 *
 * @default value `0`
 */
export interface ProgressProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseProgress.Root>, "value"> {
  /**
   * Additional CSS classes merged with the progress track styles.
   */
  className?: string;
  /**
   * The current completion percentage or normalized value rendered by the progress bar.
   *
   * @default 0
   */
  value?: number;
}

/**
 * A horizontal progress bar for communicating completion state.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI progress primitive and renders both the track and indicator with
 * the design system's styling. Use it for uploads, onboarding, or long-running tasks.
 *
 * @example
 * ```tsx
 * <Progress value={65} aria-label="Profile completion" />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/progress Base UI Progress docs}
 */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({className, value = 0, ...props}, ref) => (
  <BaseProgress.Root
    ref={ref}
    value={value}
    {...props}>
    <BaseProgress.Track className={cn(styles.track, className)}>
      <BaseProgress.Indicator className={styles.indicator} />
    </BaseProgress.Track>
  </BaseProgress.Root>
));
Progress.displayName = "Progress";

export {Progress};
