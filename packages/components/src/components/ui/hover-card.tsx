"use client";

import {PreviewCard as BasePreviewCard} from "@base-ui/react/preview-card";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./hover-card.module.css";

const HoverCard = BasePreviewCard.Root;

const HoverCardTrigger = React.forwardRef<HTMLAnchorElement, React.ComponentPropsWithoutRef<typeof BasePreviewCard.Trigger>>(
  ({className, ...props}, ref) => (
    <BasePreviewCard.Trigger
      ref={ref}
      className={className}
      {...props}
    />
  ),
);
HoverCardTrigger.displayName = "HoverCardTrigger";

const HoverCardContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BasePreviewCard.Positioner>>(
  ({className, children, sideOffset = 4, ...props}, ref) => (
    <BasePreviewCard.Portal>
      <BasePreviewCard.Positioner
        className={styles.positioner}
        sideOffset={sideOffset}
        {...props}>
        <BasePreviewCard.Popup
          ref={ref}
          className={cn(styles.popup, className)}>
          {children}
        </BasePreviewCard.Popup>
      </BasePreviewCard.Positioner>
    </BasePreviewCard.Portal>
  ),
);
HoverCardContent.displayName = "HoverCardContent";

export {HoverCard, HoverCardContent, HoverCardTrigger};
