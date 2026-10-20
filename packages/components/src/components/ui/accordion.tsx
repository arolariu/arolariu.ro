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
  /**
   * Props for the heading that wraps the trigger: Base UI `Accordion.Header`, an `<h3>` by default.
   *
   * Set `render` to a childless heading element, for example `render={<h2 />}`, so the level follows the surrounding
   * document outline. `className` merges with the header styles; `ref` and every other prop apply after the wrapper
   * defaults, including `data-slot="accordion-header"`.
   * @default undefined
   */
  // eslint-disable-next-line sonarjs/no-redundant-optional -- explicit undefined preserves exactOptionalPropertyTypes caller compatibility
  headerProps?: AccordionHeaderProps | undefined;
}

type AccordionDataAttributes = {readonly [key: `data-${string}`]: string | number | boolean | undefined};

/**
 * Props for the heading that wraps an accordion trigger: Base UI `Accordion.Header` props without `children`.
 *
 * @remarks
 * `className` accepts a string or a header-state callback and merges with the header styles. `render` replaces the
 * default `<h3>` with another heading level; an element must be childless because the trigger renders as its child,
 * and a callback must spread the received props (including `children`) onto the heading it returns.
 */
export type AccordionHeaderProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseAccordion.Header>, "children"> & AccordionDataAttributes
>;

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
 * - Item headings render as `<h3>` by default; set `AccordionTrigger`'s `headerProps.render` to fit the page's heading
 *   outline
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
      ref={ref}
      onValueChange={(nextValue, eventDetails) => {
        if (!collapsible && nextValue.length === 0) {
          eventDetails.cancel();
          return;
        }
        onValueChange?.(nextValue, eventDetails);
      }}
      {...otherProps}
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
      ref={ref}
      className={cn(styles.item, className)}
      render={render}
      {...otherProps}>
      {children}
    </BaseAccordion.Item>
  );
};
AccordionItem.displayName = "AccordionItem";

/**
 * Toggles an accordion item while rendering the chevron affordance.
 *
 * @remarks
 * - Renders a `<button>` element inside Base UI's `Accordion.Header`, an `<h3>` by default
 * - Built on {@link https://base-ui.com/react/components/accordion | Base UI Accordion}
 * - Supports the `render` prop for trigger composition; `headerProps` customizes the heading (merged `className`,
 *   heading `ref`, `render` and other props applied after `data-slot="accordion-header"`)
 * - Applications own the heading level: accordion headings must continue the surrounding outline without skipping or
 *   inverting levels (WCAG 1.3.1), so pass a childless heading such as `headerProps={{render: <h2 />}}` when `<h3>`
 *   does not fit
 * - Includes a built-in chevron icon; use the `render` prop for full custom trigger rendering or wrap
 *   the component when you need a different icon treatment
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AccordionTrigger>Section</AccordionTrigger>
 * ```
 *
 * @example Heading level under a page `h1`
 * ```tsx
 * <h1>Help center</h1>
 * <Accordion>
 *   <AccordionItem value="shipping">
 *     <AccordionTrigger headerProps={{render: <h2 />}}>Shipping</AccordionTrigger>
 *     <AccordionContent>Orders ship in three to five business days.</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/accordion | Base UI Documentation}
 */
const AccordionTrigger = (props: Readonly<AccordionTrigger.Props>): React.ReactElement => {
  const {ref, className, children, render, headerProps, ...otherProps} = props;
  const {className: headerClassName, ...headerNativeProps} = headerProps ?? {};

  return (
    <BaseAccordion.Header
      data-slot='accordion-header'
      className={(state) => cn(styles.header, typeof headerClassName === "function" ? headerClassName(state) : headerClassName)}
      {...headerNativeProps}>
      <BaseAccordion.Trigger
        data-slot='accordion-trigger'
        ref={ref}
        className={cn(styles.trigger, className)}
        render={render}
        {...otherProps}>
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
      className={styles.panel}
      render={render}
      {...otherProps}>
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
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- preserve the named and AccordionTrigger.HeaderProps namespace typing
  export type HeaderProps = AccordionHeaderProps;
  export type HeaderState = BaseAccordion.Header.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AccordionContent {
  export type Props = AccordionContentProps;
  export type State = BaseAccordion.Panel.State;
}

export {Accordion, AccordionContent, AccordionItem, AccordionTrigger};
