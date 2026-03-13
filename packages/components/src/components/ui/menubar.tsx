"use client";

import {Menu as BaseMenu} from "@base-ui/react/menu";
import {Menubar as BaseMenubar} from "@base-ui/react/menubar";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import {Check, ChevronRight, Circle} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./menubar.module.css";

type MenubarProps = Omit<React.ComponentPropsWithRef<typeof BaseMenubar>, "className"> & {className?: string};
interface MenubarTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Trigger>, "className"> {
  className?: string;
}
interface MenubarSubTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.SubmenuTrigger>, "className"> {
  className?: string;
  inset?: boolean;
}
interface MenubarContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Positioner>, "className"> {
  className?: string;
}
interface MenubarItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Item>, "className"> {
  className?: string;
  inset?: boolean;
}
interface MenubarCheckboxItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.CheckboxItem>, "className"> {
  className?: string;
}
interface MenubarRadioItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.RadioItem>, "className"> {
  className?: string;
}
interface MenubarLabelProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.GroupLabel>, "className"> {
  className?: string;
  inset?: boolean;
}
interface MenubarSeparatorProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Separator>, "className"> {
  className?: string;
}
interface MenubarShortcutProps extends React.ComponentPropsWithRef<"span"> {
  className?: string;
  render?: useRender.RenderProp<Record<string, never>>;
  asChild?: boolean;
}

const MenubarMenu = BaseMenu.Root;
const MenubarGroup = BaseMenu.Group;
const MenubarPortal = BaseMenu.Portal;
const MenubarRadioGroup = BaseMenu.RadioGroup;
const MenubarSub = BaseMenu.SubmenuRoot;

function Menubar(props: Readonly<Menubar.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseMenubar
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.root, className)}, {}),
      })}>
      {children}
    </BaseMenubar>
  );
}

function MenubarTrigger(props: Readonly<MenubarTrigger.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseMenu.Trigger
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps({className: cn(styles.trigger, className)}, {}),
      })}>
      {children}
    </BaseMenu.Trigger>
  );
}

function MenubarSubTrigger(props: Readonly<MenubarSubTrigger.Props>): React.ReactElement {
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

function MenubarSubContent(props: Readonly<MenubarContent.Props>): React.ReactElement {
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

function MenubarContent(props: Readonly<MenubarContent.Props>): React.ReactElement {
  const {alignOffset = -4, className, children, render, sideOffset = 8, ...otherProps} = props;

  return (
    <MenubarPortal>
      <BaseMenu.Positioner
        alignOffset={alignOffset}
        sideOffset={sideOffset}
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
    </MenubarPortal>
  );
}

function MenubarItem(props: Readonly<MenubarItem.Props>): React.ReactElement {
  const {className, children, inset = false, render, ...otherProps} = props;

  return (
    <BaseMenu.Item
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.item, inset && styles.inset, className)}, {}),
      })}>
      {children}
    </BaseMenu.Item>
  );
}

function MenubarCheckboxItem(props: Readonly<MenubarCheckboxItem.Props>): React.ReactElement {
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

function MenubarRadioItem(props: Readonly<MenubarRadioItem.Props>): React.ReactElement {
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

function MenubarLabel(props: Readonly<MenubarLabel.Props>): React.ReactElement {
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

function MenubarSeparator(props: Readonly<MenubarSeparator.Props>): React.ReactElement {
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

function MenubarShortcut(props: Readonly<MenubarShortcut.Props>): React.ReactElement {
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
namespace Menubar {
  export type Props = MenubarProps;
  export type State = BaseMenubar.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MenubarTrigger {
  export type Props = MenubarTriggerProps;
  export type State = BaseMenu.Trigger.State;
}
// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MenubarSubTrigger {
  export type Props = MenubarSubTriggerProps;
  export type State = BaseMenu.SubmenuTrigger.State;
}
// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MenubarContent {
  export type Props = MenubarContentProps;
  export type State = BaseMenu.Popup.State;
}
// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MenubarSubContent {
  export type Props = MenubarContentProps;
  export type State = BaseMenu.Popup.State;
}
// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MenubarItem {
  export type Props = MenubarItemProps;
  export type State = BaseMenu.Item.State;
}
// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MenubarCheckboxItem {
  export type Props = MenubarCheckboxItemProps;
  export type State = BaseMenu.CheckboxItem.State;
}
// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MenubarRadioItem {
  export type Props = MenubarRadioItemProps;
  export type State = BaseMenu.RadioItem.State;
}
// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MenubarLabel {
  export type Props = MenubarLabelProps;
  export type State = BaseMenu.GroupLabel.State;
}
// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MenubarSeparator {
  export type Props = MenubarSeparatorProps;
  export type State = BaseMenu.Separator.State;
}
// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace MenubarShortcut {
  export type Props = MenubarShortcutProps;
  export type State = Record<string, never>;
}

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
