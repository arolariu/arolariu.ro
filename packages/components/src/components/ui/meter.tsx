"use client";

import {Meter as BaseMeter} from "@base-ui/react/meter";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./meter.module.css";

/**
 * Displays a scalar measurement within a known range.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on Base UI Meter primitives
 * - Intended for values such as storage usage, health, or completion
 *
 * @example
 * ```tsx
 * <Meter value={72}>
 *   <MeterTrack>
 *     <MeterIndicator />
 *   </MeterTrack>
 * </Meter>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/meter | Base UI Meter Docs}
 */
const Meter = React.forwardRef<HTMLDivElement, Meter.Props>((props: Readonly<Meter.Props>, forwardedRef): React.ReactElement => {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseMeter.Root
      {...otherProps}
      ref={forwardedRef}
      render={render}
      className={(state) => cn(styles.root, typeof className === "function" ? className(state) : className)}>
      {children}
    </BaseMeter.Root>
  );
});

/**
 * Renders the background track for a meter.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on Base UI Meter track primitives
 *
 * @example
 * ```tsx
 * <MeterTrack />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/meter | Base UI Meter Docs}
 */
const MeterTrack = React.forwardRef<HTMLDivElement, MeterTrack.Props>(
  (props: Readonly<MeterTrack.Props>, forwardedRef): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseMeter.Track
        {...otherProps}
        ref={forwardedRef}
        render={render}
        className={(state) => cn(styles.track, typeof className === "function" ? className(state) : className)}>
        {children}
      </BaseMeter.Track>
    );
  },
);

/**
 * Renders the filled indicator that reflects the current meter value.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on Base UI Meter indicator primitives
 *
 * @example
 * ```tsx
 * <MeterIndicator />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/meter | Base UI Meter Docs}
 */
const MeterIndicator = React.forwardRef<HTMLDivElement, MeterIndicator.Props>(
  (props: Readonly<MeterIndicator.Props>, forwardedRef): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseMeter.Indicator
        {...otherProps}
        ref={forwardedRef}
        render={render}
        className={(state) => cn(styles.indicator, typeof className === "function" ? className(state) : className)}>
        {children}
      </BaseMeter.Indicator>
    );
  },
);

/**
 * Renders the accessible label associated with a meter.
 *
 * @remarks
 * - Renders a `<span>` element by default
 * - Built on Base UI Meter label primitives
 *
 * @example
 * ```tsx
 * <MeterLabel>Storage used</MeterLabel>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/meter | Base UI Meter Docs}
 */
const MeterLabel = React.forwardRef<HTMLSpanElement, MeterLabel.Props>(
  (props: Readonly<MeterLabel.Props>, forwardedRef): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseMeter.Label
        {...otherProps}
        ref={forwardedRef}
        render={render}
        className={(state) => cn(styles.label, typeof className === "function" ? className(state) : className)}>
        {children}
      </BaseMeter.Label>
    );
  },
);

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Meter {
  export type Props = React.ComponentPropsWithRef<typeof BaseMeter.Root>;
  export type State = BaseMeter.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MeterTrack {
  export type Props = React.ComponentPropsWithRef<typeof BaseMeter.Track>;
  export type State = BaseMeter.Track.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MeterIndicator {
  export type Props = React.ComponentPropsWithRef<typeof BaseMeter.Indicator>;
  export type State = BaseMeter.Indicator.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MeterLabel {
  export type Props = React.ComponentPropsWithRef<typeof BaseMeter.Label>;
  export type State = BaseMeter.Label.State;
}

/** Props for the meter root, including value, formatting, render composition and DOM refs. */
export type MeterProps = React.ComponentPropsWithRef<typeof BaseMeter.Root>;
/** Meter root state as defined by Base UI; measurement is supplied through props. */
export type MeterState = BaseMeter.Root.State;
/** Props for the meter track. */
export type MeterTrackProps = React.ComponentPropsWithRef<typeof BaseMeter.Track>;
/** Primitive-owned meter track state. */
export type MeterTrackState = BaseMeter.Track.State;
/** Props for the meter indicator. */
export type MeterIndicatorProps = React.ComponentPropsWithRef<typeof BaseMeter.Indicator>;
/** Primitive-owned meter indicator state. */
export type MeterIndicatorState = BaseMeter.Indicator.State;
/** Props for the accessible meter label. */
export type MeterLabelProps = React.ComponentPropsWithRef<typeof BaseMeter.Label>;
/** Primitive-owned meter label state. */
export type MeterLabelState = BaseMeter.Label.State;

Meter.displayName = "Meter";
MeterTrack.displayName = "MeterTrack";
MeterIndicator.displayName = "MeterIndicator";
MeterLabel.displayName = "MeterLabel";

export {Meter, MeterIndicator, MeterLabel, MeterTrack};
