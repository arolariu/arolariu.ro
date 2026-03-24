"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {ScrollArea as BaseScrollArea} from "@base-ui/react/scroll-area";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./scroll-area.module.css";

/**
 * Coordinates scroll area layout and scrolling behavior.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/scroll-area | Base UI Scroll Area}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <ScrollArea>Content</ScrollArea>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/scroll-area | Base UI Documentation}
 */
const ScrollArea = React.forwardRef<React.ComponentRef<typeof BaseScrollArea.Root>, ScrollArea.Props>(
  (props: Readonly<ScrollArea.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseScrollArea.Root
        ref={ref}
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
  },
);

/**
 * Renders the scroll bar.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/scroll-area | Base UI Scroll Area}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <ScrollBar>Content</ScrollBar>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/scroll-area | Base UI Documentation}
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
  export type Props = React.ComponentPropsWithRef<typeof BaseScrollArea.Root>;
  export type State = BaseScrollArea.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ScrollBar {
  export type Props = React.ComponentPropsWithRef<typeof BaseScrollArea.Scrollbar>;
  export type State = BaseScrollArea.Scrollbar.State;
}

ScrollArea.displayName = "ScrollArea";
ScrollBar.displayName = "ScrollBar";

export {ScrollArea, ScrollBar};
