"use client";

import {ScrollArea as BaseScrollArea} from "@base-ui/react/scroll-area";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./scroll-area.module.css";

const ScrollArea = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseScrollArea.Root>>(
  ({className, children, ...props}, ref) => (
    <BaseScrollArea.Root
      ref={ref}
      className={cn(styles.root, className)}
      {...props}>
      <BaseScrollArea.Viewport className={styles.viewport}>
        <BaseScrollArea.Content className={styles.content}>{children}</BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      <ScrollBar />
      <BaseScrollArea.Corner className={styles.corner} />
    </BaseScrollArea.Root>
  ),
);
ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseScrollArea.Scrollbar>>(
  ({className, orientation = "vertical", ...props}, ref) => (
    <BaseScrollArea.Scrollbar
      ref={ref}
      orientation={orientation}
      className={cn(styles.scrollbar, orientation === "vertical" ? styles.vertical : styles.horizontal, className)}
      {...props}>
      <BaseScrollArea.Thumb className={styles.thumb} />
    </BaseScrollArea.Scrollbar>
  ),
);
ScrollBar.displayName = "ScrollBar";

export {ScrollArea, ScrollBar};
