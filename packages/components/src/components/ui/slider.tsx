"use client";

import {Slider as BaseSlider} from "@base-ui/react/slider";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./slider.module.css";

/**
 * Primitive-derived slider props, preserving scalar and readonly range callback inference.
 * @typeParam Value - A scalar value or an array containing one value per thumb.
 */
export type SliderProps<Value extends number | readonly number[] = number | readonly number[]> = BaseSlider.Root.Props<Value>;

/** Live state supplied by the slider primitive to render and class callbacks. */
export type SliderState = BaseSlider.Root.State;

interface SliderComponent {
  <Value extends number | readonly number[]>(props: Readonly<SliderProps<Value>>): React.JSX.Element;
  readonly $$typeof: symbol;
  displayName?: string;
}

/**
 * Renders a scalar or range slider with one focusable thumb per supplied value.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/slider | Base UI Slider}
 * - Passes `render`, state callbacks, event details, and the root ref directly to Base UI
 * - With no supplied value, retains the primitive's single minimum value
 * - Uses edge-aligned thumbs by default; `thumbAlignment` can override this
 *
 * @typeParam Value - A scalar value or an array containing one value per thumb.
 * @param props - Primitive slider props.
 * @param ref - Forwarded ref to the slider root.
 * @returns The styled slider root, control, track, indicator, and thumbs.
 * @example
 * ```tsx
 * <Slider aria-label="Price range" defaultValue={[25, 75]} />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/slider | Base UI Documentation}
 */
function renderSlider<Value extends number | readonly number[]>(
  props: Readonly<SliderProps<Value>>,
  ref: React.ForwardedRef<HTMLDivElement>,
): React.JSX.Element {
  const {children, className, defaultValue, thumbAlignment = "edge", value, ...otherProps} = props;
  const suppliedValue = value ?? defaultValue;
  const thumbCount = Array.isArray(suppliedValue) ? suppliedValue.length : 1;

  return (
    <BaseSlider.Root<Value>
      {...otherProps}
      ref={ref}
      data-slot='slider'
      defaultValue={defaultValue}
      value={value}
      thumbAlignment={thumbAlignment}
      className={(state) => cn(styles.root, typeof className === "function" ? className(state) : className)}>
      {children}
      <BaseSlider.Control
        data-slot='slider-control'
        className={styles.control}>
        <BaseSlider.Track
          data-slot='slider-track'
          className={styles.track}>
          <BaseSlider.Indicator
            data-slot='slider-range'
            className={styles.indicator}
          />
        </BaseSlider.Track>
        {Array.from({length: thumbCount}, (_, index) => (
          <BaseSlider.Thumb
            key={index}
            index={index}
            data-slot='slider-thumb'
            className={styles.thumb}
          />
        ))}
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}

// Preserve the generic primitive contract and React 18 ref compatibility without type assertions.
function forwardSliderRef(render: typeof renderSlider): SliderComponent;
// eslint-disable-next-line no-redeclare -- TypeScript overload retains generic scalar/range callbacks and React 18 ref support without assertions.
function forwardSliderRef(
  render: typeof renderSlider,
): React.ForwardRefExoticComponent<React.PropsWithoutRef<Readonly<SliderProps>> & React.RefAttributes<HTMLDivElement>> {
  return React.forwardRef(render);
}

/**
 * A styled, edge-aligned scalar or range slider preserving Base UI's state, events, and root ref.
 * @see {@link https://base-ui.com/react/components/slider | Base UI Slider}
 */
const Slider = forwardSliderRef(renderSlider);

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Slider {
  export type Props<Value extends number | readonly number[] = number | readonly number[]> = SliderProps<Value>;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- Preserve the mandated Slider.State namespace alongside the named SliderState export.
  export type State = SliderState;
  export type ChangeEventDetails = BaseSlider.Root.ChangeEventDetails;
  export type CommitEventDetails = BaseSlider.Root.CommitEventDetails;
}

Slider.displayName = "Slider";

export {Slider};
