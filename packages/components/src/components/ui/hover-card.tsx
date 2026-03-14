"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {PreviewCard as BasePreviewCard} from "@base-ui/react/preview-card";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./hover-card.module.css";

interface HoverCardProps extends React.ComponentPropsWithRef<typeof BasePreviewCard.Root> {}
interface HoverCardTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BasePreviewCard.Trigger>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}
interface HoverCardContentProps extends Omit<React.ComponentPropsWithRef<typeof BasePreviewCard.Positioner>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Offsets the floating content from its anchor in pixels.
   * @default 4
   */
  sideOffset?: number;
}

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
const HoverCardTrigger = React.forwardRef<HTMLAnchorElement, HoverCardTrigger.Props>(
  (props: Readonly<HoverCardTrigger.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BasePreviewCard.Trigger
        ref={ref}
        {...otherProps}
        render={useRender({
          defaultTagName: "a",
          render: render as never,
          props: mergeProps({className}, {}),
        })}>
        {children}
      </BasePreviewCard.Trigger>
    );
  },
);

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
const HoverCardContent = React.forwardRef<React.ComponentRef<typeof BasePreviewCard.Popup>, HoverCardContent.Props>(
  (props: Readonly<HoverCardContent.Props>, ref): React.ReactElement => {
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
            ref={ref}
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
  },
);

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

HoverCard.displayName = "HoverCard";
HoverCardTrigger.displayName = "HoverCardTrigger";
HoverCardContent.displayName = "HoverCardContent";

export {HoverCard, HoverCardContent, HoverCardTrigger};
