"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Slider as BaseSlider} from "@base-ui/react/slider";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./slider.module.css";

interface SliderProps extends Omit<
  React.ComponentPropsWithRef<typeof BaseSlider.Root>,
  "defaultValue" | "onValueChange" | "onValueCommitted" | "value" | "className"
> {
  className?: string;
  /** V1-compatible controlled slider values. */
  value?: number[];
  /** V1-compatible uncontrolled slider values. */
  defaultValue?: number[];
  /** V1-compatible change handler receiving an array of thumb values. */
  onValueChange?: (value: number[], eventDetails: unknown) => void;
  /** V1-compatible commit handler receiving an array of thumb values. */
  onValueCommitted?: (value: number[], eventDetails: unknown) => void;
}

/**
 * Renders a styled multi-thumb slider using canonical render composition.
 */
function Slider(props: Readonly<Slider.Props>): React.ReactElement {
  const {className, defaultValue, onValueChange, onValueCommitted, render, value, ...otherProps} = props;

  return (
    <BaseSlider.Root<readonly number[]>
      defaultValue={defaultValue}
      onValueChange={(nextValue, eventDetails) => {
        onValueChange?.([...nextValue], eventDetails);
      }}
      onValueCommitted={(nextValue, eventDetails) => {
        onValueCommitted?.([...nextValue], eventDetails);
      }}
      value={value}
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.root, className)}, {}),
      })}>
      <BaseSlider.Control className={styles.control}>
        <BaseSlider.Track className={styles.track}>
          <BaseSlider.Indicator className={styles.indicator} />
        </BaseSlider.Track>
        <BaseSlider.Thumb className={styles.thumb} />
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Slider {
  export type Props = SliderProps;
  export type State = BaseSlider.Root.State;
}

export {Slider};
