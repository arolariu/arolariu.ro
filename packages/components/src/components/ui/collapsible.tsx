"use client";

import {Collapsible as BaseCollapsible} from "@base-ui/react/collapsible";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./collapsible.module.css";

interface CollapsibleProps extends React.ComponentPropsWithRef<typeof BaseCollapsible.Root> {}

interface CollapsibleTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseCollapsible.Trigger>, "className"> {
  className?: string;
  /** @deprecated Prefer Base UI's `render` prop. */
  asChild?: boolean;
}

interface CollapsibleContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseCollapsible.Panel>, "className"> {
  className?: string;
}

/**
 * Coordinates collapsible open state and accessibility behavior.
 */
function Collapsible(props: Readonly<Collapsible.Props>): React.ReactElement {
  return <BaseCollapsible.Root {...props} />;
}

/**
 * Renders the collapsible trigger using canonical render composition.
 */
function CollapsibleTrigger(props: Readonly<CollapsibleTrigger.Props>): React.ReactElement {
  const {asChild = false, children, className, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return (
    <BaseCollapsible.Trigger
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: renderProp as never,
        props: mergeProps({className: cn(styles.trigger, className)}, {}),
      })}>
      {renderProp ? undefined : children}
    </BaseCollapsible.Trigger>
  );
}

/**
 * Renders the collapsible panel with shared styling.
 */
function CollapsibleContent(props: Readonly<CollapsibleContent.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseCollapsible.Panel
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.panel, className)}, {}),
      })}>
      {children}
    </BaseCollapsible.Panel>
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Collapsible {
  export type Props = CollapsibleProps;
  export type State = BaseCollapsible.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace CollapsibleTrigger {
  export type Props = CollapsibleTriggerProps;
  export type State = BaseCollapsible.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace CollapsibleContent {
  export type Props = CollapsibleContentProps;
  export type State = BaseCollapsible.Panel.State;
}

export {Collapsible, CollapsibleContent, CollapsibleTrigger};
