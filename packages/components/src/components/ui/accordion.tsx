"use client";

import {Accordion as BaseAccordion} from "@base-ui/react/accordion";
import {ChevronDown} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./accordion.module.css";

/**
 * Canonical array-valued accordion props, including single-panel mode.
 *
 * An empty array is no selection; `[""]` selects the item whose identifier is
 * the empty string. Callbacks always receive `string[]`.
 */
export interface AccordionProps extends Omit<BaseAccordion.Root.Props<string>, "loopFocus" | "orientation"> {
  /** Whether the last expanded panel can be collapsed. @default true */
  // eslint-disable-next-line sonarjs/no-redundant-optional -- explicit undefined preserves exactOptionalPropertyTypes caller compatibility
  collapsible?: boolean | undefined;
}

/**
 * Props for an accordion item wrapper.
 */
export interface AccordionItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseAccordion.Item>, "className" | "value"> {
  /** Unique string identifier; canonical arrays also support the empty string. */
  // eslint-disable-next-line sonarjs/no-redundant-optional -- explicit undefined preserves exactOptionalPropertyTypes caller compatibility
  value?: string | undefined;
  /** Additional CSS classes merged with the accordion item styles. @default undefined */
  // eslint-disable-next-line sonarjs/no-redundant-optional -- explicit undefined preserves exactOptionalPropertyTypes caller compatibility
  className?: string | undefined;
}

/**
 * Props for an accordion trigger wrapper.
 */
export interface AccordionTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseAccordion.Trigger>, "className"> {
  /** Additional CSS classes merged with the accordion trigger styles. @default undefined */
  // eslint-disable-next-line sonarjs/no-redundant-optional -- explicit undefined preserves exactOptionalPropertyTypes caller compatibility
  className?: string | undefined;
}

/**
 * Props for an accordion content wrapper.
 */
export interface AccordionContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseAccordion.Panel>, "className"> {
  /** Additional classes for the inner content slot, preserving outer panel animation styles. @default undefined */
  // eslint-disable-next-line sonarjs/no-redundant-optional -- explicit undefined preserves exactOptionalPropertyTypes caller compatibility
  className?: string | undefined;
}

/**
 * Groups disclosure items into a styled accordion container.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/accordion | Base UI Accordion}
 * - Supports the `render` prop for element composition
 * - Uses Base UI array values and the native `multiple` flag
 * - `collapsible={false}` cancels last-panel closing without replacing primitive state
 * - Callbacks receive `string[]` and the original `Accordion.ChangeEventDetails`
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Accordion>
 *   <AccordionItem value="item-1">
 *     <AccordionTrigger>Section</AccordionTrigger>
 *     <AccordionContent>Content</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/accordion | Base UI Documentation}
 */
const Accordion = (props: Readonly<Accordion.Props>): React.ReactElement => {
  const {ref, collapsible = true, onValueChange, ...otherProps} = props;

  return (
    <BaseAccordion.Root<string>
      data-slot='accordion'
      {...otherProps}
      ref={ref}
      onValueChange={(nextValue, eventDetails) => {
        if (!collapsible && nextValue.length === 0) {
          eventDetails.cancel();
          return;
        }
        onValueChange?.(nextValue, eventDetails);
      }}
    />
  );
};
Accordion.displayName = "Accordion";

/**
 * Wraps a single accordion item with shared border and spacing styles.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/accordion | Base UI Accordion}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AccordionItem value="item-1">
 *   <AccordionTrigger>Section</AccordionTrigger>
 *   <AccordionContent>Content</AccordionContent>
 * </AccordionItem>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/accordion | Base UI Documentation}
 */
const AccordionItem = (props: Readonly<AccordionItem.Props>): React.ReactElement => {
  const {ref, className, children, render, ...otherProps} = props;

  return (
    <BaseAccordion.Item
      data-slot='accordion-item'
      {...otherProps}
      ref={ref}
      className={cn(styles.item, className)}
      render={render}>
      {children}
    </BaseAccordion.Item>
  );
};
AccordionItem.displayName = "AccordionItem";

/**
 * Toggles an accordion item while rendering the chevron affordance.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/accordion | Base UI Accordion}
 * - Supports the `render` prop for element composition
 * - Includes a built-in chevron icon; use the `render` prop for full custom trigger rendering or wrap
 *   the component when you need a different icon treatment
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AccordionTrigger>Section</AccordionTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/accordion | Base UI Documentation}
 */
const AccordionTrigger = (props: Readonly<AccordionTrigger.Props>): React.ReactElement => {
  const {ref, className, children, render, ...otherProps} = props;

  return (
    <BaseAccordion.Header className={styles.header}>
      <BaseAccordion.Trigger
        data-slot='accordion-trigger'
        ref={ref}
        {...otherProps}
        className={cn(styles.trigger, className)}
        render={render}>
        <span>{children}</span>
        <ChevronDown
          aria-hidden
          className={styles.icon}
        />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
};
AccordionTrigger.displayName = "AccordionTrigger";

/**
 * Reveals accordion panel content with shared spacing and animation hooks.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/accordion | Base UI Accordion}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AccordionContent>Content</AccordionContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/accordion | Base UI Documentation}
 */
const AccordionContent = (props: Readonly<AccordionContent.Props>): React.ReactElement => {
  const {ref, className, children, render, ...otherProps} = props;

  return (
    <BaseAccordion.Panel
      data-slot='accordion-content'
      ref={ref}
      {...otherProps}
      className={styles.panel}
      render={render}>
      <div
        data-slot='accordion-content-inner'
        className={cn(styles.panelInner, className)}>
        {children}
      </div>
    </BaseAccordion.Panel>
  );
};
AccordionContent.displayName = "AccordionContent";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Accordion {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- preserve the mandated Accordion.Props public namespace contract
  export type Props = AccordionProps;
  export type State = BaseAccordion.Root.State<string>;
  export type ChangeEventDetails = BaseAccordion.Root.ChangeEventDetails;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AccordionItem {
  export type Props = AccordionItemProps;
  export type State = BaseAccordion.Item.State;
  export type ChangeEventDetails = BaseAccordion.Item.ChangeEventDetails;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AccordionTrigger {
  export type Props = AccordionTriggerProps;
  export type State = BaseAccordion.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AccordionContent {
  export type Props = AccordionContentProps;
  export type State = BaseAccordion.Panel.State;
}

export {Accordion, AccordionContent, AccordionItem, AccordionTrigger};
