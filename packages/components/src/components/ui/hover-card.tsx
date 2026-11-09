"use client";

import {PreviewCard as BasePreviewCard} from "@base-ui/react/preview-card";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./hover-card.module.css";

/** Preview Card root options, including payload and primitive-owned lifecycle callbacks. */
export type HoverCardProps = Readonly<React.ComponentPropsWithRef<typeof BasePreviewCard.Root>>;
/** Link trigger options; Base UI owns hover/focus timing and render state. */
export type HoverCardTriggerProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BasePreviewCard.Trigger>, "ref"> & React.RefAttributes<HTMLElement>
>;
/** Popup semantics plus explicit Positioner and Portal options. */
export type HoverCardContentProps = Readonly<
  React.ComponentPropsWithRef<typeof BasePreviewCard.Popup>
    & Pick<
      React.ComponentPropsWithRef<typeof BasePreviewCard.Positioner>,
      | "side"
      | "align"
      | "anchor"
      | "positionMethod"
      | "collisionBoundary"
      | "collisionPadding"
      | "collisionAvoidance"
      | "sticky"
      | "arrowPadding"
      | "disableAnchorTracking"
    >
    & Pick<React.ComponentPropsWithRef<typeof BasePreviewCard.Portal>, "keepMounted" | "container"> & {
      /** Distance in pixels between the trigger and the card, or a function of their sizes, side and alignment. @default 4 */
      sideOffset?: BasePreviewCard.Positioner.Props["sideOffset"];
      /** Offset in pixels along the alignment axis, or a function of the trigger and card sizes. @default 4 */
      alignOffset?: BasePreviewCard.Positioner.Props["alignOffset"];
    }
>;

/**
 * Coordinates hover card state and accessibility behavior.
 *
 * @remarks
 * - Client-only (`"use client"`); renders no DOM element. Compose a `HoverCardTrigger` link and a `HoverCardContent`.
 * - Built on {@link https://base-ui.com/react/components/preview-card | Base UI Preview Card}, which opens the card on
 *   hover or keyboard focus of the trigger after its delay.
 * - The card is supplementary: touch users cannot hover, so the link must make sense on its own and the card must not
 *   hold the only copy of essential information or actions.
 *
 * @example
 * ```tsx
 * <HoverCard>
 *   <HoverCardTrigger href='/users/ada'>@ada</HoverCardTrigger>
 *   <HoverCardContent>Ada Lovelace · Joined in 2019</HoverCardContent>
 * </HoverCard>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/preview-card | Base UI Documentation}
 */
function HoverCard(props: Readonly<HoverCard.Props>): React.ReactElement {
  return <BasePreviewCard.Root {...props} />;
}

/**
 * Renders the hover card trigger.
 *
 * @remarks
 * - Client-only; renders an `<a>` element by default, so give it an `href` that works without the card.
 * - Built on {@link https://base-ui.com/react/components/preview-card | Base UI Preview Card}; `delay` (600 ms) and
 *   `closeDelay` (300 ms) tune hover and focus timing.
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <HoverCardTrigger href='/users/ada' delay={400}>@ada</HoverCardTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/preview-card | Base UI Documentation}
 */
const HoverCardTrigger = ({ref, className, ...props}: Readonly<HoverCardTrigger.Props>): React.ReactElement => {
  const primitiveRef = React.useCallback(
    (element: HTMLElement | null): ReturnType<React.RefCallback<HTMLElement>> => {
      if (typeof ref === "function") return ref(element);
      if (ref) ref.current = element;
      return undefined;
    },
    [ref],
  );
  return (
    <BasePreviewCard.Trigger
      ref={primitiveRef}
      className={(state) => cn(styles.control, typeof className === "function" ? className(state) : className)}
      {...props}
    />
  );
};

/**
 * Renders the hover card content.
 *
 * @remarks
 * - Client-only; render inside `HoverCard`. Renders Portal → Positioner → a `<div>` Popup.
 * - Built on {@link https://base-ui.com/react/components/preview-card | Base UI Preview Card}
 * - Placement props reach the Positioner: `side="bottom"`, `align="center"`, `sideOffset={4}` and `alignOffset={4}` by
 *   default. `keepMounted` and `container` reach the Portal; popup props, `render` and `ref` stay on the Popup.
 *
 * @example
 * ```tsx
 * <HoverCardContent side='right' align='start'>
 *   <ProfileSummary userId='ada' />
 * </HoverCardContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/preview-card | Base UI Documentation}
 */
const HoverCardContent = ({ref, ...props}: Readonly<HoverCardContent.Props>): React.ReactElement => {
  const {
    className,
    side = "bottom",
    align = "center",
    sideOffset = 4,
    alignOffset = 4,
    anchor,
    positionMethod,
    collisionBoundary,
    collisionPadding,
    collisionAvoidance,
    sticky,
    arrowPadding,
    disableAnchorTracking,
    keepMounted,
    container,
    ...popupProps
  } = props;

  return (
    <BasePreviewCard.Portal
      keepMounted={keepMounted}
      container={container}>
      <BasePreviewCard.Positioner
        className={styles.positioner}
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        anchor={anchor}
        positionMethod={positionMethod}
        collisionBoundary={collisionBoundary}
        collisionPadding={collisionPadding}
        collisionAvoidance={collisionAvoidance}
        sticky={sticky}
        arrowPadding={arrowPadding}
        disableAnchorTracking={disableAnchorTracking}>
        <BasePreviewCard.Popup
          ref={ref}
          className={typeof className === "function" ? (state) => cn(styles.popup, className(state)) : cn(styles.popup, className)}
          {...popupProps}
        />
      </BasePreviewCard.Positioner>
    </BasePreviewCard.Portal>
  );
};

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace HoverCard {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = HoverCardProps;
  export type State = BasePreviewCard.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace HoverCardTrigger {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = HoverCardTriggerProps;
  export type State = BasePreviewCard.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace HoverCardContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = HoverCardContentProps;
  export type State = BasePreviewCard.Popup.State;
}

HoverCard.displayName = "HoverCard";
HoverCardTrigger.displayName = "HoverCardTrigger";
HoverCardContent.displayName = "HoverCardContent";

export {HoverCard, HoverCardContent, HoverCardTrigger};
