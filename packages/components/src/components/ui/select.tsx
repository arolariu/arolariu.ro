"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Select as BaseSelect} from "@base-ui/react/select";
import {useRender} from "@base-ui/react/use-render";
import {Check, ChevronDown, ChevronUp} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./select.module.css";

interface SelectProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.Root>, "onValueChange"> {
  onValueChange?: (value: string) => void;
}

interface SelectTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.Trigger>, "className"> {
  className?: string;
}

interface SelectScrollUpButtonProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.ScrollUpArrow>, "className"> {
  className?: string;
}

interface SelectScrollDownButtonProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.ScrollDownArrow>, "className"> {
  className?: string;
}

interface SelectContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.Positioner>, "className"> {
  className?: string;
  sideOffset?: number;
}

interface SelectLabelProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.GroupLabel>, "className"> {
  className?: string;
}

interface SelectItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.Item>, "className"> {
  className?: string;
}

interface SelectSeparatorProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.Separator>, "className"> {
  className?: string;
}

function Select(props: Readonly<Select.Props>): React.ReactElement {
  const {onValueChange, ...otherProps} = props;

  const handleChange = React.useCallback(
    (value: unknown) => {
      if (onValueChange && typeof value === "string") {
        onValueChange(value);
      }
    },
    [onValueChange],
  );

  return (
    <BaseSelect.Root
      onValueChange={handleChange as React.ComponentPropsWithRef<typeof BaseSelect.Root>["onValueChange"]}
      {...otherProps}
    />
  );
}

const SelectGroup = BaseSelect.Group;
const SelectValue = BaseSelect.Value;

function SelectTrigger(props: Readonly<SelectTrigger.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseSelect.Trigger
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps({className: cn(styles.trigger, className)}, {}),
      })}>
      {children}
      <BaseSelect.Icon className={styles.icon}>
        <ChevronDown className={styles.iconSvg} />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

function SelectScrollUpButton(props: Readonly<SelectScrollUpButton.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseSelect.ScrollUpArrow
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.scrollButton, className)}, {}),
      })}>
      {children ?? <ChevronUp className={styles.scrollIcon} />}
    </BaseSelect.ScrollUpArrow>
  );
}

function SelectScrollDownButton(props: Readonly<SelectScrollDownButton.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseSelect.ScrollDownArrow
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.scrollButton, className)}, {}),
      })}>
      {children ?? <ChevronDown className={styles.scrollIcon} />}
    </BaseSelect.ScrollDownArrow>
  );
}

function SelectContent(props: Readonly<SelectContent.Props>): React.ReactElement {
  const {className, children, render, sideOffset = 4, ...otherProps} = props;

  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner
        sideOffset={sideOffset}
        {...otherProps}
        render={useRender({
          defaultTagName: "div",
          props: mergeProps({className: styles.positioner}, {}),
        })}>
        <BaseSelect.Popup
          render={useRender({
            defaultTagName: "div",
            render: render as never,
            props: mergeProps({className: cn(styles.popup, className)}, {}),
          })}>
          <SelectScrollUpButton />
          <BaseSelect.List className={styles.list}>{children}</BaseSelect.List>
          <SelectScrollDownButton />
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

function SelectLabel(props: Readonly<SelectLabel.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseSelect.GroupLabel
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.label, className)}, {}),
      })}>
      {children}
    </BaseSelect.GroupLabel>
  );
}

function SelectItem(props: Readonly<SelectItem.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseSelect.Item
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.item, className)}, {}),
      })}>
      <span className={styles.itemIndicatorSlot}>
        <BaseSelect.ItemIndicator>
          <Check className={styles.itemIndicatorIcon} />
        </BaseSelect.ItemIndicator>
      </span>
      <BaseSelect.ItemText className={styles.itemText}>{children}</BaseSelect.ItemText>
    </BaseSelect.Item>
  );
}

function SelectSeparator(props: Readonly<SelectSeparator.Props>): React.ReactElement {
  const {className, render, ...otherProps} = props;

  return (
    <BaseSelect.Separator
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.separator, className)}, {}),
      })}
    />
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Select {
  export type Props = SelectProps;
  export type State = BaseSelect.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectTrigger {
  export type Props = SelectTriggerProps;
  export type State = BaseSelect.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectScrollUpButton {
  export type Props = SelectScrollUpButtonProps;
  export type State = BaseSelect.ScrollUpArrow.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectScrollDownButton {
  export type Props = SelectScrollDownButtonProps;
  export type State = BaseSelect.ScrollDownArrow.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectContent {
  export type Props = SelectContentProps;
  export type State = BaseSelect.Popup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectLabel {
  export type Props = SelectLabelProps;
  export type State = BaseSelect.GroupLabel.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectItem {
  export type Props = SelectItemProps;
  export type State = BaseSelect.Item.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectSeparator {
  export type Props = SelectSeparatorProps;
  export type State = BaseSelect.Separator.State;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
