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

interface AccordionSingleProps extends AccordionRootBaseProps {
  /** V1 compatibility mode for a single expanded item. */
  type?: "single";
  /** Maintained for V1 compatibility. */
  collapsible?: boolean;
  children?: React.ReactNode;
  defaultValue?: string;
  onValueChange?: (value: string | undefined, eventDetails: unknown) => void;
  value?: string;
}

interface AccordionMultipleProps extends AccordionRootBaseProps {
  /** V1 compatibility mode for multiple expanded items. */
  type: "multiple";
  /** Maintained for V1 compatibility. */
  collapsible?: boolean;
  children?: React.ReactNode;
  defaultValue?: string[];
  onValueChange?: (value: string[], eventDetails: unknown) => void;
  value?: string[];
}

type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

/**
 * Compatibility wrapper for Accordion.Root.
 * Maps the legacy `type="single"` API to Base UI's array-based value contract.
 */
function Accordion({type = "single", collapsible: _collapsible, ...props}: AccordionProps): React.JSX.Element {
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

const AccordionItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseAccordion.Item>>(
  ({className, ...props}, ref) => (
    <BaseAccordion.Item
      ref={ref}
      className={cn(styles.item, className)}
      {...props}
    />
  ),
);
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseAccordion.Trigger>>(
  ({className, children, ...props}, ref) => (
    <BaseAccordion.Header className={styles.header}>
      <BaseAccordion.Trigger
        ref={ref}
        className={cn(styles.trigger, className)}
        {...props}>
        <span>{children}</span>
        <ChevronDown className={styles.icon} />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  ),
);
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseAccordion.Panel>>(
  ({className, children, ...props}, ref) => (
    <BaseAccordion.Panel
      ref={ref}
      className={styles.panel}
      {...props}>
      <div className={cn(styles.panelInner, className)}>{children}</div>
    </BaseAccordion.Panel>
  ),
);
AccordionContent.displayName = "AccordionContent";

export {Accordion, AccordionContent, AccordionItem, AccordionTrigger};
