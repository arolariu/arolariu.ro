"use client";

import {Menu as BaseMenu} from "@base-ui/react/menu";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import {Check, ChevronRight, Circle} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./dropdown-menu.module.css";

interface DropdownMenuProps extends React.ComponentPropsWithRef<typeof BaseMenu.Root> {}

interface DropdownMenuTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Trigger>, "className"> {
  className?: string;
  /** @deprecated Prefer Base UI's `render` prop. */
  asChild?: boolean;
}

interface DropdownMenuSubTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.SubmenuTrigger>, "className"> {
  className?: string;
  inset?: boolean;
}

interface DropdownMenuContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Positioner>, "className"> {
  className?: string;
}

interface DropdownMenuItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Item>, "className"> {
  className?: string;
  inset?: boolean;
  /** @deprecated Prefer Base UI's `render` prop. */
  asChild?: boolean;
}

interface DropdownMenuCheckboxItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.CheckboxItem>, "className"> {
  className?: string;
}

interface DropdownMenuRadioItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.RadioItem>, "className"> {
  className?: string;
}

interface DropdownMenuLabelProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.GroupLabel>, "className"> {
  className?: string;
  inset?: boolean;
}

interface DropdownMenuSeparatorProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Separator>, "className"> {
  className?: string;
}

interface DropdownMenuShortcutProps extends React.ComponentPropsWithRef<"span"> {
  className?: string;
  render?: useRender.RenderProp<Record<string, never>>;
  /** @deprecated Prefer the `render` prop. */
  asChild?: boolean;
}

function DropdownMenu(props: Readonly<DropdownMenu.Props>): React.ReactElement {
  return <BaseMenu.Root {...props} />;
}

const DropdownMenuGroup = BaseMenu.Group;
const DropdownMenuPortal = BaseMenu.Portal;
const DropdownMenuRadioGroup = BaseMenu.RadioGroup;
const DropdownMenuSub = BaseMenu.SubmenuRoot;

function DropdownMenuTrigger(props: Readonly<DropdownMenuTrigger.Props>): React.ReactElement {
  const {asChild = false, children, className, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return (
    <BaseMenu.Trigger
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: renderProp as never,
        props: mergeProps({className}, {}),
      })}>
      {renderProp ? undefined : children}
    </BaseMenu.Trigger>
  );
}

function DropdownMenuSubTrigger(props: Readonly<DropdownMenuSubTrigger.Props>): React.ReactElement {
  const {className, children, inset = false, render, ...otherProps} = props;

  return (
    <BaseMenu.SubmenuTrigger
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.item, styles.subTrigger, inset && styles.inset, className)}, {}),
      })}>
      {children}
      <ChevronRight className={styles.subTriggerIcon} />
    </BaseMenu.SubmenuTrigger>
  );
}

function DropdownMenuSubContent(props: Readonly<DropdownMenuContent.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseMenu.Positioner
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        props: mergeProps({className: styles.positioner}, {}),
      })}>
      <BaseMenu.Popup
        render={useRender({
          defaultTagName: "div",
          render: render as never,
          props: mergeProps({className: cn(styles.content, className)}, {}),
        })}>
        {children}
      </BaseMenu.Popup>
    </BaseMenu.Positioner>
  );
}

function DropdownMenuContent(props: Readonly<DropdownMenuContent.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <DropdownMenuPortal>
      <BaseMenu.Positioner
        {...otherProps}
        render={useRender({
          defaultTagName: "div",
          props: mergeProps({className: styles.positioner}, {}),
        })}>
        <BaseMenu.Popup
          render={useRender({
            defaultTagName: "div",
            render: render as never,
            props: mergeProps({className: cn(styles.content, className)}, {}),
          })}>
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </DropdownMenuPortal>
  );
}

function DropdownMenuItem(props: Readonly<DropdownMenuItem.Props>): React.ReactElement {
  const {asChild = false, children, className, inset = false, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return (
    <BaseMenu.Item
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: renderProp as never,
        props: mergeProps({className: cn(styles.item, inset && styles.inset, className)}, {}),
      })}>
      {renderProp ? undefined : children}
    </BaseMenu.Item>
  );
}

function DropdownMenuCheckboxItem(props: Readonly<DropdownMenuCheckboxItem.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseMenu.CheckboxItem
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.item, styles.indicatorItem, className)}, {}),
      })}>
      <span className={styles.indicatorSlot}>
        <BaseMenu.CheckboxItemIndicator>
          <Check className={styles.indicatorIcon} />
        </BaseMenu.CheckboxItemIndicator>
      </span>
      {children}
    </BaseMenu.CheckboxItem>
  );
}

function DropdownMenuRadioItem(props: Readonly<DropdownMenuRadioItem.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseMenu.RadioItem
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.item, styles.indicatorItem, className)}, {}),
      })}>
      <span className={styles.indicatorSlot}>
        <BaseMenu.RadioItemIndicator>
          <Circle className={styles.radioIndicatorIcon} />
        </BaseMenu.RadioItemIndicator>
      </span>
      {children}
    </BaseMenu.RadioItem>
  );
}

function DropdownMenuLabel(props: Readonly<DropdownMenuLabel.Props>): React.ReactElement {
  const {className, children, inset = false, render, ...otherProps} = props;

  return (
    <BaseMenu.GroupLabel
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.label, inset && styles.inset, className)}, {}),
      })}>
      {children}
    </BaseMenu.GroupLabel>
  );
}

function DropdownMenuSeparator(props: Readonly<DropdownMenuSeparator.Props>): React.ReactElement {
  const {className, render, ...otherProps} = props;

  return (
    <BaseMenu.Separator
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.separator, className)}, {}),
      })}
    />
  );
}

function DropdownMenuShortcut(props: Readonly<DropdownMenuShortcut.Props>): React.ReactElement {
  const {asChild = false, children, className, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return useRender({
    defaultTagName: "span",
    render: renderProp as never,
    props: mergeProps({className: cn(styles.shortcut, className)}, otherProps, {
      children: renderProp ? undefined : children,
    }),
  });
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DropdownMenu {
  export type Props = DropdownMenuProps;
  export type State = BaseMenu.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DropdownMenuTrigger {
  export type Props = DropdownMenuTriggerProps;
  export type State = BaseMenu.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DropdownMenuSubTrigger {
  export type Props = DropdownMenuSubTriggerProps;
  export type State = BaseMenu.SubmenuTrigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DropdownMenuContent {
  export type Props = DropdownMenuContentProps;
  export type State = BaseMenu.Popup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DropdownMenuSubContent {
  export type Props = DropdownMenuContentProps;
  export type State = BaseMenu.Popup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DropdownMenuItem {
  export type Props = DropdownMenuItemProps;
  export type State = BaseMenu.Item.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DropdownMenuCheckboxItem {
  export type Props = DropdownMenuCheckboxItemProps;
  export type State = BaseMenu.CheckboxItem.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DropdownMenuRadioItem {
  export type Props = DropdownMenuRadioItemProps;
  export type State = BaseMenu.RadioItem.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DropdownMenuLabel {
  export type Props = DropdownMenuLabelProps;
  export type State = BaseMenu.GroupLabel.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DropdownMenuSeparator {
  export type Props = DropdownMenuSeparatorProps;
  export type State = BaseMenu.Separator.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DropdownMenuShortcut {
  export type Props = DropdownMenuShortcutProps;
  export type State = Record<string, never>;
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
