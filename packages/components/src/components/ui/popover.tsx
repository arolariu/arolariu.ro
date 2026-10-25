"use client";

import {Popover as BasePopover} from "@base-ui/react/popover";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./popover.module.css";

/** State, payload and lifecycle options owned by the popover root. */
export type PopoverProps = Readonly<React.ComponentPropsWithRef<typeof BasePopover.Root>>;

/** Primitive-owned trigger props with an accurate composed-element ref. */
export type PopoverTriggerProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BasePopover.Trigger>, "ref"> & React.RefAttributes<HTMLElement>
>;

/** Popup semantics/focus plus explicit Positioner and Portal options. */
export type PopoverContentProps = Readonly<
  React.ComponentPropsWithRef<typeof BasePopover.Popup>
    & Pick<
      React.ComponentPropsWithRef<typeof BasePopover.Positioner>,
      | "side"
      | "align"
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
    & Pick<React.ComponentPropsWithRef<typeof BasePopover.Portal>, "keepMounted" | "container"> & {
      /** Distance in pixels between the trigger and the popup, or a function of their sizes, side and alignment. @default 4 */
      sideOffset?: BasePopover.Positioner.Props["sideOffset"];
    }
>;

/** Native structural header; does not register a name or description. */
export type PopoverHeaderProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Base UI heading props; registers the popup's accessible name. */
export type PopoverTitleProps = Readonly<React.ComponentPropsWithRef<typeof BasePopover.Title>>;
/** Base UI paragraph props; registers the popup's accessible description. */
export type PopoverDescriptionProps = Readonly<React.ComponentPropsWithRef<typeof BasePopover.Description>>;

/**
 * Coordinates popover state and accessibility behavior.
 *
 * @remarks
 * - Client-only (`"use client"`); renders no DOM element. Compose a `PopoverTrigger` and a `PopoverContent` inside it.
 * - Built on {@link https://base-ui.com/react/components/popover | Base UI Popover}, which owns open state, focus
 *   management, dismissal and `modal` behavior.
 * - Name the `role="dialog"` popup with a `PopoverTitle` (or an `aria-label` on `PopoverContent`).
 *
 * @example
 * ```tsx
 * <Popover>
 *   <PopoverTrigger render={<Button variant='outline' />}>Share</PopoverTrigger>
 *   <PopoverContent>
 *     <PopoverHeader>
 *       <PopoverTitle>Share document</PopoverTitle>
 *       <PopoverDescription>Anyone with the link can view it.</PopoverDescription>
 *     </PopoverHeader>
 *   </PopoverContent>
 * </Popover>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/popover | Base UI Documentation}
 */
function Popover(props: Readonly<Popover.Props>): React.ReactElement {
  return <BasePopover.Root {...props} />;
}

/**
 * Renders the popover trigger.
 *
 * @remarks
 * - Client-only; renders a `<button>` element by default with `aria-haspopup="dialog"` and `aria-expanded`.
 * - Built on {@link https://base-ui.com/react/components/popover | Base UI Popover}
 * - Supports the `render` prop for element composition; set `nativeButton={false}` for non-button targets.
 *
 * @example
 * ```tsx
 * <PopoverTrigger render={<Button variant='ghost' size='icon' aria-label='Filters' />}>
 *   <SlidersHorizontal aria-hidden='true' />
 * </PopoverTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/popover | Base UI Documentation}
 */
const PopoverTrigger = ({ref, ...props}: Readonly<PopoverTrigger.Props>): React.ReactElement => {
  const {children, className, render, ...otherProps} = props;
  const primitiveRef = React.useCallback(
    (element: HTMLElement | null): ReturnType<React.RefCallback<HTMLElement>> => {
      if (typeof ref === "function") return ref(element);
      if (ref) ref.current = element;
      return undefined;
    },
    [ref],
  );

  return (
    <BasePopover.Trigger
      className={(state) => cn(styles.control, typeof className === "function" ? className(state) : className)}
      render={render}
      ref={primitiveRef}
      {...otherProps}>
      {children}
    </BasePopover.Trigger>
  );
};

