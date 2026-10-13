"use client";

import {Collapsible as BaseCollapsible} from "@base-ui/react/collapsible";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./collapsible.module.css";

/** Native collapsible state, composition, and cancellable change callbacks. */
export interface CollapsibleProps extends React.ComponentPropsWithRef<typeof BaseCollapsible.Root> {}

/** Styled trigger props with a retained child-slot compatibility adapter. */
export interface CollapsibleTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseCollapsible.Trigger>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  // eslint-disable-next-line sonarjs/no-redundant-optional -- explicit undefined preserves exactOptionalPropertyTypes caller compatibility
  className?: string | undefined;
  /**
   * Enables child element composition instead of rendering the default wrapper.
   * @default false
   * @deprecated Prefer Base UI's `render` prop.
   */
  // eslint-disable-next-line sonarjs/no-redundant-optional -- explicit undefined preserves exactOptionalPropertyTypes caller compatibility
  asChild?: boolean | undefined;
}

/** Native panel mounting, transition state, and composition props. */
export interface CollapsibleContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseCollapsible.Panel>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  // eslint-disable-next-line sonarjs/no-redundant-optional -- explicit undefined preserves exactOptionalPropertyTypes caller compatibility
  className?: string | undefined;
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
const Collapsible = React.forwardRef<React.ComponentRef<typeof BaseCollapsible.Root>, Collapsible.Props>(
  (props: Readonly<Collapsible.Props>, ref): React.ReactElement => (
    <BaseCollapsible.Root
      data-slot='collapsible'
      {...props}
      ref={ref}
    />
  ),
);

/**
 * Renders the collapsible trigger.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/collapsible | Base UI Collapsible}
 * - Supports the `render` prop for element composition
 * - Render callbacks receive live primitive open, disabled, and transition state
 * - Separate children remain trigger content; `asChild` uses the child's content instead
 *
 * @example
 * ```tsx
 * <CollapsibleTrigger>Content</CollapsibleTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/collapsible | Base UI Documentation}
 */
const CollapsibleTrigger = React.forwardRef<React.ComponentRef<typeof BaseCollapsible.Trigger>, CollapsibleTrigger.Props>(
  (props: Readonly<CollapsibleTrigger.Props>, ref): React.ReactElement => {
    // eslint-disable-next-line sonarjs/deprecation -- backward-compatible asChild API
    const {asChild = false, children, className, render, ...otherProps} = props;
    const child = asChild && React.isValidElement<{children?: React.ReactNode}>(children) ? children : undefined;
    const renderProp = child ?? render;

    return (
      <BaseCollapsible.Trigger
        data-slot='collapsible-trigger'
        ref={ref}
        {...otherProps}
        className={cn(styles.trigger, className)}
        render={renderProp}>
        {child ? child.props.children : children}
      </BaseCollapsible.Trigger>
    );
  },
);

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
const CollapsibleContent = React.forwardRef<React.ComponentRef<typeof BaseCollapsible.Panel>, CollapsibleContent.Props>(
  (props: Readonly<CollapsibleContent.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseCollapsible.Panel
        data-slot='collapsible-content'
        ref={ref}
        {...otherProps}
        className={cn(styles.panel, className)}
        render={render}>
        {children}
      </BaseCollapsible.Panel>
    );
  },
);

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Collapsible {
  export type Props = CollapsibleProps;
  export type State = BaseCollapsible.Root.State;
  export type ChangeEventDetails = BaseCollapsible.Root.ChangeEventDetails;
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
