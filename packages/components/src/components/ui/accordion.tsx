"use client";

import {Accordion as BaseAccordion} from "@base-ui/react/accordion";
import {ChevronDown} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./accordion.module.css";

type AccordionRootBaseProps = Omit<
  React.ComponentPropsWithoutRef<typeof BaseAccordion.Root>,
  "defaultValue" | "multiple" | "onValueChange" | "value"
>;

/**
 * Represents the props for a single-expand accordion root.
 *
 * @remarks
 * This compatibility interface preserves the historical shared-library API while
 * adapting single-item state to Base UI's array-based accordion contract.
 *
 * @default type `"single"`
 * @default collapsible `undefined`
 */
interface AccordionSingleProps extends AccordionRootBaseProps {
  /**
   * Selects single-item expansion mode.
   *
   * @default "single"
   */
  type?: "single";
  /**
   * Retained for V1 compatibility and ignored by the Base UI wrapper implementation.
   *
   * @default undefined
   */
  collapsible?: boolean;
  /**
   * Accordion items rendered inside the root.
   */
  children?: React.ReactNode;
  /**
   * The initially expanded item value in uncontrolled mode.
   */
  defaultValue?: string;
  /**
   * Called when the expanded item changes.
   */
  onValueChange?: (value: string | undefined, eventDetails: unknown) => void;
  /**
   * The controlled value of the expanded item.
   */
  value?: string;
}

/**
 * Represents the props for a multi-expand accordion root.
 *
 * @remarks
 * This compatibility interface exposes the historical multiple-item API while mapping
 * directly to Base UI's native array-based value handling.
 *
 * @default type `"multiple"`
 * @default collapsible `undefined`
 */
interface AccordionMultipleProps extends AccordionRootBaseProps {
  /**
   * Selects multiple-item expansion mode.
   *
   * @default "multiple"
   */
  type: "multiple";
  /**
   * Retained for V1 compatibility and ignored by the Base UI wrapper implementation.
   *
   * @default undefined
   */
  collapsible?: boolean;
  /**
   * Accordion items rendered inside the root.
   */
  children?: React.ReactNode;
  /**
   * The initially expanded item values in uncontrolled mode.
   */
  defaultValue?: string[];
  /**
   * Called when the expanded item values change.
   */
  onValueChange?: (value: string[], eventDetails: unknown) => void;
  /**
   * The controlled values of the expanded items.
   */
  value?: string[];
}

/**
 * Represents the supported prop shapes for the Accordion root component.
 */
type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

/**
 * Represents the configurable props for the AccordionItem component.
 *
 * @remarks
 * Extends the Base UI item primitive and exposes a class override for the outer item shell.
 */
interface AccordionItemProps extends React.ComponentPropsWithoutRef<typeof BaseAccordion.Item> {
  /**
   * Additional CSS classes merged with the accordion item styles.
   */
  className?: string;
}

/**
 * Represents the configurable props for the AccordionTrigger component.
 *
 * @remarks
 * Extends the Base UI trigger primitive and exposes a class override plus trigger children.
 */
interface AccordionTriggerProps extends React.ComponentPropsWithoutRef<typeof BaseAccordion.Trigger> {
  /**
   * Additional CSS classes merged with the accordion trigger styles.
   */
  className?: string;
  /**
   * The visible label and optional inline content for the trigger.
   */
  children?: React.ReactNode;
}

/**
 * Represents the configurable props for the AccordionContent component.
 *
 * @remarks
 * Extends the Base UI panel primitive and documents the class override applied to the inner content wrapper.
 */
interface AccordionContentProps extends React.ComponentPropsWithoutRef<typeof BaseAccordion.Panel> {
  /**
   * Additional CSS classes merged with the inner accordion panel styles.
   */
  className?: string;
  /**
   * The content revealed when the associated accordion item is expanded.
   */
  children?: React.ReactNode;
}

/**
 * An accordion root for expanding and collapsing related sections of content.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * This wrapper preserves the shared library's historical `type="single" | "multiple"`
 * API while adapting values to the Base UI accordion primitive. Use it to create
 * accessible disclosure groups with keyboard support and smooth state coordination.
 *
 * @example
 * ```tsx
 * <Accordion type="single" defaultValue="item-1">
 *   <AccordionItem value="item-1">
 *     <AccordionTrigger>General settings</AccordionTrigger>
 *     <AccordionContent>Content</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/accordion Base UI Accordion docs}
 */
function Accordion({type = "single", collapsible: _collapsible, ...props}: Readonly<AccordionProps>): React.JSX.Element {
  if (type === "multiple") {
    const {defaultValue, onValueChange, value, ...restProps} = props as AccordionMultipleProps;

    return (
      <BaseAccordion.Root
        multiple
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        value={value}
        {...restProps}
      />
    );
  }

  const {defaultValue, onValueChange, value, ...restProps} = props as AccordionSingleProps;

  return (
    <BaseAccordion.Root
      multiple={false}
      defaultValue={defaultValue ? [defaultValue] : undefined}
      onValueChange={(nextValue, eventDetails) => {
        onValueChange?.(nextValue[0], eventDetails);
      }}
      value={value ? [value] : undefined}
      {...restProps}
    />
  );
}
Accordion.displayName = "Accordion";

/**
 * A single accordion item pairing a trigger with its collapsible content.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI accordion item primitive and applies the library's border and
 * spacing styles for each section in the accordion stack.
 *
 * @example
 * ```tsx
 * <AccordionItem value="faq-1">...</AccordionItem>
 * ```
 *
 * @see {@link AccordionTrigger}
 * @see {@link https://base-ui.com/react/components/accordion Base UI Accordion docs}
 */
const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(({className, ...props}, ref) => (
  <BaseAccordion.Item
    ref={ref}
    className={cn(styles.item, className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

/**
 * An interactive trigger that expands or collapses its accordion item.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI trigger primitive inside a header element and renders a trailing
 * chevron icon to communicate expansion state visually.
 *
 * @example
 * ```tsx
 * <AccordionTrigger>What payment methods are supported?</AccordionTrigger>
 * ```
 *
 * @see {@link AccordionContent}
 * @see {@link https://base-ui.com/react/components/accordion Base UI Accordion docs}
 */
const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(({className, children, ...props}, ref) => (
  <BaseAccordion.Header className={styles.header}>
    <BaseAccordion.Trigger
      ref={ref}
      className={cn(styles.trigger, className)}
      {...props}>
      <span>{children}</span>
      <ChevronDown className={styles.icon} />
    </BaseAccordion.Trigger>
  </BaseAccordion.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

/**
 * The collapsible content panel associated with an accordion trigger.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI panel primitive and nests an inner `<div>` so consumer-provided
 * class overrides can target the padded content area without disturbing animation styles.
 *
 * @example
 * ```tsx
 * <AccordionContent>
 *   We accept Visa, Mastercard, and American Express.
 * </AccordionContent>
 * ```
 *
 * @see {@link AccordionTrigger}
 * @see {@link https://base-ui.com/react/components/accordion Base UI Accordion docs}
 */
const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(({className, children, ...props}, ref) => (
  <BaseAccordion.Panel
    ref={ref}
    className={styles.panel}
    {...props}>
    <div className={cn(styles.panelInner, className)}>{children}</div>
  </BaseAccordion.Panel>
));
AccordionContent.displayName = "AccordionContent";

export {Accordion, AccordionContent, AccordionItem, AccordionTrigger};
