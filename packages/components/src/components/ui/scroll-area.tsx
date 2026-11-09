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
/** Base UI scrollbar props; the package keeps the track mounted by default (see `keepMounted`). */
export type ScrollBarProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseScrollArea.Scrollbar>, "keepMounted"> & {
    /**
     * Keeps the track mounted while its axis does not overflow. The viewport then reserves the track's 1.5rem gutter
     * in server markup and independently of Base UI's overflow measurement; the idle track is hidden. Pass `false` to
     * mount the track, and with it the gutter, only while Base UI reports overflow: the gutter then appears after
     * hydration and can oscillate for content whose height depends on its width (for example aspect-ratio media).
     *
     * @default true
     */
    readonly keepMounted?: boolean;
  }
>;
/** Base UI draggable thumb props. */
export type ScrollAreaThumbProps = Readonly<React.ComponentPropsWithRef<typeof BaseScrollArea.Thumb>>;
/** Base UI scrollbar intersection props. */
export type ScrollAreaCornerProps = Readonly<React.ComponentPropsWithRef<typeof BaseScrollArea.Corner>>;
/** Convenience scroll area props; use the explicit parts for multi-axis composition. */
export interface ScrollAreaProps extends ScrollAreaRootProps {
  /**
   * Attributes, render/class callbacks, and ref for the actual scrolling element. Name the viewport here, for example
   * `role: "region"` with `aria-label` or `aria-labelledby`, because it becomes a tab stop while its content overflows.
   */
  readonly viewportProps?: Omit<ScrollAreaViewportProps, "children">;
  /** Attributes, render/class callbacks, and ref for the content region. */
  readonly contentProps?: Omit<ScrollAreaContentProps, "children">;
}

/**
 * Groups explicitly composed scroll area parts without adding a viewport or scrollbar.
 *
 * @remarks
 * - Renders a `<div>` element by default and supports the `render` prop for element composition
 * - Built on {@link https://base-ui.com/react/components/scroll-area | Base UI Scroll Area}
 * - Compose a {@link ScrollAreaViewport} holding a {@link ScrollAreaContent}, one {@link ScrollBar} per scrollable axis
 *   and, for two axes, a {@link ScrollAreaCorner}. {@link ScrollArea} is the ready-made vertical composition
 * - `className` may be a string or a callback that receives the root's live state
 *
 * @example
 * ```tsx
 * <ScrollAreaRoot>
 *   <ScrollAreaViewport
 *     role='region'
 *     aria-label='Wide notes'>
 *     <ScrollAreaContent>{notes}</ScrollAreaContent>
 *   </ScrollAreaViewport>
 *   <ScrollBar />
 *   <ScrollBar orientation='horizontal' />
 *   <ScrollAreaCorner />
 * </ScrollAreaRoot>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/scroll-area | Base UI Documentation}
 */
