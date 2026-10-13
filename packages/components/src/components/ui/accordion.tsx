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
 * the empty string. Without `type`, callbacks always receive `string[]`.
 */
export interface AccordionArrayProps extends BaseAccordion.Root.Props<string> {
  /** Omit the legacy discriminator when using the native array contract. */
  type?: undefined;
  /** Whether the last expanded panel can be collapsed. @default true */
  collapsible?: boolean | undefined;
}

/**
 * Explicit legacy single-string adapter.
 *
 * `value=""` is controlled with no selection and `defaultValue=""` starts
 * empty. Use canonical arrays to select an empty-string item. Callbacks
 * receive a string when opening and `undefined` when clearing selection.
 */
export interface AccordionSingleProps extends Omit<AccordionArrayProps, "type" | "multiple" | "defaultValue" | "onValueChange" | "value"> {
  /** Explicitly opts into the legacy single-string contract. */
  type: "single";
  /** Use the legacy discriminator, not the native multiple flag, in this adapter. */
  multiple?: never;
  /** The initially expanded item identifier, or an empty string for no selection. */
  defaultValue?: string | undefined;
  /** Called with the legacy selection and the original cancellable Base UI details. */
  onValueChange?: ((value: string | undefined, eventDetails: BaseAccordion.Root.ChangeEventDetails) => void) | undefined;
  /** The controlled item identifier, or an empty string for controlled no selection. */
  value?: string | undefined;
}

/**
 * Legacy multiple-mode alias for the canonical array contract.
 */
export interface AccordionMultipleProps extends Omit<AccordionArrayProps, "type" | "multiple"> {
  /** Equivalent to using the native `multiple` flag without a legacy type. */
  type: "multiple";
  /** Use the legacy discriminator, not the native multiple flag, in this adapter. */
  multiple?: never;
}

/** Canonical array props or an explicitly discriminated legacy adapter. */
export type AccordionProps = AccordionArrayProps | AccordionSingleProps | AccordionMultipleProps;

/** Keeps JSX callback inference specific to the selected value contract. */
interface AccordionComponent {
  (props: Readonly<AccordionSingleProps>): React.ReactNode;
  (props: Readonly<AccordionMultipleProps>): React.ReactNode;
  (props: Readonly<AccordionProps>): React.ReactNode;
  (props: Readonly<AccordionArrayProps>): React.ReactNode;
  displayName?: string | undefined;
}

function isLegacySingleAccordion(props: Readonly<AccordionProps>): props is Readonly<AccordionSingleProps> {
  return props.type === "single";
}

/**
 * Props for an accordion item wrapper.
 */
export interface AccordionItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseAccordion.Item>, "className" | "value"> {
  /** Unique string identifier; canonical arrays also support the empty string. */
  value?: string | undefined;
  /** Additional CSS classes merged with the accordion item styles. @default undefined */
  className?: string | undefined;
}

/**
 * Props for an accordion trigger wrapper.
 */
export interface AccordionTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseAccordion.Trigger>, "className"> {
  /** Additional CSS classes merged with the accordion trigger styles. @default undefined */
  className?: string | undefined;
}

/**
 * Props for an accordion content wrapper.
 */
export interface AccordionContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseAccordion.Panel>, "className"> {
  /** Additional classes for the inner content slot, preserving outer panel animation styles. @default undefined */
  className?: string | undefined;
}

/**
 * Groups disclosure items into a styled accordion container.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/accordion | Base UI Accordion}
 * - Supports the `render` prop for element composition
 * - Uses Base UI array values by default; `type="single"` explicitly adapts legacy strings
 * - `collapsible={false}` cancels last-panel closing without replacing primitive state
 * - Callback values are `string[]` canonically, or `string | undefined` for legacy single mode;
 *   both contracts receive the original `Accordion.ChangeEventDetails`
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
const Accordion: AccordionComponent = React.forwardRef<HTMLDivElement, Accordion.Props>(
  (props: Readonly<Accordion.Props>, ref): React.ReactElement => {
    if (isLegacySingleAccordion(props)) {
      const {type, collapsible = true, defaultValue, onValueChange, value, ...otherProps} = props;

      return (
        <BaseAccordion.Root<string>
          data-slot='accordion'
          {...otherProps}
          ref={ref}
          multiple={false}
          defaultValue={defaultValue !== undefined ? (defaultValue === "" ? [] : [defaultValue]) : undefined}
          value={value !== undefined ? (value === "" ? [] : [value]) : undefined}
          onValueChange={(nextValue, eventDetails) => {
            if (!collapsible && nextValue.length === 0) {
              eventDetails.cancel();
              return;
            }
            onValueChange?.(nextValue[0], eventDetails);
          }}
        />
      );
    }

    const {type, multiple, collapsible = true, onValueChange, ...otherProps} = props;

    return (
      <BaseAccordion.Root<string>
        data-slot='accordion'
        {...otherProps}
        ref={ref}
        multiple={type === "multiple" || multiple}
        onValueChange={(nextValue, eventDetails) => {
          if (!collapsible && nextValue.length === 0) {
            eventDetails.cancel();
            return;
          }
          onValueChange?.(nextValue, eventDetails);
        }}
      />
    );
  },
);
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
const AccordionItem = React.forwardRef<React.ComponentRef<typeof BaseAccordion.Item>, AccordionItem.Props>(
  (props: Readonly<AccordionItem.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

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
  },
);
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
const AccordionTrigger = React.forwardRef<React.ComponentRef<typeof BaseAccordion.Trigger>, AccordionTrigger.Props>(
  (props: Readonly<AccordionTrigger.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

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
  },
);
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
const AccordionContent = React.forwardRef<React.ComponentRef<typeof BaseAccordion.Panel>, AccordionContent.Props>(
  (props: Readonly<AccordionContent.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

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
  },
);
AccordionContent.displayName = "AccordionContent";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Accordion {
  export type Props = AccordionProps;
  export type ArrayProps = AccordionArrayProps;
  export type SingleProps = AccordionSingleProps;
  export type MultipleProps = AccordionMultipleProps;
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
