"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import type {HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./marker.module.css";

/** Supported inline marker surface treatments. */
export type MarkerVariant = "default" | "separator" | "border";
/** State owned by the marker renderer, not by an application or another primitive. */
export type MarkerState = Readonly<{slot: "marker"; variant: MarkerVariant}>;
/** CSS helper options, including both upstream class and className inputs. */
export interface MarkerVariantOptions {
  readonly variant?: MarkerVariant;
  readonly className?: string;
  readonly class?: string;
}

type MarkerRenderProps = Readonly<Omit<HTMLProps<HTMLElement>, "ref"> & {ref?: React.RefCallback<HTMLElement> | null}>;

/** Marker props with Base UI native composition and a ref to the actual target. */
export type MarkerProps = Readonly<
  Omit<useRender.ComponentProps<"div", MarkerState, MarkerRenderProps>, "ref"> & {
    variant?: MarkerVariant;
    ref?: React.Ref<HTMLElement>;
  }
>;
/** Native decorative icon slot props. */
export type MarkerIconProps = Readonly<React.ComponentPropsWithRef<"span">>;
/** Native wrapping text slot props; links and text remain caller-owned. */
export type MarkerContentProps = Readonly<React.ComponentPropsWithRef<"span">>;

const variantStyles: Record<MarkerVariant, string | undefined> = {
  default: undefined,
  separator: styles.separator,
  border: styles.border,
};

/** Builds marker classes without rendering or introducing a runtime styling dependency. */
function markerVariants({variant = "default", className, class: classValue}: Readonly<MarkerVariantOptions> = {}): string {
  return cn(styles.marker, variantStyles[variant], className, classValue);
}

/**
 * Displays a caller-provided date/status boundary with optional separator or border styling.
 * Native render targets preserve content, ARIA, refs and child-first cancellable events.
 * No separator role or live-region policy is imposed on meaningful marker text.
 */
const Marker = ({ref, className, variant = "default", render, ...props}: Readonly<Marker.Props>): React.ReactElement =>
  useRender<Marker.State, HTMLElement>({
    defaultTagName: "div",
    ref,
    render,
    state: {slot: "marker", variant},
    props: mergeProps<"div">({className: markerVariants({variant, className})}, props),
  });
Marker.displayName = "Marker";

/** Contains decorative marker graphics; meaningful status belongs in MarkerContent. */
const MarkerIcon = ({ref, className, ...props}: Readonly<MarkerIcon.Props>): React.JSX.Element => (
  <span
    aria-hidden='true'
    {...props}
    ref={ref}
    data-slot='marker-icon'
    className={cn(styles.icon, className)}
  />
);
MarkerIcon.displayName = "MarkerIcon";

/** Contains caller-provided wrapping text or phrasing links. */
const MarkerContent = ({ref, className, ...props}: Readonly<MarkerContent.Props>): React.JSX.Element => (
  <span
    {...props}
    ref={ref}
    data-slot='marker-content'
    className={cn(styles.content, className)}
  />
);
MarkerContent.displayName = "MarkerContent";

// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace Marker {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = MarkerProps;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type State = MarkerState;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace MarkerIcon {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = MarkerIconProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace MarkerContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = MarkerContentProps;
}

export {Marker, MarkerContent, MarkerIcon, markerVariants};
