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
export type BubbleProps = Readonly<React.ComponentPropsWithRef<"div"> & {variant?: BubbleVariant; align?: BubbleAlign}>;
/** State owned by the native bubble content renderer. */
export type BubbleContentState = Readonly<{slot: "bubble-content"}>;

type BubbleContentRenderProps = Readonly<Omit<HTMLProps<HTMLElement>, "ref"> & {ref?: React.RefCallback<HTMLElement> | null}>;

/** Shrinking content props with Base UI composition and a ref to the actual target. */
export type BubbleContentProps = Readonly<
  Omit<useRender.ComponentProps<"div", BubbleContentState, BubbleContentRenderProps>, "ref"> & {ref?: React.Ref<HTMLElement>}
>;
/** Native reaction collection props; reaction buttons and counts remain caller-owned. */
export type BubbleReactionsProps = Readonly<React.ComponentPropsWithRef<"div"> & {side?: BubbleReactionsSide; align?: BubbleAlign}>;

const variantStyles: Record<BubbleVariant, string | undefined> = {
  default: styles.default,
  secondary: styles.secondary,
  muted: styles.muted,
  tinted: styles.tinted,
  outline: styles.outline,
  ghost: styles.ghost,
  destructive: styles.destructive,
};

/** Groups caller-provided bubbles in a shrinking native column. */
const BubbleGroup = React.forwardRef<HTMLDivElement, BubbleGroup.Props>(({className, ...props}, ref): React.JSX.Element => (
  <div
    {...props}
    ref={ref}
    data-slot='bubble-group'
    className={cn(styles.group, className)}
  />
));
BubbleGroup.displayName = "BubbleGroup";

/** Defines a bubble surface and logical alignment without owning message or reaction state. */
const Bubble = React.forwardRef<HTMLDivElement, Bubble.Props>(
  ({className, variant = "default", align = "start", ...props}, ref): React.JSX.Element => (
    <div
      {...props}
      ref={ref}
      data-slot='bubble'
      data-variant={variant}
      data-align={align}
      className={cn(styles.bubble, variantStyles[variant], className)}
    />
  ),
);
Bubble.displayName = "Bubble";

/**
 * Hosts wrapped bubble content, optionally composed onto a native link or button.
 * Composed targets own native button type/disabled/keyboard semantics. Base UI
 * merges child content, both refs, classes and child-first cancellable handlers.
 */
const BubbleContent = React.forwardRef<HTMLElement, BubbleContent.Props>(
  ({className, render, ...props}: Readonly<React.PropsWithoutRef<BubbleContent.Props>>, ref): React.ReactElement =>
    useRender<BubbleContent.State, HTMLElement>({
      defaultTagName: "div",
      ref,
      render,
      state: {slot: "bubble-content"},
      props: mergeProps<"div">({className: cn(styles.content, className)}, props),
    }),
);
BubbleContent.displayName = "BubbleContent";

/** Positions caller-provided reactions at a logical corner of the parent bubble. */
const BubbleReactions = React.forwardRef<HTMLDivElement, BubbleReactions.Props>(
  ({className, side = "bottom", align = "end", ...props}, ref): React.JSX.Element => (
    <div
      {...props}
      ref={ref}
      data-slot='bubble-reactions'
      data-side={side}
      data-align={align}
      className={cn(styles.reactions, className)}
    />
  ),
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
