"use client";

import {ScrollArea as BaseScrollArea} from "@base-ui/react/scroll-area";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./scroll-area.module.css";

/** Actual Base UI root props, including state-aware class and render callbacks. */
export type ScrollAreaRootProps = Readonly<React.ComponentPropsWithRef<typeof BaseScrollArea.Root>>;
/** Actual scrolling viewport props, including its DOM ref. */
export type ScrollAreaViewportProps = Readonly<React.ComponentPropsWithRef<typeof BaseScrollArea.Viewport>>;
/** Base UI content props, including its DOM ref. */
export type ScrollAreaContentProps = Readonly<React.ComponentPropsWithRef<typeof BaseScrollArea.Content>>;
/** Base UI scrollbar props. */
export type ScrollBarProps = Readonly<React.ComponentPropsWithRef<typeof BaseScrollArea.Scrollbar>>;
/** Base UI draggable thumb props. */
export type ScrollAreaThumbProps = Readonly<React.ComponentPropsWithRef<typeof BaseScrollArea.Thumb>>;
/** Base UI scrollbar intersection props. */
export type ScrollAreaCornerProps = Readonly<React.ComponentPropsWithRef<typeof BaseScrollArea.Corner>>;
/** Convenience scroll area props; use the explicit parts for multi-axis composition. */
export interface ScrollAreaProps extends ScrollAreaRootProps {
  /** Attributes, render/class callbacks, and ref for the actual scrolling element. */
  readonly viewportProps?: Omit<ScrollAreaViewportProps, "children">;
  /** Attributes, render/class callbacks, and ref for the content region. */
  readonly contentProps?: Omit<ScrollAreaContentProps, "children">;
}

/** Groups explicitly composed scroll area parts without adding a viewport or scrollbar. */
const ScrollAreaRoot = ({ref, className, ...props}: Readonly<ScrollAreaRootProps>): React.JSX.Element => (
  <BaseScrollArea.Root
    data-slot='scroll-area'
    {...props}
    ref={ref}
    className={(state) => cn(styles.root, typeof className === "function" ? className(state) : className)}
  />
);

/** The actual scrollable, keyboard-focusable viewport; Base UI owns overflow/focus state. */
const ScrollAreaViewport = ({ref, className, ...props}: Readonly<ScrollAreaViewportProps>): React.JSX.Element => (
  <BaseScrollArea.Viewport
    data-slot='scroll-area-viewport'
    {...props}
    ref={ref}
    className={(state) => cn(styles.viewport, typeof className === "function" ? className(state) : className)}
  />
);

/** Preserves Base UI content measurement and state within the scrolling viewport. */
const ScrollAreaContent = ({ref, className, ...props}: Readonly<ScrollAreaContentProps>): React.JSX.Element => (
  <BaseScrollArea.Content
    data-slot='scroll-area-content'
    {...props}
    ref={ref}
    className={(state) => cn(styles.content, typeof className === "function" ? className(state) : className)}
  />
);

/** Draggable scrollbar thumb with primitive-owned pointer handling and measurement. */
const ScrollAreaThumb = ({ref, className, ...props}: Readonly<ScrollAreaThumbProps>): React.JSX.Element => (
  <BaseScrollArea.Thumb
    data-slot='scroll-area-thumb'
    {...props}
    ref={ref}
    className={(state) => cn(styles.thumb, typeof className === "function" ? className(state) : className)}
  />
);

/** Fills the intersection when both native scroll axes overflow. */
const ScrollAreaCorner = ({ref, className, ...props}: Readonly<ScrollAreaCornerProps>): React.JSX.Element => (
  <BaseScrollArea.Corner
    data-slot='scroll-area-corner'
    {...props}
    ref={ref}
    className={(state) => cn(styles.corner, typeof className === "function" ? className(state) : className)}
  />
);

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
const ScrollArea = ({ref, ...props}: Readonly<ScrollArea.Props>): React.ReactElement => {
  const {children, viewportProps, contentProps, ...otherProps} = props;

  return (
    <ScrollAreaRoot
      {...otherProps}
      ref={ref}>
      <ScrollAreaViewport {...viewportProps}>
        <ScrollAreaContent {...contentProps}>{children}</ScrollAreaContent>
      </ScrollAreaViewport>
      <ScrollBar />
      <ScrollAreaCorner />
    </ScrollAreaRoot>
  );
};

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
const ScrollBar = ({ref, className, children, orientation = "vertical", ...props}: Readonly<ScrollBarProps>): React.JSX.Element => (
  <BaseScrollArea.Scrollbar
    data-slot='scroll-area-scrollbar'
    orientation={orientation}
    {...props}
    ref={ref}
    className={(state) =>
      cn(
        styles.scrollbar,
        state.orientation === "vertical" ? styles.vertical : styles.horizontal,
        typeof className === "function" ? className(state) : className,
      )
    }>
    {children === undefined ? <ScrollAreaThumb /> : children}
  </BaseScrollArea.Scrollbar>
);

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ScrollArea {
  export type Props = Readonly<ScrollAreaProps>;
  export type State = BaseScrollArea.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ScrollBar {
  export type Props = Readonly<ScrollBarProps>;
  export type State = BaseScrollArea.Scrollbar.State;
}

ScrollArea.displayName = "ScrollArea";
ScrollBar.displayName = "ScrollBar";
ScrollAreaRoot.displayName = "ScrollAreaRoot";
ScrollAreaViewport.displayName = "ScrollAreaViewport";
ScrollAreaContent.displayName = "ScrollAreaContent";
ScrollAreaThumb.displayName = "ScrollAreaThumb";
ScrollAreaCorner.displayName = "ScrollAreaCorner";

// eslint-disable-next-line no-redeclare -- public component namespace
namespace ScrollAreaRoot {
  export type Props = Readonly<ScrollAreaRootProps>;
  export type State = BaseScrollArea.Root.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace ScrollAreaViewport {
  export type Props = Readonly<ScrollAreaViewportProps>;
  export type State = BaseScrollArea.Viewport.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace ScrollAreaContent {
  export type Props = Readonly<ScrollAreaContentProps>;
  export type State = BaseScrollArea.Content.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace ScrollAreaThumb {
  export type Props = Readonly<ScrollAreaThumbProps>;
  export type State = BaseScrollArea.Thumb.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace ScrollAreaCorner {
  export type Props = Readonly<ScrollAreaCornerProps>;
  export type State = BaseScrollArea.Corner.State;
}

export {ScrollArea, ScrollAreaRoot, ScrollAreaViewport, ScrollAreaContent, ScrollAreaThumb, ScrollAreaCorner, ScrollBar};
