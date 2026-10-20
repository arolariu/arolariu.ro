"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import type {HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {markerVariants} from "./_marker-variants";
import styles from "./marker.module.css";

/** Supported inline marker surface treatments: plain, flanked by rules (`separator`) or underlined (`border`). */
export type MarkerVariant = "default" | "separator" | "border";
/** State owned by the marker renderer, not by an application or another primitive. */
export type MarkerState = Readonly<{slot: "marker"; variant: MarkerVariant}>;

/**
 * Options for generating {@link Marker} classes with {@link markerVariants} without rendering a Marker.
 *
 * @remarks
 * Every member is optional, so `markerVariants()` returns the classes of a default marker. `className` and `class` are
 * both accepted so class lists written for the upstream `class` convention keep working; both are merged last.
 *
 * @example
 * ```tsx
 * const options: MarkerVariantOptions = {variant: "border", className: "history-boundary"};
 * const className = markerVariants(options);
 * ```
 */
export interface MarkerVariantOptions {
  /**
   * Surface treatment: `separator` draws a rule on both sides of the content; `border` underlines the row.
   *
   * @default "default"
   */
  readonly variant?: MarkerVariant;
  /**
   * Additional CSS classes merged after the generated classes.
   *
   * @default undefined
   */
  readonly className?: string;
  /**
   * Upstream-compatible alias for `className`, merged after it.
   *
   * @default undefined
   */
  readonly class?: string;
}

type MarkerRenderProps = Readonly<Omit<HTMLProps<HTMLElement>, "ref"> & {ref?: React.RefCallback<HTMLElement> | null}>;

/** Marker props with Base UI native composition and a ref to the actual target. */
export type MarkerProps = Readonly<
  Omit<useRender.ComponentProps<"div", MarkerState, MarkerRenderProps>, "ref"> & {
    /**
     * Surface treatment, also rendered as `data-variant`: `separator` draws a rule on both sides of the content;
     * `border` underlines the row.
     *
     * @default "default"
     */
    variant?: MarkerVariant;
    /** Ref to the actual rendered element; the default target is a div. */
    ref?: React.Ref<HTMLElement>;
  }
>;
/** Native decorative icon slot props. */
export type MarkerIconProps = Readonly<React.ComponentPropsWithRef<"span">>;
/** Native wrapping text slot props; links and text remain caller-owned. */
export type MarkerContentProps = Readonly<React.ComponentPropsWithRef<"span">>;

/**
 * Displays a caller-provided date/status boundary with optional separator or border styling.
 * Native render targets preserve content, ARIA, refs and child-first cancellable events.
 * No separator role or live-region policy is imposed on meaningful marker text.
 *
 * @remarks
 * **Rendering Context**: Client boundary for Base UI render/ref composition. Renders a `<div>` by default, passes
 * {@link MarkerState} to `render` callbacks and points its ref at the actual rendered element.
 *
 * A Marker labels a boundary in a list or conversation, such as a date or "new messages". Its text stays in the reading
 * order: it adds no `separator` role (which would hide the text from assistive technologies) and no live region, so
 * announce status changes yourself when they matter. Compose it onto a native link or button with `render` when the
 * boundary is interactive; the marker then gets a 24px minimum target and a focus ring. `variant` is also exposed as
 * `data-variant` for styling. To style another element as a marker, use {@link markerVariants}.
 *
 * @example
 * ```tsx
 * import {CalendarIcon} from "lucide-react";
 *
 * <Marker variant="separator">
 *   <MarkerIcon>
 *     <CalendarIcon />
 *   </MarkerIcon>
 *   <MarkerContent>Yesterday</MarkerContent>
 * </Marker>
 *
 * <Marker variant="border" render={<a href="#history" />}>
 *   <MarkerContent>Earlier messages</MarkerContent>
 * </Marker>
 * ```
 *
 * @see {@link MarkerContent}
 * @see {@link MarkerIcon}
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

/**
 * Contains decorative marker graphics; meaningful status belongs in MarkerContent.
 *
 * @remarks
 * **Rendering Context**: Client module; a plain `<span data-slot="marker-icon">` without state or effects.
 *
 * Hidden from assistive technologies by default (`aria-hidden="true"`), because the adjacent {@link MarkerContent}
 * carries the meaning. When the icon itself conveys information, pass `aria-hidden={false}` with `role="img"` and a
 * localized `aria-label`; rest props are applied last, so they override the default.
 *
 * @example
 * ```tsx
 * import {CalendarIcon} from "lucide-react";
 *
 * <MarkerIcon>
 *   <CalendarIcon />
 * </MarkerIcon>
 * ```
 *
 * @see {@link Marker}
 */
const MarkerIcon = ({ref, className, ...props}: Readonly<MarkerIcon.Props>): React.JSX.Element => (
  <span
    aria-hidden='true'
    ref={ref}
    data-slot='marker-icon'
    className={cn(styles.icon, className)}
    {...props}
  />
);
MarkerIcon.displayName = "MarkerIcon";

/**
 * Contains caller-provided wrapping text or phrasing links.
 *
 * @remarks
 * **Rendering Context**: Client module; a plain `<span data-slot="marker-content">` without state or effects.
 *
 * Long text wraps anywhere instead of overflowing, and inside a `separator` marker the content stays centred between
 * the rules. Plain nested `<a>` links inherit the marker's text colour and stay underlined, even over element-only
 * `a {}` resets; class-styled anchors such as `buttonVariants()` keep their own paint, including on hover.
 *
 * @example
 * ```tsx
 * <MarkerContent>
 *   Earlier messages are in the <a href="/archive">archive</a>.
 * </MarkerContent>
 * ```
 *
 * @see {@link Marker}
 */
const MarkerContent = ({ref, className, ...props}: Readonly<MarkerContent.Props>): React.JSX.Element => (
  <span
    ref={ref}
    data-slot='marker-content'
    className={cn(styles.content, className)}
    {...props}
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
