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
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}
interface MenubarSubTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.SubmenuTrigger>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Applies inset spacing to align nested content.
   * @default false
   */
  inset?: boolean;
}
interface MenubarContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Positioner>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}
interface MenubarItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Item>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Applies inset spacing to align nested content.
   * @default false
   */
  inset?: boolean;
}
interface MenubarCheckboxItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.CheckboxItem>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}
interface MenubarRadioItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.RadioItem>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}
interface MenubarLabelProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.GroupLabel>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Applies inset spacing to align nested content.
   * @default false
   */
  inset?: boolean;
}
interface MenubarSeparatorProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Separator>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}
interface MenubarShortcutProps extends React.ComponentPropsWithRef<"span"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Overrides the default rendered element while preserving component behavior.
   * @default undefined
   */
  render?: useRender.RenderProp<Record<string, never>>;
  /**
   * Enables child element composition instead of rendering the default wrapper.
   * @default false
   * @deprecated Prefer Base UI's `render` prop.
   */
  asChild?: boolean;
}

/**
 * Renders the menubar menu.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <MenubarMenu>Content</MenubarMenu>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
const MenubarMenu: typeof BaseMenu.Root & {displayName?: string} = BaseMenu.Root;
/**
 * Renders the menubar group.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <MenubarGroup>Content</MenubarGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
const MenubarGroup = BaseMenu.Group;
/**
 * Provides the menubar portal container.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <MenubarPortal>Content</MenubarPortal>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
const MenubarPortal = BaseMenu.Portal;
/**
 * Coordinates the menubar radio group.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <MenubarRadioGroup>Content</MenubarRadioGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
const MenubarRadioGroup = BaseMenu.RadioGroup;
/**
 * Coordinates the menubar sub.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <MenubarSub>Content</MenubarSub>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
const MenubarSub: typeof BaseMenu.SubmenuRoot & {displayName?: string} = BaseMenu.SubmenuRoot;

/**
 * Coordinates menubar state and accessibility behavior.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <Menubar>Content</Menubar>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
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

/**
 * Renders the menubar trigger.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <MenubarTrigger>Content</MenubarTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
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

/**
 * Renders the menubar sub trigger.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <MenubarSubTrigger>Content</MenubarSubTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
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

/**
 * Renders the menubar sub content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <MenubarSubContent>Content</MenubarSubContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
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

/**
 * Renders the menubar content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <MenubarContent>Content</MenubarContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
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

/**
 * Renders the menubar item.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <MenubarItem>Content</MenubarItem>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
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

/**
 * Renders the menubar checkbox item.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <MenubarCheckboxItem>Content</MenubarCheckboxItem>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
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

/**
 * Renders the menubar radio item.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <MenubarRadioItem>Content</MenubarRadioItem>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
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

/**
 * Renders the menubar label.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <MenubarLabel>Content</MenubarLabel>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
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

/**
 * Renders the menubar separator.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <MenubarSeparator>Content</MenubarSeparator>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
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

/**
 * Renders the menubar shortcut.
 *
 * @remarks
 * - Renders a `<span>` element by default
 * - Built on {@link https://base-ui.com/react/components/menubar | Base UI Menubar}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <MenubarShortcut>Content</MenubarShortcut>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menubar | Base UI Documentation}
 */
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

MenubarMenu.displayName = "MenubarMenu";
MenubarGroup.displayName = "MenubarGroup";
MenubarPortal.displayName = "MenubarPortal";
MenubarRadioGroup.displayName = "MenubarRadioGroup";
MenubarSub.displayName = "MenubarSub";
Menubar.displayName = "Menubar";
MenubarTrigger.displayName = "MenubarTrigger";
MenubarSubTrigger.displayName = "MenubarSubTrigger";
MenubarSubContent.displayName = "MenubarSubContent";
MenubarContent.displayName = "MenubarContent";
MenubarItem.displayName = "MenubarItem";
MenubarCheckboxItem.displayName = "MenubarCheckboxItem";
MenubarRadioItem.displayName = "MenubarRadioItem";
MenubarLabel.displayName = "MenubarLabel";
MenubarSeparator.displayName = "MenubarSeparator";
MenubarShortcut.displayName = "MenubarShortcut";

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
