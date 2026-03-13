"use client";

import {Progress as BaseProgress} from "@base-ui/react/progress";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./progress.module.css";

export interface ProgressProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseProgress.Root>, "value"> {
  value?: number;
}

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
