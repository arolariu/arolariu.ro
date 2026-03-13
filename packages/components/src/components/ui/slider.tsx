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
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Controls the current value when the component is used in controlled mode.
   * @default undefined
   */
  value?: number[];
  /**
   * Sets the initial value when the component is used in uncontrolled mode.
   * @default undefined
   */
  defaultValue?: number[];
  /**
   * Called whenever the slider value changes.
   * @default undefined
   */
  onValueChange?: (value: number[], eventDetails: unknown) => void;
  /**
   * Called when a slider interaction is committed.
   * @default undefined
   */
  onValueCommitted?: (value: number[], eventDetails: unknown) => void;
}

/**
 * Renders the slider control.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/slider | Base UI Slider}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <Slider>Content</Slider>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/slider | Base UI Documentation}
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

Slider.displayName = "Slider";

export {Slider};
