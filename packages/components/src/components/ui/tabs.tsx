"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Tabs as BaseTabs} from "@base-ui/react/tabs";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./tabs.module.css";

interface TabsProps extends Omit<React.ComponentPropsWithRef<typeof BaseTabs.Root>, "className"> {
  /** Additional CSS classes merged with the tabs root styles. @default undefined */
  className?: string;
}

interface TabsListProps extends Omit<React.ComponentPropsWithRef<typeof BaseTabs.List>, "className"> {
  /** Additional CSS classes merged with the tabs list styles. @default undefined */
  className?: string;
}

interface TabsTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseTabs.Tab>, "className"> {
  /** Additional CSS classes merged with the individual tab trigger styles. @default undefined */
  className?: string;
}

interface TabsContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseTabs.Panel>, "className"> {
  /** Additional CSS classes merged with the tab panel styles. @default undefined */
  className?: string;
}

/**
 * Coordinates a tabbed interface for switching between related panels.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/tabs | Base UI Tabs}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Tabs defaultValue="overview">
 *   <TabsList>
 *     <TabsTrigger value="overview">Overview</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="overview">Content</TabsContent>
 * </Tabs>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/tabs | Base UI Documentation}
 */
function Tabs(props: Readonly<Tabs.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseTabs.Root
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.root, className)}, {}),
      })}>
      {children}
    </BaseTabs.Root>
  );
}
Tabs.displayName = "Tabs";

/**
 * Renders the tab list along with the shared active indicator.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/tabs | Base UI Tabs}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <TabsList>
 *   <TabsTrigger value="overview">Overview</TabsTrigger>
 * </TabsList>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/tabs | Base UI Documentation}
 */
function TabsList(props: Readonly<TabsList.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseTabs.List
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.list, className)}, {}),
      })}>
      {children}
      <BaseTabs.Indicator className={styles.indicator} />
    </BaseTabs.List>
  );
}
TabsList.displayName = "TabsList";

/**
 * Activates a specific tab panel within the surrounding tabs root.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/tabs | Base UI Tabs}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <TabsTrigger value="overview">Overview</TabsTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/tabs | Base UI Documentation}
 */
const TabsTrigger = React.forwardRef<React.ComponentRef<typeof BaseTabs.Tab>, TabsTrigger.Props>(
  (props: Readonly<TabsTrigger.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseTabs.Tab
        ref={ref}
        {...otherProps}
        render={useRender({
          defaultTagName: "button",
          render: render as never,
          props: mergeProps({className: cn(styles.tab, className)}, {}),
        })}>
        {children}
      </BaseTabs.Tab>
    );
  },
);
TabsTrigger.displayName = "TabsTrigger";

/**
 * Renders the content panel associated with the active tab.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/tabs | Base UI Tabs}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <TabsContent value="overview">Content</TabsContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/tabs | Base UI Documentation}
 */
const TabsContent = React.forwardRef<React.ComponentRef<typeof BaseTabs.Panel>, TabsContent.Props>(
  (props: Readonly<TabsContent.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseTabs.Panel
        ref={ref}
        {...otherProps}
        render={useRender({
          defaultTagName: "div",
          render: render as never,
          props: mergeProps({className: cn(styles.panel, className)}, {}),
        })}>
        {children}
      </BaseTabs.Panel>
    );
  },
);
TabsContent.displayName = "TabsContent";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Tabs {
  export type Props = TabsProps;
  export type State = BaseTabs.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TabsList {
  export type Props = TabsListProps;
  export type State = BaseTabs.List.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TabsTrigger {
  export type Props = TabsTriggerProps;
  export type State = BaseTabs.Tab.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TabsContent {
  export type Props = TabsContentProps;
  export type State = BaseTabs.Panel.State;
}

export {Tabs, TabsContent, TabsList, TabsTrigger};
