"use client";

import {Tabs as BaseTabs} from "@base-ui/react/tabs";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./tabs.module.css";

const Tabs = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseTabs.Root>>(({className, ...props}, ref) => (
  <BaseTabs.Root
    ref={ref}
    className={cn(styles.root, className)}
    {...props}
  />
));
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseTabs.List>>(
  ({className, children, ...props}, ref) => (
    <BaseTabs.List
      ref={ref}
      className={cn(styles.list, className)}
      {...props}>
      {children}
      <BaseTabs.Indicator className={styles.indicator} />
    </BaseTabs.List>
  ),
);
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseTabs.Tab>>(
  ({className, ...props}, ref) => (
    <BaseTabs.Tab
      ref={ref}
      className={cn(styles.tab, className)}
      {...props}
    />
  ),
);
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseTabs.Panel>>(
  ({className, ...props}, ref) => (
    <BaseTabs.Panel
      ref={ref}
      className={cn(styles.panel, className)}
      {...props}
    />
  ),
);
TabsContent.displayName = "TabsContent";

export {Tabs, TabsContent, TabsList, TabsTrigger};