const ScrollAreaRoot = ({ref, className, ...props}: Readonly<ScrollAreaRootProps>): React.JSX.Element => (
  <BaseScrollArea.Root
    data-slot='scroll-area'
    ref={ref}
    className={(state) => cn(styles.root, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/**
 * The actual scrollable, keyboard-focusable viewport; Base UI owns overflow/focus state.
 * Reserves the gutter of every package-styled track mounted on an axis (see {@link ScrollArea}).
 *
 * @remarks
 * - Renders a `<div>` element by default and supports the `render` prop for element composition
 * - Built on {@link https://base-ui.com/react/components/scroll-area | Base UI Scroll Area}
 * - While its content overflows, Base UI makes it a tab stop (`tabIndex={0}`) so keyboard users can scroll it; once
 *   the content fits, it leaves the tab order. It has no role or name of its own, so give it `role="region"` and an
 *   accessible name with `aria-label` or `aria-labelledby` (through `viewportProps` on {@link ScrollArea}); screen
 *   readers then announce what the focused area contains (WCAG 4.1.2)
 * - Base UI hides the native scrollbars; a package {@link ScrollBar} draws the visible track
 * - `className` may be a string or a callback that receives the viewport's live state
 *
 * @example
 * ```tsx
 * <ScrollAreaViewport
 *   role='region'
 *   aria-labelledby='release-notes-heading'>
 *   <ScrollAreaContent>{releaseNotes}</ScrollAreaContent>
 * </ScrollAreaViewport>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/scroll-area | Base UI Documentation}
 */
const ScrollAreaViewport = ({ref, className, ...props}: Readonly<ScrollAreaViewportProps>): React.JSX.Element => (
  <BaseScrollArea.Viewport
    data-slot='scroll-area-viewport'
    ref={ref}
    className={(state) => cn(styles.viewport, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/**
 * Preserves Base UI content measurement and state within the scrolling viewport.
 *
 * @remarks
 * - Renders a presentational `<div>` by default and supports the `render` prop for element composition; its children
 *   keep their own semantics
 * - Built on {@link https://base-ui.com/react/components/scroll-area | Base UI Scroll Area}
 * - Base UI observes its size to update overflow and thumb measurements. Place it directly inside the viewport and pad
 *   it rather than the viewport, whose end padding the scrollbar gutter replaces
 * - `className` may be a string or a callback that receives the content's live state
 *
 * @example
 * ```tsx
 * <ScrollAreaContent className='notes-padding'>{notes}</ScrollAreaContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/scroll-area | Base UI Documentation}
 */
const ScrollAreaContent = ({ref, className, ...props}: Readonly<ScrollAreaContentProps>): React.JSX.Element => (
  <BaseScrollArea.Content
    data-slot='scroll-area-content'
    ref={ref}
    className={(state) => cn(styles.content, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/**
 * Draggable scrollbar thumb with primitive-owned pointer handling and measurement.
 *
 * @remarks
 * - Renders a `<div>` element by default and supports the `render` prop for element composition
 * - Built on {@link https://base-ui.com/react/components/scroll-area | Base UI Scroll Area}
 * - A pointer affordance only: it has no role and no tab stop, and keyboard users scroll the focused viewport instead
 * - {@link ScrollBar} renders one when it has no children; compose a thumb yourself only to restyle it
 * - `className` may be a string or a callback that receives the thumb's live state
 *
 * @example
 * ```tsx
 * <ScrollBar>
 *   <ScrollAreaThumb className='brand-thumb' />
 * </ScrollBar>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/scroll-area | Base UI Documentation}
 */
const ScrollAreaThumb = ({ref, className, ...props}: Readonly<ScrollAreaThumbProps>): React.JSX.Element => (
  <BaseScrollArea.Thumb
    data-slot='scroll-area-thumb'
    ref={ref}
    className={(state) => cn(styles.thumb, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/**
 * Fills the intersection when both native scroll axes overflow.
 *
 * @remarks
 * - Renders a decorative `<div>` and supports the `render` prop for element composition
 * - Built on {@link https://base-ui.com/react/components/scroll-area | Base UI Scroll Area}
 * - Base UI renders it only while both axes overflow; include it in compositions with a vertical and a horizontal
 *   {@link ScrollBar}
 * - `className` may be a string or a callback that receives the corner's live state
 *
 * @example
 * ```tsx
 * <ScrollAreaRoot>
 *   <ScrollAreaViewport
 *     role='region'
 *     aria-label='Quarterly figures'>
 *     <ScrollAreaContent>{table}</ScrollAreaContent>
 *   </ScrollAreaViewport>
 *   <ScrollBar />
 *   <ScrollBar orientation='horizontal' />
 *   <ScrollAreaCorner />
 * </ScrollAreaRoot>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/scroll-area | Base UI Documentation}
 */
const ScrollAreaCorner = ({ref, className, ...props}: Readonly<ScrollAreaCornerProps>): React.JSX.Element => (
  <BaseScrollArea.Corner
    data-slot='scroll-area-corner'
    ref={ref}
    className={(state) => cn(styles.corner, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/**
 * Coordinates scroll area layout and scrolling behavior.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/scroll-area | Base UI Scroll Area}
 * - Supports the `render` prop for element composition
 * - Base UI overlays each scrollbar on the viewport edge. Whenever a package-styled {@link ScrollBar} is mounted on an
 *   axis, the viewport reserves a matching, stable 1.5rem gutter and scroll padding (inline-end for the vertical track,
 *   block-end for the horizontal one), like `scrollbar-gutter: stable`. Tracks stay mounted by default, so the gutter is
 *   part of the server markup, never depends on Base UI's overflow measurement, and cannot reflow after hydration or
 *   flip-flop for content whose height depends on its width. Cost: the content box stays 1.5rem narrower (or shorter)
 *   even when nothing overflows. While its axis fits, the kept-mounted track is hidden, so it paints nothing and ignores
 *   the pointer. The gutter replaces the viewport's own end padding on that axis; pad the content part instead.
 * - While its content overflows, the viewport is a keyboard tab stop with no role or name of its own: name it through
 *   `viewportProps`, for example `role: "region"` with `aria-label` (see {@link ScrollAreaViewport})
 *
 * @example
 * ```tsx
 * <ScrollArea viewportProps={{role: "region", "aria-label": "Release notes"}}>{releaseNotes}</ScrollArea>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/scroll-area | Base UI Documentation}
 */
const ScrollArea = ({ref, ...props}: Readonly<ScrollArea.Props>): React.ReactElement => {
  const {children, viewportProps, contentProps, ...otherProps} = props;

  return (
    <ScrollAreaRoot
      ref={ref}
      {...otherProps}>
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
 * - Draws a 24px (1.5rem) track over the viewport edge. `keepMounted` defaults to `true`: the track stays mounted, the
 *   root reserves its matching gutter from the first (server) render, and the track is hidden while its axis does not
 *   overflow. With `keepMounted={false}` the track and its gutter exist only while Base UI reports overflow, which can
 *   reflow after hydration and oscillate for width-dependent content. A restyled track wider than 1.5rem needs a
 *   matching gutter.
 * - Children replace the default {@link ScrollAreaThumb}: pass only a thumb, never scrollable content
 * - The track is a pointer affordance without a tab stop; keyboard users scroll the focused viewport instead
 *
 * @example
 * ```tsx
 * <ScrollAreaRoot>
 *   <ScrollAreaViewport
 *     role='region'
 *     aria-label='Photo strip'>
 *     <ScrollAreaContent>{photos}</ScrollAreaContent>
 *   </ScrollAreaViewport>
 *   <ScrollBar orientation='horizontal' />
 * </ScrollAreaRoot>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/scroll-area | Base UI Documentation}
 */
const ScrollBar = ({
  ref,
  className,
  children,
  orientation = "vertical",
  keepMounted = true,
  ...props
}: Readonly<ScrollBarProps>): React.JSX.Element => (
  <BaseScrollArea.Scrollbar
    data-slot='scroll-area-scrollbar'
    orientation={orientation}
    keepMounted={keepMounted}
    ref={ref}
    className={(state) =>
      cn(
        styles.scrollbar,
        state.orientation === "vertical" ? styles.vertical : styles.horizontal,
        typeof className === "function" ? className(state) : className,
      )
    }
    {...props}>
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
