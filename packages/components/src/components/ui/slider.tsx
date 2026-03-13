"use client";

import {Slider as BaseSlider} from "@base-ui/react/slider";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./slider.module.css";

interface SliderProps extends Omit<
  React.ComponentPropsWithoutRef<typeof BaseSlider.Root>,
  "defaultValue" | "onValueChange" | "onValueCommitted" | "value"
> {
  /** V1-compatible controlled slider values. */
  value?: number[];
  /** V1-compatible uncontrolled slider values. */
  defaultValue?: number[];
  /** V1-compatible change handler receiving an array of thumb values. */
  onValueChange?: (value: number[], eventDetails: unknown) => void;
  /** V1-compatible commit handler receiving an array of thumb values. */
  onValueCommitted?: (value: number[], eventDetails: unknown) => void;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({className, defaultValue, onValueChange, onValueCommitted, value, ...props}, ref) => (
    <BaseSlider.Root<readonly number[]>
      ref={ref}
      className={cn(styles.root, className)}
      defaultValue={defaultValue}
      onValueChange={(nextValue, eventDetails) => {
        onValueChange?.([...nextValue], eventDetails);
      }}
      onValueCommitted={(nextValue, eventDetails) => {
        onValueCommitted?.([...nextValue], eventDetails);
      }}
      value={value}
      {...props}>
      <BaseSlider.Control className={styles.control}>
        <BaseSlider.Track className={styles.track}>
          <BaseSlider.Indicator className={styles.indicator} />
        </BaseSlider.Track>
        <BaseSlider.Thumb className={styles.thumb} />
      </BaseSlider.Control>
    </BaseSlider.Root>
  ),
);
Slider.displayName = "Slider";

export {Slider};
