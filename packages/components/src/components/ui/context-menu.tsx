"use client";

import {ContextMenu as BaseContextMenu} from "@base-ui/react/context-menu";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import {Check, ChevronRight, Circle} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./context-menu.module.css";

interface ContextMenuProps extends React.ComponentPropsWithRef<typeof BaseContextMenu.Root> {}

interface ContextMenuTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.Trigger>, "className"> {
  className?: string;
  /** @deprecated Prefer Base UI's `render` prop. */
  asChild?: boolean;
}

interface ContextMenuSubTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.SubmenuTrigger>, "className"> {
  className?: string;
  inset?: boolean;
}

interface ContextMenuContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.Positioner>, "className"> {
  className?: string;
}

interface ContextMenuItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.Item>, "className"> {
  className?: string;
  inset?: boolean;
  /** @deprecated Prefer Base UI's `render` prop. */
  asChild?: boolean;
}

interface ContextMenuCheckboxItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.CheckboxItem>, "className"> {
  className?: string;
}

interface ContextMenuRadioItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.RadioItem>, "className"> {
  className?: string;
}

interface ContextMenuLabelProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.GroupLabel>, "className"> {
  className?: string;
  inset?: boolean;
}

interface ContextMenuSeparatorProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.Separator>, "className"> {
  className?: string;
}

interface ContextMenuShortcutProps extends React.ComponentPropsWithRef<"span"> {
  className?: string;
  render?: useRender.RenderProp<Record<string, never>>;
  /** @deprecated Prefer the `render` prop. */
  asChild?: boolean;
}

function ContextMenu(props: Readonly<ContextMenu.Props>): React.ReactElement {
  return <BaseContextMenu.Root {...props} />;
}

const ContextMenuGroup = BaseContextMenu.Group;
const ContextMenuPortal = BaseContextMenu.Portal;
const ContextMenuRadioGroup = BaseContextMenu.RadioGroup;
const ContextMenuSub = BaseContextMenu.SubmenuRoot;

function ContextMenuTrigger(props: Readonly<ContextMenuTrigger.Props>): React.ReactElement {
  const {asChild = false, children, className, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return (
    <BaseContextMenu.Trigger
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: renderProp as never,
        props: mergeProps({className}, {}),
      })}>
      {renderProp ? undefined : children}
    </BaseContextMenu.Trigger>
  );
}

function ContextMenuSubTrigger(props: Readonly<ContextMenuSubTrigger.Props>): React.ReactElement {
  const {className, children, inset = false, render, ...otherProps} = props;

  return (
    <BaseContextMenu.SubmenuTrigger
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.item, styles.subTrigger, inset && styles.inset, className)}, {}),
      })}>
      {children}
      <ChevronRight className={styles.subTriggerIcon} />
    </BaseContextMenu.SubmenuTrigger>
  );
}

function ContextMenuSubContent(props: Readonly<ContextMenuContent.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseContextMenu.Positioner
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        props: mergeProps({className: styles.positioner}, {}),
      })}>
      <BaseContextMenu.Popup
        render={useRender({
          defaultTagName: "div",
          render: render as never,
          props: mergeProps({className: cn(styles.content, className)}, {}),
        })}>
        {children}
      </BaseContextMenu.Popup>
    </BaseContextMenu.Positioner>
  );
}

function ContextMenuContent(props: Readonly<ContextMenuContent.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <ContextMenuPortal>
      <BaseContextMenu.Positioner
        {...otherProps}
        render={useRender({
          defaultTagName: "div",
          props: mergeProps({className: styles.positioner}, {}),
        })}>
        <BaseContextMenu.Popup
          render={useRender({
            defaultTagName: "div",
            render: render as never,
            props: mergeProps({className: cn(styles.content, className)}, {}),
          })}>
          {children}
        </BaseContextMenu.Popup>
      </BaseContextMenu.Positioner>
    </ContextMenuPortal>
  );
}

function ContextMenuItem(props: Readonly<ContextMenuItem.Props>): React.ReactElement {
  const {asChild = false, children, className, inset = false, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return (
    <BaseContextMenu.Item
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: renderProp as never,
        props: mergeProps({className: cn(styles.item, inset && styles.inset, className)}, {}),
      })}>
      {renderProp ? undefined : children}
    </BaseContextMenu.Item>
  );
}

function ContextMenuCheckboxItem(props: Readonly<ContextMenuCheckboxItem.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseContextMenu.CheckboxItem
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.item, styles.indicatorItem, className)}, {}),
      })}>
      <span className={styles.indicatorSlot}>
        <BaseContextMenu.CheckboxItemIndicator>
          <Check className={styles.indicatorIcon} />
        </BaseContextMenu.CheckboxItemIndicator>
      </span>
      {children}
    </BaseContextMenu.CheckboxItem>
  );
}

function ContextMenuRadioItem(props: Readonly<ContextMenuRadioItem.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseContextMenu.RadioItem
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.item, styles.indicatorItem, className)}, {}),
      })}>
      <span className={styles.indicatorSlot}>
        <BaseContextMenu.RadioItemIndicator>
          <Circle className={styles.radioIndicatorIcon} />
        </BaseContextMenu.RadioItemIndicator>
      </span>
      {children}
    </BaseContextMenu.RadioItem>
  );
}

function ContextMenuLabel(props: Readonly<ContextMenuLabel.Props>): React.ReactElement {
  const {className, children, inset = false, render, ...otherProps} = props;

  return (
    <BaseContextMenu.GroupLabel
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.label, inset && styles.inset, className)}, {}),
      })}>
      {children}
    </BaseContextMenu.GroupLabel>
  );
}

function ContextMenuSeparator(props: Readonly<ContextMenuSeparator.Props>): React.ReactElement {
  const {className, render, ...otherProps} = props;

  return (
    <BaseContextMenu.Separator
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.separator, className)}, {}),
      })}
    />
  );
}

function ContextMenuShortcut(props: Readonly<ContextMenuShortcut.Props>): React.ReactElement {
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
namespace ContextMenu {
  export type Props = ContextMenuProps;
  export type State = BaseContextMenu.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ContextMenuTrigger {
  export type Props = ContextMenuTriggerProps;
  export type State = BaseContextMenu.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ContextMenuSubTrigger {
  export type Props = ContextMenuSubTriggerProps;
  export type State = BaseContextMenu.SubmenuTrigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ContextMenuContent {
  export type Props = ContextMenuContentProps;
  export type State = BaseContextMenu.Popup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ContextMenuSubContent {
  export type Props = ContextMenuContentProps;
  export type State = BaseContextMenu.Popup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ContextMenuItem {
  export type Props = ContextMenuItemProps;
  export type State = BaseContextMenu.Item.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ContextMenuCheckboxItem {
  export type Props = ContextMenuCheckboxItemProps;
  export type State = BaseContextMenu.CheckboxItem.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ContextMenuRadioItem {
  export type Props = ContextMenuRadioItemProps;
  export type State = BaseContextMenu.RadioItem.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ContextMenuLabel {
  export type Props = ContextMenuLabelProps;
  export type State = BaseContextMenu.GroupLabel.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ContextMenuSeparator {
  export type Props = ContextMenuSeparatorProps;
  export type State = BaseContextMenu.Separator.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ContextMenuShortcut {
  export type Props = ContextMenuShortcutProps;
  export type State = Record<string, never>;
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
