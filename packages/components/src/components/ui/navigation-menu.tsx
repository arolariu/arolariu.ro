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
  className?: string;
}

interface NavigationMenuListProps extends Omit<React.ComponentPropsWithRef<typeof BaseNavigationMenu.List>, "className"> {
  className?: string;
}

interface NavigationMenuTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseNavigationMenu.Trigger>, "className"> {
  className?: string;
}

interface NavigationMenuContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseNavigationMenu.Content>, "className"> {
  className?: string;
}

interface NavigationMenuLinkProps extends Omit<React.ComponentPropsWithRef<typeof BaseNavigationMenu.Link>, "className"> {
  className?: string;
}

interface NavigationMenuViewportProps extends Omit<React.ComponentPropsWithRef<typeof BaseNavigationMenu.Viewport>, "className"> {
  className?: string;
}

interface NavigationMenuIndicatorProps extends React.ComponentPropsWithRef<"div"> {
  className?: string;
  render?: useRender.RenderProp<Record<string, never>>;
  /** @deprecated Prefer the `render` prop. */
  asChild?: boolean;
}

/**
 * Renders the navigation menu root and shared viewport.
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

const NavigationMenuItem = BaseNavigationMenu.Item;

/**
 * Renders a navigation menu trigger with the default chevron affordance.
 */
function NavigationMenuTrigger(props: Readonly<NavigationMenuTrigger.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseNavigationMenu.Trigger
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps({className: cn(styles.trigger, className)}, {}),
      })}>
      {children}
      <ChevronDown className={styles.triggerIcon} />
    </BaseNavigationMenu.Trigger>
  );
}

/**
 * Renders the navigation menu content region.
 */
function NavigationMenuContent(props: Readonly<NavigationMenuContent.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseNavigationMenu.Content
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.content, className)}, {}),
      })}>
      {children}
    </BaseNavigationMenu.Content>
  );
}

/**
 * Renders a styled navigation link.
 */
function NavigationMenuLink(props: Readonly<NavigationMenuLink.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseNavigationMenu.Link
      {...otherProps}
      render={useRender({
        defaultTagName: "a",
        render: render as never,
        props: mergeProps({className: cn(styles.link, className)}, {}),
      })}>
      {children}
    </BaseNavigationMenu.Link>
  );
}

/**
 * Renders the shared navigation menu viewport.
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
 * Renders the custom navigation menu indicator wrapper.
 */
function NavigationMenuIndicator(props: Readonly<NavigationMenuIndicator.Props>): React.ReactElement {
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
