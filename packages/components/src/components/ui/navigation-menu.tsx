"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {NavigationMenu as BaseNavigationMenu} from "@base-ui/react/navigation-menu";
import {useRender} from "@base-ui/react/use-render";
import {ChevronDown} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./navigation-menu.module.css";

/** Returns the CSS classes used by the navigation menu trigger wrapper. */
export function navigationMenuTriggerStyle(className?: string): string {
  return cn(styles.trigger, className);
}

interface NavigationMenuProps extends Omit<React.ComponentPropsWithRef<typeof BaseNavigationMenu.Root>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface NavigationMenuListProps extends Omit<React.ComponentPropsWithRef<typeof BaseNavigationMenu.List>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface NavigationMenuTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseNavigationMenu.Trigger>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface NavigationMenuContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseNavigationMenu.Content>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface NavigationMenuLinkProps extends Omit<React.ComponentPropsWithRef<typeof BaseNavigationMenu.Link>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface NavigationMenuViewportProps extends Omit<React.ComponentPropsWithRef<typeof BaseNavigationMenu.Viewport>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface NavigationMenuIndicatorProps extends React.ComponentPropsWithRef<"div"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Overrides the default rendered element while preserving component behavior.
   * @default undefined
   */
  render?: useRender.RenderProp<Record<string, never>>;
  /**
   * Enables child element composition instead of rendering the default wrapper.
   * @default false
   * @deprecated Prefer Base UI's `render` prop.
   */
  asChild?: boolean;
}

/**
 * Coordinates navigation menu state and accessibility behavior.
 *
 * @remarks
 * - Renders a `<nav>` element by default
 * - Built on {@link https://base-ui.com/react/components/navigation-menu | Base UI Navigation Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <NavigationMenu>Content</NavigationMenu>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/navigation-menu | Base UI Documentation}
 */
function NavigationMenu(props: Readonly<NavigationMenu.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseNavigationMenu.Root
      {...otherProps}
      render={useRender({
        defaultTagName: "nav",
        render: render as never,
        props: mergeProps({className: cn(styles.root, className)}, {}),
      })}>
      {children}
      <NavigationMenuViewport />
    </BaseNavigationMenu.Root>
  );
}

/**
 * Renders the navigation menu list.
 *
 * @remarks
 * - Renders a `<ul>` element by default
 * - Built on {@link https://base-ui.com/react/components/navigation-menu | Base UI Navigation Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <NavigationMenuList>Content</NavigationMenuList>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/navigation-menu | Base UI Documentation}
 */
function NavigationMenuList(props: Readonly<NavigationMenuList.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseNavigationMenu.List
      {...otherProps}
      render={useRender({
        defaultTagName: "ul",
        render: render as never,
        props: mergeProps({className: cn(styles.list, className)}, {}),
      })}>
      {children}
    </BaseNavigationMenu.List>
  );
}

/**
 * Renders the navigation menu item.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/navigation-menu | Base UI Navigation Menu}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <NavigationMenuItem>Content</NavigationMenuItem>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/navigation-menu | Base UI Documentation}
 */
const NavigationMenuItem = BaseNavigationMenu.Item;

/**
 * Renders the navigation menu trigger.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/navigation-menu | Base UI Navigation Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <NavigationMenuTrigger>Content</NavigationMenuTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/navigation-menu | Base UI Documentation}
 */
const NavigationMenuTrigger = React.forwardRef<HTMLButtonElement, NavigationMenuTrigger.Props>(
  function NavigationMenuTrigger(props, forwardedRef) {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseNavigationMenu.Trigger
        {...otherProps}
        ref={forwardedRef}
        render={useRender({
          defaultTagName: "button",
          render: render as never,
          props: mergeProps({className: cn(styles.trigger, className)}, {}),
        })}>
        {children}
        <ChevronDown className={styles.triggerIcon} />
      </BaseNavigationMenu.Trigger>
    );
  },
);

/**
 * Renders the navigation menu content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/navigation-menu | Base UI Navigation Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <NavigationMenuContent>Content</NavigationMenuContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/navigation-menu | Base UI Documentation}
 */
