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
/** Popup semantics plus explicit Positioner and Portal options. Offsets default to 4. */
export type HoverCardContentProps = Readonly<
  React.ComponentPropsWithRef<typeof BasePreviewCard.Popup>
    & Pick<
      React.ComponentPropsWithRef<typeof BasePreviewCard.Positioner>,
      | "side"
      | "align"
      | "sideOffset"
      | "alignOffset"
      | "anchor"
      | "positionMethod"
      | "collisionBoundary"
      | "collisionPadding"
      | "collisionAvoidance"
      | "sticky"
      | "arrowPadding"
      | "disableAnchorTracking"
    >
    & Pick<React.ComponentPropsWithRef<typeof BasePreviewCard.Portal>, "keepMounted" | "container">
>;

/**
 * Coordinates hover card state and accessibility behavior.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/preview-card | Base UI Preview Card}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <HoverCard>Content</HoverCard>
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
 * - Renders a `<a>` element by default
 * - Built on {@link https://base-ui.com/react/components/preview-card | Base UI Preview Card}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <HoverCardTrigger>Content</HoverCardTrigger>
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
      {...props}
      ref={primitiveRef}
      className={(state) => cn(styles.control, typeof className === "function" ? className(state) : className)}
    />
  );
};

/**
 * Renders the hover card content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/preview-card | Base UI Preview Card}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <HoverCardContent>Content</HoverCardContent>
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
