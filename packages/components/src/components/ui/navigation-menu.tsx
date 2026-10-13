"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {NavigationMenu as BaseNavigationMenu} from "@base-ui/react/navigation-menu";
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
     * explicit Positioner or the deprecated Viewport adapter.
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

/** Legacy viewport props; the inherited DOM/render/ref contract targets Viewport, not Positioner. */
export type NavigationMenuViewportProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseNavigationMenu.Viewport> & {
    /** Placement and popup options for the compatibility shell. */
    positionerProps?: Omit<NavigationMenuPositionerProps, "viewportProps">;
  }
>;

/** Props for the standalone decorative compatibility indicator, with no menu state. */
export type NavigationMenuIndicatorProps = Readonly<
  Omit<React.ComponentPropsWithRef<"div">, "ref"> & {
    /** Ref to the rendered decorative element, including non-div render targets. */
    ref?: React.Ref<HTMLElement>;
    /** Replaces the decorative div; receives an empty state, not menu state. */
    render?: useRender.RenderProp<NavigationMenuIndicator.State>;
    /** @deprecated Prefer `render` for element composition. */
    asChild?: boolean;
  }
>;

function elementChildren(children: React.ReactNode, render: unknown): React.ReactNode {
  return children === undefined && React.isValidElement<{children?: React.ReactNode}>(render) ? render.props.children : children;
}

function withElementChildren<Render>(render: Render, children: React.ReactNode): Render | React.ReactElement {
  // eslint-disable-next-line react-x/no-clone-element -- only normalize static children; Base UI still merges refs/events/state and owns function renders
  return React.isValidElement(render) ? React.cloneElement(render, undefined, children) : render;
}

/**
 * Coordinates native navigation semantics and mounts one automatic portaled popup.
 *
 * @remarks
 * Base UI owns all Root render/class state and value-change details, including cancellation.
 * `align` defaults to `"start"`; `positionerProps.align` can override it.
 * Use `positionerProps={false}` to compose an explicit Positioner/legacy Viewport.
 */
function NavigationMenu<Value = unknown>(props: Readonly<NavigationMenu.Props<Value>>): React.ReactElement {
  const {className, children, render, align = "start", orientation = "horizontal", positionerProps, ...otherProps} = props;
  const rootChildren = (
    <>
      {elementChildren(children, render)}
      {positionerProps !== false && (
        <NavigationMenuPositioner
          align={align}
          {...positionerProps}
        />
      )}
    </>
  );

  return (
    <BaseNavigationMenu.Root
      data-slot='navigation-menu'
      {...otherProps}
      data-orientation={orientation}
      orientation={orientation}
      render={withElementChildren(render, rootChildren)}
      className={(state) => cn(styles.root, typeof className === "function" ? className(state) : className)}>
      {rootChildren}
    </BaseNavigationMenu.Root>
  );
}

/** Renders the primitive list and preserves its open-state callbacks, native orientation and ref. */
const NavigationMenuList = React.forwardRef<HTMLUListElement, NavigationMenuList.Props>((props, ref): React.ReactElement => {
  const {className, ...otherProps} = props;
  return (
    <BaseNavigationMenu.List
      data-slot='navigation-menu-list'
      {...otherProps}
      ref={ref}
      className={(state) => cn(styles.list, typeof className === "function" ? className(state) : className)}
    />
  );
});

/** Renders a native list item with Base UI's value and render composition contracts. */
const NavigationMenuItem = React.forwardRef<HTMLLIElement, NavigationMenuItem.Props>((props, ref): React.ReactElement => {
  const {className, ...otherProps} = props;
  return (
    <BaseNavigationMenu.Item
      data-slot='navigation-menu-item'
      {...otherProps}
      ref={ref}
      className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}
    />
  );
});

/** Opens item content with a native button and an associated primitive-owned decorative icon. */
const NavigationMenuTrigger = React.forwardRef<HTMLButtonElement, NavigationMenuTrigger.Props>((props, ref): React.ReactElement => {
  const {className, children, render, ...otherProps} = props;
  const triggerChildren = (
    <>
      {elementChildren(children, render)}
      <BaseNavigationMenu.Icon className={styles.triggerIcon}>
        <ChevronDown aria-hidden='true' />
      </BaseNavigationMenu.Icon>
    </>
  );
  return (
    <BaseNavigationMenu.Trigger
      data-slot='navigation-menu-trigger'
      {...otherProps}
      ref={ref}
      render={withElementChildren(render, triggerChildren)}
      className={(state) => cn(styles.trigger, typeof className === "function" ? className(state) : className)}>
      {triggerChildren}
    </BaseNavigationMenu.Trigger>
  );
});

/** Moves active item content into the viewport, preserving activation direction and enter/exit callbacks. */
const NavigationMenuContent = React.forwardRef<HTMLDivElement, NavigationMenuContent.Props>((props, ref): React.ReactElement => {
  const {className, ...otherProps} = props;
  return (
    <BaseNavigationMenu.Content
      data-slot='navigation-menu-content'
      {...otherProps}
      ref={ref}
      className={(state) => cn(styles.content, typeof className === "function" ? className(state) : className)}
    />
  );
});

