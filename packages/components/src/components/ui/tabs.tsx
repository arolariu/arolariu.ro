"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Tabs as BaseTabs} from "@base-ui/react/tabs";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./tabs.module.css";

interface TabsProps extends Omit<React.ComponentPropsWithRef<typeof BaseTabs.Root>, "className"> {
  className?: string;
}

interface TabsListProps extends Omit<React.ComponentPropsWithRef<typeof BaseTabs.List>, "className"> {
  className?: string;
}

interface TabsTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseTabs.Tab>, "className"> {
  className?: string;
}

interface TabsContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseTabs.Panel>, "className"> {
  className?: string;
}

/**
 * Renders the tabs root using canonical render composition.
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

/**
 * Renders the tab list and default indicator.
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

/**
 * Renders an individual tab trigger.
 */
function TabsTrigger(props: Readonly<TabsTrigger.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseTabs.Tab
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps({className: cn(styles.tab, className)}, {}),
      })}>
      {children}
    </BaseTabs.Tab>
  );
}

/**
 * Renders a styled tab panel.
 */
function TabsContent(props: Readonly<TabsContent.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseTabs.Panel
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.panel, className)}, {}),
      })}>
      {children}
    </BaseTabs.Panel>
  );
}

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
