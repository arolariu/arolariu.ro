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
 * Renders the meter root wrapper.
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
 * Renders the meter track element.
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
 * Renders the meter indicator element.
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
 * Renders the accessible meter label.
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

export {Meter, MeterIndicator, MeterLabel, MeterTrack};