/** Renders a native anchor, retaining link attributes, active-page state, handlers, cancellation and refs. */
const NavigationMenuLink = React.forwardRef<HTMLAnchorElement, NavigationMenuLink.Props>((props, ref): React.ReactElement => {
  const {className, ...otherProps} = props;
  return (
    <BaseNavigationMenu.Link
      data-slot='navigation-menu-link'
      {...otherProps}
      ref={ref}
      className={(state) => cn(styles.link, typeof className === "function" ? className(state) : className)}
    />
  );
});

/**
 * Positions a portaled Popup/Viewport against the active trigger.
 *
 * @remarks
 * Defaults to bottom/start, sideOffset 8 and alignOffset 0. Base UI owns
 * measurements, positioning, instant state and all render/class callbacks.
 * Positioner children precede the popup; popupProps children precede its viewport.
 * Keep callback/ref/class props on their named primitive owner.
 */
const NavigationMenuPositioner = React.forwardRef<HTMLDivElement, NavigationMenuPositioner.Props>((props, ref): React.ReactElement => {
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
  const popupChildren = (
    <>
      {elementChildren(popupProps?.children, popupProps?.render)}
      <BaseNavigationMenu.Viewport
        data-slot='navigation-menu-viewport'
        {...viewportProps}
        className={(state) =>
          cn(styles.viewport, typeof viewportProps?.className === "function" ? viewportProps.className(state) : viewportProps?.className)
        }
      />
    </>
  );
  const positionerChildren = (
    <>
      {elementChildren(children, render)}
      <BaseNavigationMenu.Popup
        data-slot='navigation-menu-popup'
        {...popupProps}
        render={withElementChildren(popupProps?.render, popupChildren)}
        className={(state) =>
          cn(styles.popup, typeof popupProps?.className === "function" ? popupProps.className(state) : popupProps?.className)
        }>
        {popupChildren}
      </BaseNavigationMenu.Popup>
    </>
  );

  return (
    <BaseNavigationMenu.Portal {...portalProps}>
      {portalProps?.children}
      <BaseNavigationMenu.Positioner
        data-slot='navigation-menu-positioner'
        {...otherProps}
        ref={ref}
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        render={withElementChildren(render, positionerChildren)}
        className={(state) => cn(styles.positioner, typeof className === "function" ? className(state) : className)}>
        {positionerChildren}
      </BaseNavigationMenu.Positioner>
    </BaseNavigationMenu.Portal>
  );
});

/**
 * Retains the old portaled viewport shell while routing inherited callbacks/classes/ref to Viewport.
 *
 * @deprecated Use NavigationMenuPositioner with `viewportProps`. When rendered
 * explicitly under NavigationMenu, set `positionerProps={false}` on the Root.
 */
const NavigationMenuViewport = React.forwardRef<HTMLDivElement, NavigationMenuViewport.Props>((props, ref): React.ReactElement => {
  const {positionerProps, ...viewportProps} = props;
  return (
    <NavigationMenuPositioner
      {...positionerProps}
      viewportProps={{...viewportProps, ref}}
    />
  );
});

/**
 * Standalone decorative compatibility part; does not track an item or popup.
 *
 * @remarks
 * This is intentionally not Base UI Icon: existing consumers render it outside
 * an Item/Trigger. It is hidden from assistive technology by default and has an
 * empty callback state. Trigger's built-in chevron uses the associated Icon.
 */
const NavigationMenuIndicator = React.forwardRef<HTMLElement, NavigationMenuIndicator.Props>((props, ref): React.ReactElement => {
  // eslint-disable-next-line sonarjs/deprecation -- retain the documented legacy child-composition API
  const {asChild = false, children, className, render, ...otherProps} = props;
  const legacyChild = asChild && React.isValidElement(children) && children.type !== React.Fragment ? children : undefined;
  const renderProp = legacyChild ?? render;
  const indicatorChildren =
    elementChildren(legacyChild ? undefined : children, renderProp) ?? (renderProp ? undefined : <div className={styles.indicatorInner} />);

  return useRender<NavigationMenuIndicator.State, HTMLElement>({
    defaultTagName: "div",
    ref,
    render: withElementChildren(renderProp, indicatorChildren),
    state: {},
    props: mergeProps<"div">({"aria-hidden": true, className: cn(styles.indicator, className)}, otherProps, {children: indicatorChildren}),
  });
});

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
// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace NavigationMenuViewport {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical public namespace alias
  export type Props = NavigationMenuViewportProps;
  export type State = BaseNavigationMenu.Viewport.State;
}
// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace NavigationMenuIndicator {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical public namespace alias
  export type Props = NavigationMenuIndicatorProps;
  export type State = Record<string, never>;
}

NavigationMenu.displayName = "NavigationMenu";
NavigationMenuList.displayName = "NavigationMenuList";
NavigationMenuItem.displayName = "NavigationMenuItem";
NavigationMenuTrigger.displayName = "NavigationMenuTrigger";
NavigationMenuContent.displayName = "NavigationMenuContent";
NavigationMenuLink.displayName = "NavigationMenuLink";
NavigationMenuPositioner.displayName = "NavigationMenuPositioner";
// eslint-disable-next-line sonarjs/deprecation -- keep the compatibility adapter's diagnostic display name
NavigationMenuViewport.displayName = "NavigationMenuViewport";
NavigationMenuIndicator.displayName = "NavigationMenuIndicator";

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  NavigationMenuViewport,
};
