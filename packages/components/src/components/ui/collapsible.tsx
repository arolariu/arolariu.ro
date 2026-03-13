"use client";

import {Collapsible as BaseCollapsible} from "@base-ui/react/collapsible";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./collapsible.module.css";

interface CollapsibleProps extends React.ComponentPropsWithRef<typeof BaseCollapsible.Root> {}

interface CollapsibleTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseCollapsible.Trigger>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Enables child element composition instead of rendering the default wrapper.
   * @default false
   * @deprecated Prefer Base UI's `render` prop.
   */
  asChild?: boolean;
}

interface CollapsibleContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseCollapsible.Panel>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

/**
 * Coordinates collapsible state and accessibility behavior.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/collapsible | Base UI Collapsible}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <Collapsible>Content</Collapsible>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/collapsible | Base UI Documentation}
 */
function Collapsible(props: Readonly<Collapsible.Props>): React.ReactElement {
  return <BaseCollapsible.Root {...props} />;
}

/**
 * Renders the collapsible trigger.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/collapsible | Base UI Collapsible}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <CollapsibleTrigger>Content</CollapsibleTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/collapsible | Base UI Documentation}
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
 * Renders the collapsible content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/collapsible | Base UI Collapsible}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <CollapsibleContent>Content</CollapsibleContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/collapsible | Base UI Documentation}
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

Collapsible.displayName = "Collapsible";
CollapsibleTrigger.displayName = "CollapsibleTrigger";
CollapsibleContent.displayName = "CollapsibleContent";

export {Collapsible, CollapsibleContent, CollapsibleTrigger};
