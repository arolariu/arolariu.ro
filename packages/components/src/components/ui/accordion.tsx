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

/**
 * Props for the single-item accordion root wrapper.
 */
interface AccordionSingleProps extends AccordionRootBaseProps {
  /** Controls whether the accordion only allows one item to be expanded at a time. @default "single" */
  type?: "single";
  /** Legacy compatibility flag accepted by the wrapper but not forwarded to Base UI. @default undefined */
  collapsible?: boolean;
  /** Additional CSS classes merged with the accordion root styles. @default undefined */
  className?: string;
  /** The initially expanded item value in uncontrolled single mode. @default undefined */
  defaultValue?: string;
  /** Called when the expanded item changes in single mode. @default undefined */
  onValueChange?: (value: string | undefined, eventDetails: unknown) => void;
  /** The controlled expanded item value in single mode. @default undefined */
  value?: string;
}

/**
 * Props for the multi-item accordion root wrapper.
 */
interface AccordionMultipleProps extends AccordionRootBaseProps {
  /** Controls whether the accordion allows multiple items to stay expanded. @default "multiple" */
  type: "multiple";
  /** Legacy compatibility flag accepted by the wrapper but not forwarded to Base UI. @default undefined */
  collapsible?: boolean;
  /** Additional CSS classes merged with the accordion root styles. @default undefined */
  className?: string;
  /** The initially expanded item values in uncontrolled multi mode. @default undefined */
  defaultValue?: string[];
  /** Called when the expanded item values change in multi mode. @default undefined */
  onValueChange?: (value: string[], eventDetails: unknown) => void;
  /** The controlled expanded item values in multi mode. @default undefined */
  value?: string[];
}

type AccordionSingleRootProps = Omit<AccordionSingleProps, "className" | "collapsible" | "render" | "type">;
type AccordionMultipleRootProps = Omit<AccordionMultipleProps, "className" | "collapsible" | "render" | "type">;

/**
 * Props for an accordion item wrapper.
 */
interface AccordionItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseAccordion.Item>, "className"> {
  /** Additional CSS classes merged with the accordion item styles. @default undefined */
  className?: string;
}

/**
 * Props for an accordion trigger wrapper.
 */
interface AccordionTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseAccordion.Trigger>, "className"> {
  /** Additional CSS classes merged with the accordion trigger styles. @default undefined */
  className?: string;
}

/**
 * Props for an accordion content wrapper.
 */
interface AccordionContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseAccordion.Panel>, "className"> {
  /** Additional CSS classes merged with the accordion content styles. @default undefined */
  className?: string;
}

/**
 * Groups disclosure items into a styled accordion container.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/accordion | Base UI Accordion}
 * - Supports the `render` prop for element composition
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
function Accordion(props: Readonly<Accordion.Props>): React.ReactElement {
  const {className, render, type = "single"} = props;
  const accordionRender = useRender({
    defaultTagName: "div",
    render: render as never,
    props: mergeProps({className: cn(className)}, {}),
  });

  if (type === "multiple") {
    const {defaultValue, onValueChange, value, ...otherProps} = omitAccordionWrapperProps(props) as AccordionMultipleRootProps;

    return (
      <BaseAccordion.Root
        multiple
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        value={value}
        {...otherProps}
        render={accordionRender}
      />
    );
  }

  const {defaultValue, onValueChange, value, ...otherProps} = omitAccordionWrapperProps(props) as AccordionSingleRootProps;

  return (
    <BaseAccordion.Root
      multiple={false}
      defaultValue={defaultValue ? [defaultValue] : undefined}
      onValueChange={(nextValue, eventDetails) => {
        onValueChange?.(nextValue[0], eventDetails);
      }}
      value={value ? [value] : undefined}
      {...otherProps}
      render={accordionRender}
    />
  );
}
Accordion.displayName = "Accordion";

function omitAccordionWrapperProps(props: Accordion.Props): AccordionSingleRootProps | AccordionMultipleRootProps {
  const rootProps: Partial<Accordion.Props> = {...props};

  Reflect.deleteProperty(rootProps, "className");
  Reflect.deleteProperty(rootProps, "collapsible");
  Reflect.deleteProperty(rootProps, "render");
  Reflect.deleteProperty(rootProps, "type");

  return rootProps as AccordionSingleRootProps | AccordionMultipleRootProps;
}

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
          ref={ref}
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
        ref={ref}
        {...otherProps}
        render={useRender({
          defaultTagName: "div",
          render: render as never,
          props: mergeProps({className: styles.panel}, {}),
        })}>
        <div className={cn(styles.panelInner, className)}>{children}</div>
      </BaseAccordion.Panel>
    );
  },
);
AccordionContent.displayName = "AccordionContent";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Accordion {
  export type Props = AccordionSingleProps | AccordionMultipleProps;
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
