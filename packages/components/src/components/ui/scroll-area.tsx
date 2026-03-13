"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {ScrollArea as BaseScrollArea} from "@base-ui/react/scroll-area";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./scroll-area.module.css";

type ScrollAreaProps = React.ComponentPropsWithRef<typeof BaseScrollArea.Root>;
type ScrollBarProps = React.ComponentPropsWithRef<typeof BaseScrollArea.Scrollbar>;

/**
 * Renders a styled scroll area with a default scrollbar.
 */
function ScrollArea(props: Readonly<ScrollArea.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseScrollArea.Root
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.root, className)}, {}),
      })}>
      <BaseScrollArea.Viewport className={styles.viewport}>
        <BaseScrollArea.Content className={styles.content}>{children}</BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      <ScrollBar />
      <BaseScrollArea.Corner className={styles.corner} />
    </BaseScrollArea.Root>
  );
}

/**
 * Renders a styled scroll bar with an embedded thumb.
 */
function ScrollBar(props: Readonly<ScrollBar.Props>): React.ReactElement {
  const {className, orientation = "vertical", render, ...otherProps} = props;

  return (
    <BaseScrollArea.Scrollbar
      orientation={orientation}
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps(
          {
            className: cn(styles.scrollbar, orientation === "vertical" ? styles.vertical : styles.horizontal, className),
          },
          {},
        ),
      })}>
      <BaseScrollArea.Thumb className={styles.thumb} />
    </BaseScrollArea.Scrollbar>
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ScrollArea {
  export type Props = ScrollAreaProps;
  export type State = BaseScrollArea.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ScrollBar {
  export type Props = ScrollBarProps;
  export type State = BaseScrollArea.Scrollbar.State;
}

export {ScrollArea, ScrollBar};
