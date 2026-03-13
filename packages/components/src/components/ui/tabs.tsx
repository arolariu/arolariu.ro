"use client";

import {Tabs as BaseTabs} from "@base-ui/react/tabs";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./tabs.module.css";

/**
 * Represents the configurable props for the Tabs root component.
 *
 * @remarks
 * Extends the Base UI tabs root primitive and exposes a documented class override for
 * outer layout customization.
 */
interface TabsProps extends React.ComponentPropsWithoutRef<typeof BaseTabs.Root> {
  /**
   * Additional CSS classes merged with the tabs root styles.
   */
  className?: string;
}

/**
 * Represents the configurable props for the TabsList component.
 *
 * @remarks
 * Extends the Base UI list primitive and documents the rendered children and class override.
 */
interface TabsListProps extends React.ComponentPropsWithoutRef<typeof BaseTabs.List> {
  /**
   * Additional CSS classes merged with the tabs list styles.
   */
  className?: string;
  /**
   * The tab triggers rendered inside the list.
   */
  children?: React.ReactNode;
}

/**
 * Represents the configurable props for the TabsTrigger component.
 *
 * @remarks
 * Extends the Base UI tab primitive and exposes a class override for trigger styling.
 */
interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof BaseTabs.Tab> {
  /**
   * Additional CSS classes merged with the tab trigger styles.
   */
  className?: string;
}

/**
 * Represents the configurable props for the TabsContent component.
 *
 * @remarks
 * Extends the Base UI panel primitive and exposes a class override for panel layout.
 */
interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof BaseTabs.Panel> {
  /**
   * Additional CSS classes merged with the tabs panel styles.
   */
  className?: string;
}

/**
 * A tabbed interface root for switching between related content panels.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI tabs root primitive and applies design-system spacing. Use it with
 * {@link TabsList}, {@link TabsTrigger}, and {@link TabsContent} to build accessible,
 * keyboard-navigable tab interfaces.
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="overview">
 *   <TabsList>
 *     <TabsTrigger value="overview">Overview</TabsTrigger>
 *     <TabsTrigger value="billing">Billing</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="overview">Overview content</TabsContent>
 *   <TabsContent value="billing">Billing content</TabsContent>
 * </Tabs>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/tabs Base UI Tabs docs}
 */
const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(({className, ...props}, ref) => (
  <BaseTabs.Root
    ref={ref}
    className={cn(styles.root, className)}
    {...props}
  />
));
Tabs.displayName = "Tabs";

/**
 * The list container that groups tab triggers and renders the active indicator.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Renders the Base UI tab list primitive and automatically includes a styled indicator
 * so the selected tab is visually tracked without extra consumer setup.
 *
 * @example
 * ```tsx
 * <TabsList>
 *   <TabsTrigger value="monthly">Monthly</TabsTrigger>
 *   <TabsTrigger value="yearly">Yearly</TabsTrigger>
 * </TabsList>
 * ```
 *
 * @see {@link TabsTrigger}
 * @see {@link https://base-ui.com/react/components/tabs Base UI Tabs docs}
 */
const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(({className, children, ...props}, ref) => (
  <BaseTabs.List
    ref={ref}
    className={cn(styles.list, className)}
    {...props}>
    {children}
    <BaseTabs.Indicator className={styles.indicator} />
  </BaseTabs.List>
));
TabsList.displayName = "TabsList";

/**
 * An interactive control that activates an associated tab panel.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI tab primitive, preserving roving focus and keyboard navigation
 * while applying the library's trigger typography and spacing.
 *
 * @example
 * ```tsx
 * <TabsTrigger value="activity">Activity</TabsTrigger>
 * ```
 *
 * @see {@link TabsContent}
 * @see {@link https://base-ui.com/react/components/tabs Base UI Tabs docs}
 */
const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(({className, ...props}, ref) => (
  <BaseTabs.Tab
    ref={ref}
    className={cn(styles.tab, className)}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

/**
 * The content panel associated with a tab trigger.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI panel primitive and applies the library's content spacing. The
 * panel is shown or hidden automatically based on the active tab value.
 *
 * @example
 * ```tsx
 * <TabsContent value="security">Security settings content</TabsContent>
 * ```
 *
 * @see {@link TabsTrigger}
 * @see {@link https://base-ui.com/react/components/tabs Base UI Tabs docs}
 */
const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(({className, ...props}, ref) => (
  <BaseTabs.Panel
    ref={ref}
    className={cn(styles.panel, className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export {Tabs, TabsContent, TabsList, TabsTrigger};