/**
 * Renders the popover content.
 *
 * @remarks
 * - Client-only; render inside `Popover`. Renders Portal → Positioner → a `role="dialog"` `<div>` Popup.
 * - Built on {@link https://base-ui.com/react/components/popover | Base UI Popover}
 * - Placement props reach the Positioner: `side="bottom"`, `align="center"`, `sideOffset={4}` and `alignOffset={0}` by
 *   default. `keepMounted` and `container` reach the Portal; popup props, `render` and `ref` stay on the Popup.
 *
 * @example
 * ```tsx
 * <PopoverContent side='top' align='start'>
 *   <PopoverTitle>Display density</PopoverTitle>
 *   <DensityOptions />
 * </PopoverContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/popover | Base UI Documentation}
 */
const PopoverContent = ({ref, ...props}: Readonly<PopoverContent.Props>): React.ReactElement => {
  const {
    className,
    side = "bottom",
    align = "center",
    sideOffset = 4,
    alignOffset = 0,
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
    <BasePopover.Portal
      keepMounted={keepMounted}
      container={container}>
      <BasePopover.Positioner
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
        <BasePopover.Popup
          ref={ref}
          className={typeof className === "function" ? (state) => cn(styles.popup, className(state)) : cn(styles.popup, className)}
          {...popupProps}
        />
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
};

/**
 * Groups the title and description in a native div, preserving native props and refs.
 *
 * @remarks
 * - Exported from this `"use client"` module; structurally a plain `<div>` that registers no name or description.
 *   Place `PopoverTitle` and `PopoverDescription` inside it, within `PopoverContent`.
 *
 * @example
 * ```tsx
 * <PopoverHeader>
 *   <PopoverTitle>Notifications</PopoverTitle>
 *   <PopoverDescription>Choose what we email you about.</PopoverDescription>
 * </PopoverHeader>
 * ```
 */
const PopoverHeader = ({ref, className, ...props}: Readonly<PopoverHeader.Props>): React.ReactElement => (
  <div
    ref={ref}
    className={cn(styles.header, className)}
    {...props}
  />
);

/**
 * Labels the popup through the actual Base UI Title primitive.
 *
 * @remarks
 * - Client-only; render inside `PopoverContent`. Renders an `<h2>` whose ID Base UI sets as the popup's
 *   `aria-labelledby`. Use one title per popup; change the heading level with `render={<h3 />}` to fit the page outline.
 *
 * @example
 * ```tsx
 * <PopoverTitle render={<h3 />}>Notifications</PopoverTitle>
 * ```
 */
const PopoverTitle = ({ref, className, ...props}: Readonly<PopoverTitle.Props>): React.ReactElement => (
  <BasePopover.Title
    ref={ref}
    className={typeof className === "function" ? (state) => cn(styles.title, className(state)) : cn(styles.title, className)}
    {...props}
  />
);

/**
 * Describes the popup through the actual Base UI Description primitive.
 *
 * @remarks
 * - Client-only; render inside `PopoverContent`. Renders a `<p>` whose ID Base UI sets as the popup's
 *   `aria-describedby`, so keep it short: assistive technology announces it with the popup's name.
 *
 * @example
 * ```tsx
 * <PopoverDescription>Changes apply to every project in this workspace.</PopoverDescription>
 * ```
 */
const PopoverDescription = ({ref, className, ...props}: Readonly<PopoverDescription.Props>): React.ReactElement => (
  <BasePopover.Description
    ref={ref}
    className={typeof className === "function" ? (state) => cn(styles.description, className(state)) : cn(styles.description, className)}
    {...props}
  />
);

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Popover {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = PopoverProps;
  export type State = BasePopover.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace PopoverTrigger {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = PopoverTriggerProps;
  export type State = BasePopover.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace PopoverContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = PopoverContentProps;
  export type State = BasePopover.Popup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace PopoverHeader {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = PopoverHeaderProps;
  export type State = Record<string, never>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace PopoverTitle {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = PopoverTitleProps;
  export type State = BasePopover.Title.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace PopoverDescription {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = PopoverDescriptionProps;
  export type State = BasePopover.Description.State;
}

Popover.displayName = "Popover";
PopoverTrigger.displayName = "PopoverTrigger";
PopoverContent.displayName = "PopoverContent";
PopoverHeader.displayName = "PopoverHeader";
PopoverTitle.displayName = "PopoverTitle";
PopoverDescription.displayName = "PopoverDescription";

export {Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger};
