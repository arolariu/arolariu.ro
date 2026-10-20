"use client";

import {Slider as BaseSlider} from "@base-ui/react/slider";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./slider.module.css";

/**
 * Primitive-derived slider props, preserving scalar and readonly range callback inference.
 * @typeParam Value - A scalar value or an array containing one value per thumb.
 */
export type SliderProps<Value extends number | readonly number[] = number | readonly number[]> = BaseSlider.Root.Props<Value> & {
  /** Ref to the slider root, supplied as an ordinary React 19 prop. */
  readonly ref?: React.Ref<HTMLDivElement>;
  /** Localized name for each focusable thumb; use distinct names for range endpoints. */
  readonly getAriaLabel?: BaseSlider.Thumb.Props["getAriaLabel"];
  /** Localized value text for each thumb, for example currency or units. */
  readonly getAriaValueText?: BaseSlider.Thumb.Props["getAriaValueText"];
};

/** Live state supplied by the slider primitive to render and class callbacks. */
export type SliderState = BaseSlider.Root.State;

/**
 * Base UI exposes its generated range input through Thumb's render children,
 * not through a native inputProps prop. Preserve that input's refs and handlers.
 */
function withInputInvalidity(children: React.ReactNode, invalid: React.AriaAttributes["aria-invalid"]): React.ReactNode {
  return React.Children.map(children, (child): React.ReactNode => {
    let content: React.ReactNode = child;
    if (React.isValidElement<React.ComponentPropsWithRef<"input">>(child)) {
      if (child.type === React.Fragment) {
        content = React.cloneElement(child, {children: withInputInvalidity(child.props.children, invalid)});
      } else if (child.type === "input" && invalid !== undefined) {
        content = React.cloneElement(child, {"aria-invalid": invalid});
      }
    }
    return content;
  });
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
 * @returns The styled slider root, control, track, indicator, and thumbs.
 * @example
 * ```tsx
 * <Slider aria-label="Price range" defaultValue={[25, 75]} />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/slider | Base UI Documentation}
 */
function Slider<Value extends number | readonly number[]>(props: Readonly<SliderProps<Value>>): React.JSX.Element {
  const {ref, children, className, defaultValue, thumbAlignment = "edge", value, getAriaLabel, getAriaValueText, ...otherProps} = props;
  const {
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  } = props;
  const suppliedValue = value ?? defaultValue;
  const thumbCount = Array.isArray(suppliedValue) ? suppliedValue.length : 1;

  return (
    <BaseSlider.Root<Value>
      ref={ref}
      data-slot='slider'
      defaultValue={defaultValue}
      value={value}
      thumbAlignment={thumbAlignment}
      className={(state) => cn(styles.root, typeof className === "function" ? className(state) : className)}
      {...otherProps}>
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
            aria-label={ariaLabel}
            aria-labelledby={getAriaLabel ? undefined : ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            getAriaLabel={getAriaLabel}
            getAriaValueText={getAriaValueText}
            data-slot='slider-thumb'
            className={styles.thumb}
            render={(thumbProps, state) => (
              <div
                {...{
                  ...thumbProps,
                  "data-invalid": (ariaInvalid === undefined ? state.valid === false : ariaInvalid !== false && ariaInvalid !== "false")
                    ? ""
                    : undefined,
                  children: withInputInvalidity(thumbProps.children, ariaInvalid),
                }}
              />
            )}
          />
        ))}
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}

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
