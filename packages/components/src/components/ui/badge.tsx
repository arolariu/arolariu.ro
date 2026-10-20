"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import type {HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {badgeVariants} from "./_badge-variants";

/**
 * Defines the supported visual treatments for the Badge component.
 */
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

/** State supplied to the badge's composition callback and data attributes. */
export type BadgeState = Readonly<{
  slot: "badge";
  variant: BadgeVariant;
}>;

// Base UI resolves input object/callback refs to a merged callback (or null).
type BadgeRenderProps = Readonly<
  Omit<HTMLProps<HTMLElement>, "ref"> & {
    ref?: React.RefCallback<HTMLElement> | null;
  }
>;

/**
 * Represents the options accepted by the {@link badgeVariants} class generator.
 *
 * @remarks
 * This helper mirrors the public Badge styling API and exists so callers can derive
 * consistent class names without rendering the component itself.
 *
 * @default variant `"default"`
 */
export interface BadgeVariantOptions {
  /**
   * The visual emphasis applied to the badge surface.
   *
   * @default "default"
   */
  readonly variant?: BadgeVariant;
  /**
   * Additional CSS classes merged with the generated badge classes.
   */
  readonly className?: string;
}

/**
 * Represents the configurable props for the Badge component.
 *
 * @remarks
 * Extends standard `<span>` attributes so badges can expose data attributes, ARIA
 * state, and event handlers while preserving the library's visual variants.
 *
 * @default variant `"default"`
 */
export type BadgeProps = Readonly<
  Omit<useRender.ComponentProps<"span", BadgeState, BadgeRenderProps>, "ref"> & {
    /** Ref to the actual rendered element; the default target is a span. */
    ref?: React.Ref<HTMLElement>;
    /**
     * The visual variant used to communicate importance or status.
     *
     * @default "default"
     */
    variant?: BadgeVariant;
  }
>;

/**
 * A compact status label for surfacing metadata, categories, or state.
 *
 * @remarks
 * **Rendering Context**: Client boundary for Base UI render/ref composition.
 *
 * Renders a styled `<span>` with pill-like spacing and variant-driven colors.
 * Use it for small, high-signal labels such as statuses, tags, or counters.
 * Previous `HTMLDivElement` refs should migrate to `HTMLSpanElement`. Use
 * `render={<div />}` only when block-level markup is intentionally required.
 * Composed targets accept their corresponding DOM refs through the common
 * `HTMLElement` boundary; callback props carry Base UI's merged callback ref.
 *
 * @example
 * ```tsx
 * <Badge variant="secondary">New</Badge>
 * ```
 *
 * @see {@link badgeVariants} — Generates matching badge classes without rendering; callable from Server Components when
 * imported from the package root.
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
const Badge = ({ref, className, variant = "default", render, ...props}: Readonly<BadgeProps>): React.ReactElement =>
  useRender<BadgeState, HTMLElement>({
    defaultTagName: "span",
    ref,
    render,
    state: {slot: "badge", variant},
    props: mergeProps<"span">({className: badgeVariants({variant, className})}, props),
  });
Badge.displayName = "Badge";

export {Badge, badgeVariants};