const NavigationMenuContent = React.forwardRef<HTMLDivElement, NavigationMenuContent.Props>(
  function NavigationMenuContent(props, forwardedRef) {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseNavigationMenu.Content
        {...otherProps}
        ref={forwardedRef}
        render={useRender({
          defaultTagName: "div",
          render: render as never,
          props: mergeProps({className: cn(styles.content, className)}, {}),
        })}>
        {children}
      </BaseNavigationMenu.Content>
    );
  },
);

/**
 * Renders the navigation menu link.
 *
 * @remarks
 * - Renders a `<a>` element by default
 * - Built on {@link https://base-ui.com/react/components/navigation-menu | Base UI Navigation Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <NavigationMenuLink>Content</NavigationMenuLink>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/navigation-menu | Base UI Documentation}
 */
const NavigationMenuLink = React.forwardRef<HTMLAnchorElement, NavigationMenuLink.Props>(function NavigationMenuLink(props, forwardedRef) {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseNavigationMenu.Link
      {...otherProps}
      ref={forwardedRef}
      render={useRender({
        defaultTagName: "a",
        render: render as never,
        props: mergeProps({className: cn(styles.link, className)}, {}),
      })}>
      {children}
    </BaseNavigationMenu.Link>
  );
});

/**
 * Renders the navigation menu viewport.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/navigation-menu | Base UI Navigation Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <NavigationMenuViewport>Content</NavigationMenuViewport>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/navigation-menu | Base UI Documentation}
 */
function NavigationMenuViewport(props: Readonly<NavigationMenuViewport.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <div className={styles.viewportWrapper}>
      <BaseNavigationMenu.Portal>
        <BaseNavigationMenu.Positioner
          render={useRender({
            defaultTagName: "div",
            props: mergeProps({className: styles.positioner}, {}),
          })}>
          <BaseNavigationMenu.Popup
            render={useRender({
              defaultTagName: "div",
              props: mergeProps({className: styles.popup}, {}),
            })}>
            <BaseNavigationMenu.Viewport
              {...otherProps}
              render={useRender({
                defaultTagName: "div",
                render: render as never,
                props: mergeProps({className: cn(styles.viewport, className)}, {}),
              })}>
              {children}
            </BaseNavigationMenu.Viewport>
          </BaseNavigationMenu.Popup>
        </BaseNavigationMenu.Positioner>
      </BaseNavigationMenu.Portal>
    </div>
  );
}

/**
 * Renders the navigation menu indicator.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/navigation-menu | Base UI Navigation Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <NavigationMenuIndicator>Content</NavigationMenuIndicator>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/navigation-menu | Base UI Documentation}
 */
function NavigationMenuIndicator(props: Readonly<NavigationMenuIndicator.Props>): React.ReactElement {
  // eslint-disable-next-line sonarjs/deprecation -- backward-compatible asChild API
  const {asChild = false, children, className, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return useRender({
    defaultTagName: "div",
    render: renderProp as never,
    props: mergeProps({className: cn(styles.indicator, className)}, otherProps, {
      children: renderProp ? undefined : (children ?? <div className={styles.indicatorInner} />),
    }),
  });
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NavigationMenu {
  export type Props = NavigationMenuProps;
  export type State = BaseNavigationMenu.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NavigationMenuList {
  export type Props = NavigationMenuListProps;
  export type State = BaseNavigationMenu.List.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NavigationMenuTrigger {
  export type Props = NavigationMenuTriggerProps;
  export type State = BaseNavigationMenu.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NavigationMenuContent {
  export type Props = NavigationMenuContentProps;
  export type State = BaseNavigationMenu.Content.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NavigationMenuLink {
  export type Props = NavigationMenuLinkProps;
  export type State = BaseNavigationMenu.Link.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NavigationMenuViewport {
  export type Props = NavigationMenuViewportProps;
  export type State = BaseNavigationMenu.Viewport.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace NavigationMenuIndicator {
  export type Props = NavigationMenuIndicatorProps;
  export type State = Record<string, never>;
}

NavigationMenu.displayName = "NavigationMenu";
NavigationMenuList.displayName = "NavigationMenuList";
NavigationMenuItem.displayName = "NavigationMenuItem";
NavigationMenuTrigger.displayName = "NavigationMenuTrigger";
NavigationMenuContent.displayName = "NavigationMenuContent";
NavigationMenuLink.displayName = "NavigationMenuLink";
NavigationMenuViewport.displayName = "NavigationMenuViewport";
NavigationMenuIndicator.displayName = "NavigationMenuIndicator";

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
};
