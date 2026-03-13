"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Meter as BaseMeter} from "@base-ui/react/meter";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./meter.module.css";

type MeterProps = React.ComponentPropsWithRef<typeof BaseMeter.Root>;
type MeterTrackProps = React.ComponentPropsWithRef<typeof BaseMeter.Track>;
type MeterIndicatorProps = React.ComponentPropsWithRef<typeof BaseMeter.Indicator>;
type MeterLabelProps = React.ComponentPropsWithRef<typeof BaseMeter.Label>;

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
function Meter(props: Readonly<Meter.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseMeter.Root
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.root, className)}, {}),
      })}>
      {children}
    </BaseMeter.Root>
  );
}

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
function MeterTrack(props: Readonly<MeterTrack.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseMeter.Track
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.track, className)}, {}),
      })}>
      {children}
    </BaseMeter.Track>
  );
}

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
function MeterIndicator(props: Readonly<MeterIndicator.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseMeter.Indicator
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.indicator, className)}, {}),
      })}>
      {children}
    </BaseMeter.Indicator>
  );
}

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
function MeterLabel(props: Readonly<MeterLabel.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseMeter.Label
      {...otherProps}
      render={useRender({
        defaultTagName: "span",
        render: render as never,
        props: mergeProps({className: cn(styles.label, className)}, {}),
      })}>
      {children}
    </BaseMeter.Label>
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Meter {
  export type Props = MeterProps;
  export type State = BaseMeter.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MeterTrack {
  export type Props = MeterTrackProps;
  export type State = BaseMeter.Track.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MeterIndicator {
  export type Props = MeterIndicatorProps;
  export type State = BaseMeter.Indicator.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MeterLabel {
  export type Props = MeterLabelProps;
  export type State = BaseMeter.Label.State;
}

Meter.displayName = "Meter";
MeterTrack.displayName = "MeterTrack";
MeterIndicator.displayName = "MeterIndicator";
MeterLabel.displayName = "MeterLabel";

export {Meter, MeterIndicator, MeterLabel, MeterTrack};
