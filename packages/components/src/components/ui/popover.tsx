"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Popover as BasePopover} from "@base-ui/react/popover";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./popover.module.css";

/** State, payload and lifecycle options owned by the popover root. */
export type PopoverProps = Readonly<React.ComponentPropsWithRef<typeof BasePopover.Root>>;

/** Primitive-owned trigger props with an accurate composed-element ref and legacy child slot. */
export type PopoverTriggerProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BasePopover.Trigger>, "ref">
    & React.RefAttributes<HTMLElement> & {
      /**
       * Enables child element composition instead of rendering the default wrapper.
       * @default false
       * @deprecated Prefer Base UI's `render` prop.
       */
      readonly asChild?: boolean;
    }
>;

/** Legacy structural container props; use Content.anchor to opt into positioning. */
export type PopoverAnchorProps = Readonly<
  React.ComponentPropsWithRef<"div"> & {
    /**
     * Applies additional CSS classes to the component root element.
     * @default undefined
     */
    readonly className?: string;
    /**
     * Overrides the default rendered element while preserving component behavior.
     * @default undefined
     */
    readonly render?: useRender.RenderProp<Record<string, never>>;
    /**
     * Enables child element composition instead of rendering the default wrapper.
     * @default false
     * @deprecated Prefer Base UI's `render` prop.
     */
    readonly asChild?: boolean;
  }
>;

/** Popup semantics/focus plus explicit Positioner and Portal options. `sideOffset` defaults to 4. */
export type PopoverContentProps = Readonly<
  React.ComponentPropsWithRef<typeof BasePopover.Popup>
    & Pick<
      React.ComponentPropsWithRef<typeof BasePopover.Positioner>,
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
    & Pick<React.ComponentPropsWithRef<typeof BasePopover.Portal>, "keepMounted" | "container">
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
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/popover | Base UI Popover}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <Popover>Content</Popover>
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
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/popover | Base UI Popover}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <PopoverTrigger>Content</PopoverTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/popover | Base UI Documentation}
 */
const PopoverTrigger = React.forwardRef<HTMLElement, PopoverTrigger.Props>(
  (props: Readonly<PopoverTrigger.Props>, ref): React.ReactElement => {
    // eslint-disable-next-line sonarjs/deprecation -- backward-compatible asChild support is part of the public API.
    const {asChild = false, children, className, render, ...otherProps} = props;
    // eslint-disable-next-line react-x/no-children-to-array -- public React normalization supports Base UI lazy element slots.
    const slotChildren = asChild ? React.Children.toArray(children) : [];
    const child = slotChildren.length === 1 ? slotChildren[0] : undefined;
    const renderProp = React.isValidElement(child) ? child : render;
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
        {...otherProps}
        className={className}
        render={renderProp}
        ref={primitiveRef}>
        {asChild && React.isValidElement(child) ? undefined : children}
      </BasePopover.Trigger>
    );
  },
);

/**
 * Renders a legacy structural container, not a registered positioning anchor.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Does not register an anchor with Base UI; pass an element/ref to `PopoverContent.anchor` to position against it
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <PopoverAnchor>Content</PopoverAnchor>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/popover | Base UI Documentation}
 */
const PopoverAnchor = React.forwardRef<HTMLDivElement, PopoverAnchor.Props>(
  (props: Readonly<PopoverAnchor.Props>, ref): React.ReactElement => {
    // eslint-disable-next-line sonarjs/deprecation -- backward-compatible asChild support is part of the public API.
    const {asChild = false, children, className, render, ...otherProps} = props;
    // eslint-disable-next-line react-x/no-children-to-array -- public React normalization supports Base UI lazy element slots.
    const slotChildren = asChild ? React.Children.toArray(children) : [];
    const child = slotChildren.length === 1 ? slotChildren[0] : undefined;
    const renderProp = React.isValidElement(child) ? child : render;

    return useRender({
      defaultTagName: "div",
      ref,
      render: renderProp,
      props: mergeProps({className: cn(styles.anchor, className)}, otherProps, {
        children: asChild && React.isValidElement(child) ? undefined : children,
      }),
    });
  },
);

/**
 * Renders the popover content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/popover | Base UI Popover}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <PopoverContent>Content</PopoverContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/popover | Base UI Documentation}
 */
const PopoverContent = React.forwardRef<React.ComponentRef<typeof BasePopover.Popup>, PopoverContent.Props>(
  (props: Readonly<PopoverContent.Props>, ref): React.ReactElement => {
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
  },
);

/** Groups the title and description in a native div, preserving native props and refs. */
const PopoverHeader = React.forwardRef<HTMLDivElement, PopoverHeader.Props>(
  ({className, ...props}: Readonly<PopoverHeader.Props>, ref): React.ReactElement => (
    <div
      ref={ref}
      className={cn(styles.header, className)}
      {...props}
    />
  ),
);

/** Labels the popup through the actual Base UI Title primitive. */
const PopoverTitle = React.forwardRef<HTMLHeadingElement, PopoverTitle.Props>(
  ({className, ...props}: Readonly<PopoverTitle.Props>, ref): React.ReactElement => (
    <BasePopover.Title
      ref={ref}
      className={typeof className === "function" ? (state) => cn(styles.title, className(state)) : cn(styles.title, className)}
      {...props}
    />
  ),
);

/** Describes the popup through the actual Base UI Description primitive. */
const PopoverDescription = React.forwardRef<HTMLParagraphElement, PopoverDescription.Props>(
  ({className, ...props}: Readonly<PopoverDescription.Props>, ref): React.ReactElement => (
    <BasePopover.Description
      ref={ref}
      className={typeof className === "function" ? (state) => cn(styles.description, className(state)) : cn(styles.description, className)}
      {...props}
    />
  ),
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
namespace PopoverAnchor {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical Component.Props and named props must both remain public.
  export type Props = PopoverAnchorProps;
  export type State = Record<string, never>;
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
PopoverAnchor.displayName = "PopoverAnchor";
PopoverContent.displayName = "PopoverContent";
PopoverHeader.displayName = "PopoverHeader";
PopoverTitle.displayName = "PopoverTitle";
PopoverDescription.displayName = "PopoverDescription";

export {Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger};
