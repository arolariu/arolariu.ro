"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import type {HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./bubble.module.css";

/** Supported bubble surface treatments. */
export type BubbleVariant = "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive";
/** Logical alignment shared by bubbles and reaction collections. */
export type BubbleAlign = "start" | "end";
/** Reaction placement relative to the owning bubble. */
export type BubbleReactionsSide = "top" | "bottom";
/** Native collection props; no application log or live-region policy is imposed. */
export type BubbleGroupProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native bubble props with caller-selected surface and logical alignment. */
export type BubbleProps = Readonly<
  React.ComponentPropsWithRef<"div"> & {
    /**
     * Surface treatment painted on the bubble's direct {@link BubbleContent}.
     *
     * @default "default"
     */
    variant?: BubbleVariant;
    /**
     * Logical side of the bubble in its flex column (such as `BubbleGroup` or `MessageContent`): `end` aligns it to the
     * inline end (the right in LTR, the left in RTL).
     *
     * @default "start"
     */
    align?: BubbleAlign;
  }
>;
/** State owned by the native bubble content renderer. */
export type BubbleContentState = Readonly<{slot: "bubble-content"}>;

type BubbleContentRenderProps = Readonly<Omit<HTMLProps<HTMLElement>, "ref"> & {ref?: React.RefCallback<HTMLElement> | null}>;

/** Shrinking content props with Base UI composition and a ref to the actual target. */
export type BubbleContentProps = Readonly<
  Omit<useRender.ComponentProps<"div", BubbleContentState, BubbleContentRenderProps>, "ref"> & {ref?: React.Ref<HTMLElement>}
>;
/** Native reaction collection props; reaction buttons and counts remain caller-owned. */
export type BubbleReactionsProps = Readonly<
  React.ComponentPropsWithRef<"div"> & {
    /**
     * Bubble edge the reactions overlap.
     *
     * @default "bottom"
     */
    side?: BubbleReactionsSide;
    /**
     * Logical corner along that edge: the inline start or end of the bubble, mirrored in RTL.
     *
     * @default "end"
     */
    align?: BubbleAlign;
  }
>;

const variantStyles: Record<BubbleVariant, string | undefined> = {
  default: styles.default,
  secondary: styles.secondary,
  muted: styles.muted,
  tinted: styles.tinted,
  outline: styles.outline,
  ghost: styles.ghost,
  destructive: styles.destructive,
};

/**
 * Groups caller-provided bubbles in a shrinking native column.
 *
 * @remarks
 * **Rendering Context**: Client module (shared with {@link BubbleContent}'s Base UI composition); the group itself is a
 * plain `<div data-slot="bubble-group">` without state or effects.
 *
 * Stacks consecutive bubbles from one sender with a small gap. It adds no role, log or live region. When the collection
 * needs a name, pass `role="group"` (or `role="log"` for a live conversation, whose announcement policy you own) together
 * with `aria-label`; a name on the bare `div` is ignored by assistive technologies.
 *
 * @example
 * ```tsx
 * <BubbleGroup>
 *   <Bubble variant="secondary">
 *     <BubbleContent>Here are the notes.</BubbleContent>
 *   </Bubble>
 *   <Bubble variant="secondary">
 *     <BubbleContent>Let me know what you think.</BubbleContent>
 *   </Bubble>
 * </BubbleGroup>
 * ```
 *
 * @see {@link Bubble}
 */
const BubbleGroup = ({ref, className, ...props}: Readonly<BubbleGroup.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='bubble-group'
    className={cn(styles.group, className)}
    {...props}
  />
);
BubbleGroup.displayName = "BubbleGroup";

/**
 * Defines a bubble surface and logical alignment without owning message or reaction state.
 *
 * @remarks
 * **Rendering Context**: Client module; `Bubble` itself is a plain `<div data-slot="bubble">` without state or effects.
 *
 * `variant` paints the direct {@link BubbleContent} child; each variant's text meets 4.5:1 against its own surface in
 * both default themes. `align="end"` moves the bubble to the inline end of its flex column (mirrored in RTL), and inside
 * an end-aligned `Message` row the bubble follows the row. Both choices are exposed as `data-variant` and `data-align`
 * styling hooks, and rest props, including `data-*` overrides, are applied last. A bubble is at most 80% of its column
 * wide (`ghost`: 100%).
 *
 * @example
 * ```tsx
 * <Bubble
 *   variant="secondary"
 *   align="end">
 *   <BubbleContent>Thanks, I will read them.</BubbleContent>
 * </Bubble>
 * ```
 *
 * @see {@link BubbleContent}
 * @see {@link BubbleReactions}
 */
