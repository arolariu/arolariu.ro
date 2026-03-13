"use client";

import {Accordion as BaseAccordion} from "@base-ui/react/accordion";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import {ChevronDown} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./accordion.module.css";

type AccordionRootBaseProps = Omit<
  React.ComponentPropsWithRef<typeof BaseAccordion.Root>,
  "defaultValue" | "multiple" | "onValueChange" | "value" | "className"
>;

interface AccordionSingleProps extends AccordionRootBaseProps {
  type?: "single";
  collapsible?: boolean;
  className?: string;
  defaultValue?: string;
  onValueChange?: (value: string | undefined, eventDetails: unknown) => void;
  value?: string;
}

interface AccordionMultipleProps extends AccordionRootBaseProps {
  type: "multiple";
  collapsible?: boolean;
  className?: string;
  defaultValue?: string[];
  onValueChange?: (value: string[], eventDetails: unknown) => void;
  value?: string[];
}

type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

interface AccordionItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseAccordion.Item>, "className"> {
  className?: string;
}

interface AccordionTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseAccordion.Trigger>, "className"> {
  className?: string;
}

interface AccordionContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseAccordion.Panel>, "className"> {
  className?: string;
}

function Accordion(props: Readonly<Accordion.Props>): React.ReactElement {
  const {className, collapsible: _collapsible, type = "single"} = props;

  if (type === "multiple") {
    const {defaultValue, onValueChange, render, value, ...otherProps} = props as AccordionMultipleProps;

    return (
      <BaseAccordion.Root
        multiple
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        value={value}
        {...otherProps}
        render={useRender({
          defaultTagName: "div",
          render: render as never,
          props: mergeProps({className: cn(className)}, {}),
        })}
      />
    );
  }

  const {defaultValue, onValueChange, render, value, ...otherProps} = props as AccordionSingleProps;

  return (
    <BaseAccordion.Root
      multiple={false}
      defaultValue={defaultValue ? [defaultValue] : undefined}
      onValueChange={(nextValue, eventDetails) => {
        onValueChange?.(nextValue[0], eventDetails);
      }}
      value={value ? [value] : undefined}
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(className)}, {}),
      })}
    />
  );
}

function AccordionItem(props: Readonly<AccordionItem.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseAccordion.Item
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.item, className)}, {}),
      })}>
      {children}
    </BaseAccordion.Item>
  );
}

function AccordionTrigger(props: Readonly<AccordionTrigger.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseAccordion.Header className={styles.header}>
      <BaseAccordion.Trigger
        {...otherProps}
        render={useRender({
          defaultTagName: "button",
          render: render as never,
          props: mergeProps({className: cn(styles.trigger, className)}, {}),
        })}>
        <span>{children}</span>
        <ChevronDown className={styles.icon} />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
}

function AccordionContent(props: Readonly<AccordionContent.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseAccordion.Panel
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: styles.panel}, {}),
      })}>
      <div className={cn(styles.content, className)}>{children}</div>
    </BaseAccordion.Panel>
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Accordion {
  export type Props = AccordionProps;
  export type State = BaseAccordion.Root.State<string>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AccordionItem {
  export type Props = AccordionItemProps;
  export type State = BaseAccordion.Item.State;
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
