"use client";

import {Meter as BaseMeter} from "@base-ui/react/meter";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./meter.module.css";

type MeterProps = React.ComponentPropsWithoutRef<typeof BaseMeter.Root>;
type MeterTrackProps = React.ComponentPropsWithoutRef<typeof BaseMeter.Track>;
type MeterIndicatorProps = React.ComponentPropsWithoutRef<typeof BaseMeter.Indicator>;
type MeterLabelProps = React.ComponentPropsWithoutRef<typeof BaseMeter.Label>;

/**
 * Wraps the Base UI meter root with compact spacing for labels and bars.
 */
const Meter = React.forwardRef<HTMLDivElement, MeterProps>(
  ({className, ...props}: Readonly<MeterProps>, ref): React.JSX.Element => (
    <BaseMeter.Root
      ref={ref}
      className={cn(styles.root, className)}
      {...props}
    />
  ),
);
Meter.displayName = "Meter";

/**
 * Renders the meter track for the full value range.
 */
const MeterTrack = React.forwardRef<HTMLDivElement, MeterTrackProps>(
  ({className, ...props}: Readonly<MeterTrackProps>, ref): React.JSX.Element => (
    <BaseMeter.Track
      ref={ref}
      className={cn(styles.track, className)}
      {...props}
    />
  ),
);
MeterTrack.displayName = "MeterTrack";

/**
 * Renders the meter indicator that visualizes the current value.
 */
const MeterIndicator = React.forwardRef<HTMLDivElement, MeterIndicatorProps>(
  ({className, ...props}: Readonly<MeterIndicatorProps>, ref): React.JSX.Element => (
    <BaseMeter.Indicator
      ref={ref}
      className={cn(styles.indicator, className)}
      {...props}
    />
  ),
);
MeterIndicator.displayName = "MeterIndicator";

/**
 * Renders an accessible label for the meter.
 */
const MeterLabel = React.forwardRef<HTMLSpanElement, MeterLabelProps>(
  ({className, ...props}: Readonly<MeterLabelProps>, ref): React.JSX.Element => (
    <BaseMeter.Label
      ref={ref}
      className={cn(styles.label, className)}
      {...props}
    />
  ),
);
MeterLabel.displayName = "MeterLabel";

export {Meter, MeterIndicator, MeterLabel, MeterTrack};
