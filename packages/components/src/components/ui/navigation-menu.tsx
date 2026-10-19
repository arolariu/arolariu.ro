"use client";

import {NavigationMenu as BaseNavigationMenu} from "@base-ui/react/navigation-menu";
import type {ComponentRenderFn, HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import {ChevronDown} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./navigation-menu.module.css";

type PartProps<Part extends React.ElementType> = Readonly<
  React.ComponentPropsWithRef<Part> & {[attribute: `data-${string}`]: string | number | boolean | undefined}
>;

/** Returns the CSS classes used by a navigation trigger or a trigger-styled link. */
export function navigationMenuTriggerStyle(className?: string): string {
  return cn(styles.trigger, className);
}

/** Readonly primitive root options with automatic popup placement. */
export type NavigationMenuProps<Value = unknown> = Readonly<
  BaseNavigationMenu.Root.Props<Value> & {
    /** Alignment of the automatic positioner. @default "start" */
    align?: BaseNavigationMenu.Positioner.Props["align"];
    /**
     * Configures the automatic portaled popup. Set `false` when providing an
     * explicit Positioner.
     */
    positionerProps?: NavigationMenuPositionerProps | false;
  }
>;

/** Readonly props for the primitive navigation list. */
export type NavigationMenuListProps = Readonly<React.ComponentPropsWithRef<typeof BaseNavigationMenu.List>>;
/** Readonly props for an individual navigation item. */
export type NavigationMenuItemProps = Readonly<React.ComponentPropsWithRef<typeof BaseNavigationMenu.Item>>;
/** Readonly props for the native navigation trigger, including primitive render/class callbacks. */
export type NavigationMenuTriggerProps = Readonly<React.ComponentPropsWithRef<typeof BaseNavigationMenu.Trigger>>;
/** Readonly props for portaled item content and its activation/transition state. */
export type NavigationMenuContentProps = Readonly<React.ComponentPropsWithRef<typeof BaseNavigationMenu.Content>>;
/** Readonly props for a native navigation link. */
export type NavigationMenuLinkProps = Readonly<React.ComponentPropsWithRef<typeof BaseNavigationMenu.Link>>;

/** Readonly positioning options with independently owned Portal, Popup and Viewport props. */
export type NavigationMenuPositionerProps = Readonly<
  PartProps<typeof BaseNavigationMenu.Positioner> & {
    /** Portal mounting/container options and extra children; render and ref belong to the Portal. */
    portalProps?: PartProps<typeof BaseNavigationMenu.Portal>;
    /** Popup naming, render/class state and ref belong to the actual `<nav>` popup. */
    popupProps?: PartProps<typeof BaseNavigationMenu.Popup>;
    /** Viewport render/class props and ref belong to the clipping viewport. */
    viewportProps?: PartProps<typeof BaseNavigationMenu.Viewport>;
  }
>;

/** Resolves opaque element slots only after their SDK owner actually mounts. */
function DecoratedNavigationElement({
  render,
  elementProps,
  children,
  decoration,
}: Readonly<{
  render: React.ReactElement;
  elementProps: HTMLProps;
  children: React.ReactNode;
  decoration: React.ReactNode;
}>): React.ReactElement {
  // eslint-disable-next-line react-x/no-children-to-array -- public React normalization supports opaque Flight slots without inspecting private fields.
  const elements = React.Children.toArray(render);
  const [element] = elements;
  if (elements.length !== 1 || !React.isValidElement<{children?: React.ReactNode}>(element) || element.type === React.Fragment) {
    throw new TypeError("NavigationMenu render requires a single non-Fragment React element.");
  }
  // eslint-disable-next-line react-x/no-clone-element -- decorate children only; useRender preserves the SDK's merged props and refs.
  const decorated = React.cloneElement(
    element,
    undefined,
    <>
      {children === undefined ? element.props.children : children}
      {decoration}
    </>,
  );
  return useRender({render: decorated, props: {...elementProps}});
}

function withDecoration<State>(
  render: React.ReactElement | ComponentRenderFn<HTMLProps, State> | undefined,
  children: React.ReactNode,
  decoration: React.ReactNode,
): React.ReactElement | ComponentRenderFn<HTMLProps, State> | undefined {
  if (render === undefined || typeof render === "function") return render;
  return function renderNavigationElement(elementProps): React.ReactElement {
    return (
      <DecoratedNavigationElement
        render={render}
        elementProps={elementProps}
        decoration={decoration}>
        {children}
      </DecoratedNavigationElement>
    );
  };
}

/**
 * Coordinates native navigation semantics and one automatic portaled popup.
 * Set `positionerProps={false}` for explicit Positioner composition.
 */
function NavigationMenu<Value = unknown>(props: Readonly<NavigationMenuProps<Value>>): React.ReactElement {
  const {className, children, render, ref, align = "start", orientation = "horizontal", positionerProps, ...otherProps} = props;
  const positioner = positionerProps !== false && (
    <NavigationMenuPositioner
      align={align}
      {...positionerProps}
    />
  );
  const rootChildren = (
    <>
      {children}
      {positioner}
    </>
  );

  return (
    <BaseNavigationMenu.Root<Value>
      data-slot='navigation-menu'
      ref={ref}
      data-orientation={orientation}
      orientation={orientation}
      render={withDecoration(render, children, positioner)}
      className={(state) => cn(styles.root, typeof className === "function" ? className(state) : className)}
      {...otherProps}>
      {rootChildren}
    </BaseNavigationMenu.Root>
  );
}

/** Renders the primitive list and preserves its open-state callbacks, native orientation and ref. */
const NavigationMenuList = ({ref, ...props}: Readonly<NavigationMenuList.Props>): React.ReactElement => {
  const {className, ...otherProps} = props;
  return (
    <BaseNavigationMenu.List
      data-slot='navigation-menu-list'
      ref={ref}
      className={(state) => cn(styles.list, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
};

/** Renders a native list item with Base UI's value and render composition contracts. */
const NavigationMenuItem = ({ref, ...props}: Readonly<NavigationMenuItem.Props>): React.ReactElement => {
  const {className, ...otherProps} = props;
  return (
    <BaseNavigationMenu.Item
      data-slot='navigation-menu-item'
      ref={ref}
      className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
};

/** Opens item content with a native button and an associated primitive-owned decorative icon. */
const NavigationMenuTrigger = ({ref, ...props}: Readonly<NavigationMenuTrigger.Props>): React.ReactElement => {
  const {className, children, render, ...otherProps} = props;
  const icon = (
    <BaseNavigationMenu.Icon className={styles.triggerIcon}>
      <ChevronDown aria-hidden='true' />
    </BaseNavigationMenu.Icon>
  );
  const triggerChildren = (
    <>
      {children}
      {icon}
    </>
  );
  return (
    <BaseNavigationMenu.Trigger
      data-slot='navigation-menu-trigger'
      ref={ref}
      render={withDecoration(render, children, icon)}
      className={(state) => cn(styles.trigger, typeof className === "function" ? className(state) : className)}
      {...otherProps}>
      {triggerChildren}
    </BaseNavigationMenu.Trigger>
  );
};

/** Moves active item content into the viewport, preserving activation direction and enter/exit callbacks. */
const NavigationMenuContent = ({ref, ...props}: Readonly<NavigationMenuContent.Props>): React.ReactElement => {
  const {className, ...otherProps} = props;
  return (
    <BaseNavigationMenu.Content
      data-slot='navigation-menu-content'
      ref={ref}
      className={(state) => cn(styles.content, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
};

/**
 * Renders a native anchor, retaining link attributes, active-page state, handlers, cancellation and refs.
 *
 * @remarks
 * Mark the link to the current page with `active`: Base UI adds `aria-current="page"`, and the link draws a 2px
 * underline in addition to the hover tint, so the current page is not identified by colour alone and stays marked
 * under forced colors. A caller-supplied `aria-current="page"` receives the same indicator.
 *
 * @example
 * ```tsx
 * <NavigationMenuLink href='/docs' active>Docs</NavigationMenuLink>
 * ```
 */
const NavigationMenuLink = ({ref, ...props}: Readonly<NavigationMenuLink.Props>): React.ReactElement => {
  const {className, ...otherProps} = props;
  return (
    <BaseNavigationMenu.Link
      data-slot='navigation-menu-link'
      ref={ref}
      className={(state) => cn(styles.link, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
};

/**
 * Positions a portaled Popup/Viewport against the active trigger.
 *
 * @remarks
 * Defaults to bottom/start, sideOffset 8 and alignOffset 0. Base UI owns
 * measurements, positioning, instant state and all render/class callbacks.
 * Positioner children precede the popup; popupProps children precede its viewport.
 * Keep callback/ref/class props on their named primitive owner.
 */
const NavigationMenuPositioner = ({ref, ...props}: Readonly<NavigationMenuPositioner.Props>): React.ReactElement => {
  const {
    className,
    children,
    render,
    side = "bottom",
    sideOffset = 8,
    align = "start",
    alignOffset = 0,
    portalProps,
    popupProps,
    viewportProps,
    ...otherProps
  } = props;
  const {className: viewportClassName, ...viewportNativeProps} = viewportProps ?? {};
  const {className: popupClassName, render: popupRender, children: popupExtraChildren, ...popupNativeProps} = popupProps ?? {};
  const viewport = (
    <BaseNavigationMenu.Viewport
      data-slot='navigation-menu-viewport'
      className={(state) => cn(styles.viewport, typeof viewportClassName === "function" ? viewportClassName(state) : viewportClassName)}
      {...viewportNativeProps}
    />
  );
  const popupChildren = (
    <>
      {popupExtraChildren}
      {viewport}
    </>
  );
  const popup = (
    <BaseNavigationMenu.Popup
      data-slot='navigation-menu-popup'
      render={withDecoration(popupRender, popupExtraChildren, viewport)}
      className={(state) => cn(styles.popup, typeof popupClassName === "function" ? popupClassName(state) : popupClassName)}
      {...popupNativeProps}>
      {popupChildren}
    </BaseNavigationMenu.Popup>
  );
  const positionerChildren = (
    <>
      {children}
      {popup}
    </>
  );

  return (
    <BaseNavigationMenu.Portal {...portalProps}>
      {portalProps?.children}
      <BaseNavigationMenu.Positioner
        data-slot='navigation-menu-positioner'
        ref={ref}
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        render={withDecoration(render, children, popup)}
        className={(state) => cn(styles.positioner, typeof className === "function" ? className(state) : className)}
        {...otherProps}>
        {positionerChildren}
      </BaseNavigationMenu.Positioner>
    </BaseNavigationMenu.Portal>
  );
};

// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace NavigationMenu {
  export type Props<Value = unknown> = NavigationMenuProps<Value>;
  export type State = BaseNavigationMenu.Root.State;
  export type Actions = BaseNavigationMenu.Root.Actions;
  export type ChangeEventDetails = BaseNavigationMenu.Root.ChangeEventDetails;
  export type ChangeEventReason = BaseNavigationMenu.Root.ChangeEventReason;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace NavigationMenuList {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical public namespace alias
  export type Props = NavigationMenuListProps;
  export type State = BaseNavigationMenu.List.State;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace NavigationMenuItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical public namespace alias
  export type Props = NavigationMenuItemProps;
  export type State = BaseNavigationMenu.Item.State;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace NavigationMenuTrigger {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical public namespace alias
  export type Props = NavigationMenuTriggerProps;
  export type State = BaseNavigationMenu.Trigger.State;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace NavigationMenuContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical public namespace alias
  export type Props = NavigationMenuContentProps;
  export type State = BaseNavigationMenu.Content.State;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace NavigationMenuLink {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical public namespace alias
  export type Props = NavigationMenuLinkProps;
  export type State = BaseNavigationMenu.Link.State;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace NavigationMenuPositioner {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical public namespace alias
  export type Props = NavigationMenuPositionerProps;
  export type State = BaseNavigationMenu.Positioner.State;
}
NavigationMenu.displayName = "NavigationMenu";
NavigationMenuList.displayName = "NavigationMenuList";
NavigationMenuItem.displayName = "NavigationMenuItem";
NavigationMenuTrigger.displayName = "NavigationMenuTrigger";
NavigationMenuContent.displayName = "NavigationMenuContent";
NavigationMenuLink.displayName = "NavigationMenuLink";
NavigationMenuPositioner.displayName = "NavigationMenuPositioner";

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
};
