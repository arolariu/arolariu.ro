"use client";

import {Progress as BaseProgress} from "@base-ui/react/progress";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./progress.module.css";

/**
 * Primitive Root props with an optional nullable value.
 *
 * @remarks `className` and the forwarded ref belong to Root, not Track.
 */
export interface ProgressProps extends Omit<BaseProgress.Root.Props, "value"> {
  /** Current value within `min`/`max`; null or omission means indeterminate. @default null */
  readonly value?: number | null;
}

/** Primitive-owned completion status supplied to Root callbacks. */
export type ProgressState = BaseProgress.Root.State;
/** Props for a separately configurable progress track. */
export type ProgressTrackProps = BaseProgress.Track.Props;
/** Primitive-owned completion status supplied to Track callbacks. */
export type ProgressTrackState = BaseProgress.Track.State;
/** Props for the filled progress indicator. */
export type ProgressIndicatorProps = BaseProgress.Indicator.Props;
/** Primitive-owned completion status supplied to Indicator callbacks. */
export type ProgressIndicatorState = BaseProgress.Indicator.State;
/** Props for the accessible progress label. */
export type ProgressLabelProps = BaseProgress.Label.Props;
/** Primitive-owned completion status supplied to Label callbacks. */
export type ProgressLabelState = BaseProgress.Label.State;
/** Props for the formatted, visually displayed progress value. */
export type ProgressValueProps = BaseProgress.Value.Props;
/** Primitive-owned completion status supplied to Value callbacks. */
export type ProgressValueState = BaseProgress.Value.State;

function mergeProgressClassName(baseClassName: string | undefined, className: ProgressProps["className"]): ProgressProps["className"] {
  return typeof className === "function" ? (state) => cn(baseClassName, className(state)) : cn(baseClassName, className);
}

function hasProgressTrack(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some((child) => {
    if (!React.isValidElement<{children?: React.ReactNode}>(child)) {
      return false;
    }

    if (child.type === ProgressTrack || child.type === BaseProgress.Track) {
      return true;
    }

    return child.type === React.Fragment && hasProgressTrack(child.props.children);
  });
}

/**
 * Groups progress content and supplies an accessible completion status.
 *
 * @remarks
 * Renders a `<div>` by default. Ordinary children, Label, and Value precede
 * a turnkey Track/Indicator. A direct ProgressTrack or Base UI Track in
 * children (including arrays/fragments) replaces the turnkey track.
 * Customize that track with its `render` prop instead of hiding it inside an
 * opaque child component. Root owns its class, ref, formatting, and range;
 * every part delegates render callbacks and completion state to Base UI.
 *
 * @example
 * ```tsx
 * <Progress value={64}>
 *   <ProgressLabel>Upload progress</ProgressLabel>
 *   <ProgressValue />
 * </Progress>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/progress | Base UI Documentation}
 */
const Progress = React.forwardRef<HTMLDivElement, Readonly<Progress.Props>>((props, forwardedRef): React.JSX.Element => {
  const {className, children, value = null, ...otherProps} = props;

  return (
    <BaseProgress.Root
      {...otherProps}
      value={value}
      data-slot='progress'
      ref={forwardedRef}
      className={mergeProgressClassName(styles.root, className)}>
      {children}
      {!hasProgressTrack(children) && (
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      )}
    </BaseProgress.Root>
  );
});

/**
 * Contains a progress indicator and replaces the turnkey track when composed
 * directly under Progress, including through arrays or fragments.
 *
 * @remarks Renders a `<div>` and forwards its ref to the primitive-owned node.
 * @example `<ProgressTrack><ProgressIndicator /></ProgressTrack>`
 */
const ProgressTrack = React.forwardRef<HTMLDivElement, Readonly<ProgressTrack.Props>>((props, forwardedRef): React.JSX.Element => {
  const {className, ...otherProps} = props;

  return (
    <BaseProgress.Track
      {...otherProps}
      data-slot='progress-track'
      ref={forwardedRef}
      className={mergeProgressClassName(styles.track, className)}
    />
  );
});

/**
 * Visualizes Root's normalized progress or indeterminate status.
 *
 * @remarks Base UI owns the fill width and render state. Renders a `<div>`.
 * @example `<ProgressIndicator className='custom-fill' />`
 */
const ProgressIndicator = React.forwardRef<HTMLDivElement, Readonly<ProgressIndicator.Props>>((props, forwardedRef): React.JSX.Element => {
  const {className, ...otherProps} = props;

  return (
    <BaseProgress.Indicator
      {...otherProps}
      data-slot='progress-indicator'
      ref={forwardedRef}
      className={mergeProgressClassName(styles.indicator, className)}
    />
  );
});

/**
 * Associates an accessible label with its containing Progress.
 *
 * @remarks Renders a `<span>`; Base UI registers its ID with Root.
 * @example `<ProgressLabel>Upload progress</ProgressLabel>`
 */
const ProgressLabel = React.forwardRef<HTMLSpanElement, Readonly<ProgressLabel.Props>>((props, forwardedRef): React.JSX.Element => {
  const {className, ...otherProps} = props;

  return (
    <BaseProgress.Label
      {...otherProps}
      data-slot='progress-label'
      ref={forwardedRef}
      className={mergeProgressClassName(styles.label, className)}
    />
  );
});

/**
 * Displays Root's formatted progress value without duplicating its ARIA value.
 *
 * @remarks
 * Renders an `aria-hidden` `<span>`. The primitive supports a children callback
 * receiving the formatted and raw nullable values for custom display text.
 * @example `<ProgressValue>{(formatted) => formatted}</ProgressValue>`
 */
const ProgressValue = React.forwardRef<HTMLSpanElement, Readonly<ProgressValue.Props>>((props, forwardedRef): React.JSX.Element => {
  const {className, ...otherProps} = props;

  return (
    <BaseProgress.Value
      {...otherProps}
      data-slot='progress-value'
      ref={forwardedRef}
      className={mergeProgressClassName(styles.value, className)}
    />
  );
});

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Progress {
  export type Props = ProgressProps;
  export type State = ProgressState;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ProgressTrack {
  export type Props = ProgressTrackProps;
  export type State = ProgressTrackState;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ProgressIndicator {
  export type Props = ProgressIndicatorProps;
  export type State = ProgressIndicatorState;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ProgressLabel {
  export type Props = ProgressLabelProps;
  export type State = ProgressLabelState;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ProgressValue {
  export type Props = ProgressValueProps;
  export type State = ProgressValueState;
}

Progress.displayName = "Progress";
ProgressTrack.displayName = "ProgressTrack";
ProgressIndicator.displayName = "ProgressIndicator";
ProgressLabel.displayName = "ProgressLabel";
ProgressValue.displayName = "ProgressValue";

export {Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue};
