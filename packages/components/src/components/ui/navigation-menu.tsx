"use client";

import {NavigationMenu as BaseNavigationMenu} from "@base-ui/react/navigation-menu";
import {ChevronDown} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./navigation-menu.module.css";

/** Returns the CSS classes used by the navigation menu trigger wrapper. */
export function navigationMenuTriggerStyle(className?: string): string {
  return cn(styles.trigger, className);
}

interface NavigationMenuTriggerProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Trigger>, "className"> {
  className?: string;
}

const NavigationMenu = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Root>>(
  ({className, children, ...props}, ref) => (
    <BaseNavigationMenu.Root
      ref={ref}
      className={cn(styles.root, className)}
      {...props}>
      {children}
      <NavigationMenuViewport />
    </BaseNavigationMenu.Root>
  ),
);
NavigationMenu.displayName = "NavigationMenu";

const NavigationMenuList = React.forwardRef<HTMLUListElement, React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.List>>(
  ({className, ...props}, ref) => (
    <BaseNavigationMenu.List
      ref={ref}
      className={cn(styles.list, className)}
      {...props}
    />
  ),
);
NavigationMenuList.displayName = "NavigationMenuList";

const NavigationMenuItem = BaseNavigationMenu.Item;

const NavigationMenuTrigger = React.forwardRef<HTMLButtonElement, NavigationMenuTriggerProps>(({className, children, ...props}, ref) => (
  <BaseNavigationMenu.Trigger
    ref={ref}
    className={cn(styles.trigger, className)}
    {...props}>
    {children}
    <ChevronDown className={styles.triggerIcon} />
  </BaseNavigationMenu.Trigger>
));
NavigationMenuTrigger.displayName = "NavigationMenuTrigger";

const NavigationMenuContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Content>>(
  ({className, ...props}, ref) => (
    <BaseNavigationMenu.Content
      ref={ref}
      className={cn(styles.content, className)}
      {...props}
    />
  ),
);
NavigationMenuContent.displayName = "NavigationMenuContent";

const NavigationMenuLink = React.forwardRef<HTMLAnchorElement, React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Link>>(
  ({className, ...props}, ref) => (
    <BaseNavigationMenu.Link
      ref={ref}
      className={cn(styles.link, className)}
      {...props}
    />
  ),
);
NavigationMenuLink.displayName = "NavigationMenuLink";

const NavigationMenuViewport = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseNavigationMenu.Viewport>>(
  ({className, ...props}, ref) => (
    <div className={styles.viewportWrapper}>
      <BaseNavigationMenu.Portal>
        <BaseNavigationMenu.Positioner className={styles.positioner}>
          <BaseNavigationMenu.Popup className={styles.popup}>
            <BaseNavigationMenu.Viewport
              ref={ref}
              className={cn(styles.viewport, className)}
              {...props}
            />
          </BaseNavigationMenu.Popup>
        </BaseNavigationMenu.Positioner>
      </BaseNavigationMenu.Portal>
    </div>
  ),
);
NavigationMenuViewport.displayName = "NavigationMenuViewport";

const NavigationMenuIndicator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.indicator, className)}
    {...props}>
    <div className={styles.indicatorInner} />
  </div>
));
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