const Bubble = ({ref, className, variant = "default", align = "start", ...props}: Readonly<Bubble.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='bubble'
    data-variant={variant}
    data-align={align}
    className={cn(styles.bubble, variantStyles[variant], className)}
    {...props}
  />
);
Bubble.displayName = "Bubble";

/**
 * Hosts wrapped bubble content, optionally composed onto a native link or button.
 * Composed targets own native button type/disabled/keyboard semantics. Base UI
 * merges child content, both refs, classes and child-first cancellable handlers.
 *
 * @remarks
 * **Rendering Context**: Client boundary for Base UI render/ref composition. Renders a `<div>` by default, passes
 * {@link BubbleContentState} to `render` callbacks and points its ref at the actual rendered element.
 *
 * Plain nested `<a>` links inherit the bubble's text colour and are underlined. Class-styled anchors keep their own
 * paint, so on the primary surface of the `default` variant (the Bubble default) use an opaque-fill variant: Button
 * `default`, `secondary`, `outline` or `destructive`, or Badge `default`, `secondary` or `destructive`. Transparent-fill
 * variants (Button `link`/`ghost`; Badge `outline`/`ghost`/`link`) keep text colours meant for neutral surfaces, which
 * fall below 4.5:1 on that primary surface in the light theme (Badge `link` also in dark), so they are not supported there.
 *
 * @example
 * ```tsx
 * <Bubble>
 *   <BubbleContent>
 *     Read the <a href="/notes">meeting notes</a>.
 *   </BubbleContent>
 * </Bubble>
 *
 * <Bubble variant="outline">
 *   <BubbleContent render={<a href="/messages/42" />}>Open the full message</BubbleContent>
 * </Bubble>
 * ```
 *
 * @see {@link Bubble}
 */
const BubbleContent = ({ref, className, render, ...props}: Readonly<BubbleContent.Props>): React.ReactElement =>
  useRender<BubbleContent.State, HTMLElement>({
    defaultTagName: "div",
    ref,
    render,
    state: {slot: "bubble-content"},
    props: mergeProps<"div">({className: cn(styles.content, className)}, props),
  });
BubbleContent.displayName = "BubbleContent";

/**
 * Positions caller-provided reactions at a logical corner of the parent bubble.
 *
 * @remarks
 * **Rendering Context**: Client module; a plain `<div data-slot="bubble-reactions">` without state or effects.
 *
 * The collection overlaps the bubble's `side` edge at its logical `align` corner (mirrored in RTL) and exposes both as
 * `data-side`/`data-align`. Reaction buttons, counts, pressed state and names stay caller-owned. The bare `div` has no
 * role, so a name on it is ignored: name a static summary with `role="img"` and `aria-label` (or leave its visible text
 * as the content), and a set of reaction buttons with `role="group"` and `aria-label`, giving each button its own name.
 *
 * @example
 * ```tsx
 * <Bubble>
 *   <BubbleContent>Thanks, I will read them.</BubbleContent>
 *   <BubbleReactions
 *     role="img"
 *     aria-label="2 thumbs-up reactions">
 *     👍 2
 *   </BubbleReactions>
 * </Bubble>
 * ```
 *
 * @see {@link Bubble}
 */
const BubbleReactions = ({
  ref,
  className,
  side = "bottom",
  align = "end",
  ...props
}: Readonly<BubbleReactions.Props>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='bubble-reactions'
    data-side={side}
    data-align={align}
    className={cn(styles.reactions, className)}
    {...props}
  />
);
BubbleReactions.displayName = "BubbleReactions";

// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace BubbleGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = BubbleGroupProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace Bubble {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = BubbleProps;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace BubbleContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = BubbleContentProps;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type State = BubbleContentState;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace
namespace BubbleReactions {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type Props = BubbleReactionsProps;
}

export {Bubble, BubbleContent, BubbleGroup, BubbleReactions};
