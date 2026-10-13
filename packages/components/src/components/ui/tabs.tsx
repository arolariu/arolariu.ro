"use client";

import {Tabs as BaseTabs} from "@base-ui/react/tabs";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./tabs.module.css";

/** Readonly Base UI root props, including orientation and controlled selection. */
export type TabsProps = Readonly<React.ComponentPropsWithRef<typeof BaseTabs.Root>>;
/** Readonly Base UI tab props, including native and composed button behavior. */
export type TabsTriggerProps = Readonly<React.ComponentPropsWithRef<typeof BaseTabs.Tab>>;
/** Readonly Base UI panel props, including hidden-panel mounting behavior. */
export type TabsContentProps = Readonly<React.ComponentPropsWithRef<typeof BaseTabs.Panel>>;

/** Primitive-owned root state, including orientation and activation direction. */
export type TabsState = Readonly<BaseTabs.Root.State>;
/** Primitive-owned tab state, including active and disabled status. */
export type TabsTriggerState = Readonly<BaseTabs.Tab.State>;
/** Primitive-owned panel state, including visibility and transition status. */
export type TabsContentState = Readonly<BaseTabs.Panel.State>;
/** Supported tab list presentations. */
export type TabsListVariant = "default" | "line";

/** Primitive-owned list state augmented with its visual presentation. */
export interface TabsListState extends Readonly<BaseTabs.List.State> {
  readonly variant: TabsListVariant;
}

/** Options for generating tab list classes without rendering a component. */
export interface TabsListVariantOptions {
  /** Visual presentation. @default "default" */
  readonly variant?: TabsListVariant;
  /** Additional classes merged with the CSS Module classes. */
  readonly className?: string;
}

type PrimitiveListRenderCallback = Exclude<BaseTabs.List.Props["render"], React.ReactElement | undefined>;

/** Readonly Base UI list props with state-aware default and line presentations. */
export type TabsListProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseTabs.List>, "className" | "render"> & {
    /** Visual presentation. The line variant retains the animated underline. @default "default" */
    variant?: TabsListVariant;
    /** Additional classes, optionally derived from the primitive and variant state. */
    className?: string | ((state: TabsListState) => string | undefined);
    /** Element or callback composed by Base UI with current list and variant state. */
    render?: React.ReactElement | ((props: Parameters<PrimitiveListRenderCallback>[0], state: TabsListState) => React.ReactElement);
  }
>;

const listVariantStyles = {
  default: styles.default,
  line: styles.line,
} satisfies Record<TabsListVariant, string | undefined>;

/** Returns the CSS Module classes for a tab list presentation. */
function tabsListVariants({variant = "default", className}: Readonly<TabsListVariantOptions> = {}): string {
  return cn(styles.list, listVariantStyles[variant], className);
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
const Tabs = React.forwardRef<React.ComponentRef<typeof BaseTabs.Root>, Tabs.Props>(
  (props: Readonly<Tabs.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseTabs.Root
        {...otherProps}
        ref={ref}
        data-slot='tabs'
        className={typeof className === "function" ? (state) => cn(styles.root, className(state)) : cn(styles.root, className)}
        render={render}>
        {children}
      </BaseTabs.Root>
    );
  },
);
Tabs.displayName = "Tabs";

/**
 * Renders the tab list along with the shared active indicator.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/tabs | Base UI Tabs}
 * - Supports the `render` prop for element composition
 * - `default` uses a muted list and a sliding surface; `line` preserves the animated underline
 * - The shared indicator follows Base UI measurements in either orientation
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
const TabsList = React.forwardRef<React.ComponentRef<typeof BaseTabs.List>, TabsList.Props>(
  (props: Readonly<TabsList.Props>, ref): React.ReactElement => {
    const {className, children, render, variant = "default", ...otherProps} = props;

    return (
      <BaseTabs.List
        {...otherProps}
        ref={ref}
        data-slot='tabs-list'
        data-variant={variant}
        className={
          typeof className === "function"
            ? (state) => tabsListVariants({variant, className: className({...state, variant})})
            : tabsListVariants({variant, className})
        }
        render={typeof render === "function" ? (elementProps, state) => render(elementProps, {...state, variant}) : render}>
        {children}
        <BaseTabs.Indicator
          data-slot='tabs-indicator'
          className={styles.indicator}
        />
      </BaseTabs.List>
    );
  },
);
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
        data-slot='tabs-trigger'
        className={typeof className === "function" ? (state) => cn(styles.tab, className(state)) : cn(styles.tab, className)}
        render={render}>
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
        data-slot='tabs-content'
        className={typeof className === "function" ? (state) => cn(styles.panel, className(state)) : cn(styles.panel, className)}
        render={render}>
        {children}
      </BaseTabs.Panel>
    );
  },
);
TabsContent.displayName = "TabsContent";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Tabs {
  export type Props = TabsProps;
  export type State = TabsState;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TabsList {
  export type Props = TabsListProps;
  export type State = TabsListState;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TabsTrigger {
  export type Props = TabsTriggerProps;
  export type State = TabsTriggerState;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TabsContent {
  export type Props = TabsContentProps;
  export type State = TabsContentState;
}

export {Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants};
