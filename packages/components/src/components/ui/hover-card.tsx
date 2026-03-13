"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {PreviewCard as BasePreviewCard} from "@base-ui/react/preview-card";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./hover-card.module.css";

interface HoverCardProps extends React.ComponentPropsWithRef<typeof BasePreviewCard.Root> {}
interface HoverCardTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BasePreviewCard.Trigger>, "className"> {
  className?: string;
}
interface HoverCardContentProps extends Omit<React.ComponentPropsWithRef<typeof BasePreviewCard.Positioner>, "className"> {
  className?: string;
  sideOffset?: number;
}

/**
 * Coordinates hover-card state and positioning.
 */
function HoverCard(props: Readonly<HoverCard.Props>): React.ReactElement {
  return <BasePreviewCard.Root {...props} />;
}

/**
 * Renders the hover-card trigger.
 */
function HoverCardTrigger(props: Readonly<HoverCardTrigger.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BasePreviewCard.Trigger
      {...otherProps}
      render={useRender({
        defaultTagName: "a",
        render: render as never,
        props: mergeProps({className}, {}),
      })}>
      {children}
    </BasePreviewCard.Trigger>
  );
}

/**
 * Renders the hover-card popup with composed positioner styling.
 */
function HoverCardContent(props: Readonly<HoverCardContent.Props>): React.ReactElement {
  const {className, children, render, sideOffset = 4, ...otherProps} = props;

  return (
    <BasePreviewCard.Portal>
      <BasePreviewCard.Positioner
        sideOffset={sideOffset}
        {...otherProps}
        render={useRender({
          defaultTagName: "div",
          props: mergeProps({className: styles.positioner}, {}),
        })}>
        <BasePreviewCard.Popup
          render={useRender({
            defaultTagName: "div",
            render: render as never,
            props: mergeProps({className: cn(styles.popup, className)}, {}),
          })}>
          {children}
        </BasePreviewCard.Popup>
      </BasePreviewCard.Positioner>
    </BasePreviewCard.Portal>
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace HoverCard {
  export type Props = HoverCardProps;
  export type State = BasePreviewCard.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace HoverCardTrigger {
  export type Props = HoverCardTriggerProps;
  export type State = BasePreviewCard.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace HoverCardContent {
  export type Props = HoverCardContentProps;
  export type State = BasePreviewCard.Popup.State;
}

export {HoverCard, HoverCardContent, HoverCardTrigger};
