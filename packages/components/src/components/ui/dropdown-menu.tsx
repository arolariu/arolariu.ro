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
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Enables child element composition instead of rendering the default wrapper.
   * @default false
   * @deprecated Prefer Base UI's `render` prop.
   */
  asChild?: boolean;
}

interface DropdownMenuSubTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.SubmenuTrigger>, "className"> {
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

interface DropdownMenuContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Positioner>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface DropdownMenuItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Item>, "className"> {
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
  /**
   * Enables child element composition instead of rendering the default wrapper.
   * @default false
   * @deprecated Prefer Base UI's `render` prop.
   */
  asChild?: boolean;
}

interface DropdownMenuCheckboxItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.CheckboxItem>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface DropdownMenuRadioItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.RadioItem>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface DropdownMenuLabelProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.GroupLabel>, "className"> {
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

interface DropdownMenuSeparatorProps extends Omit<React.ComponentPropsWithRef<typeof BaseMenu.Separator>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface DropdownMenuShortcutProps extends React.ComponentPropsWithRef<"span"> {
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
 * Coordinates dropdown menu state and accessibility behavior.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <DropdownMenu>Content</DropdownMenu>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
function DropdownMenu(props: Readonly<DropdownMenu.Props>): React.ReactElement {
  return <BaseMenu.Root {...props} />;
}

/**
 * Renders the dropdown menu group.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <DropdownMenuGroup>Content</DropdownMenuGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
const DropdownMenuGroup = BaseMenu.Group;
/**
 * Provides the dropdown menu portal container.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <DropdownMenuPortal>Content</DropdownMenuPortal>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
const DropdownMenuPortal = BaseMenu.Portal;
/**
 * Coordinates the dropdown menu radio group.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <DropdownMenuRadioGroup>Content</DropdownMenuRadioGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
const DropdownMenuRadioGroup = BaseMenu.RadioGroup;
/**
 * Coordinates the dropdown menu sub.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <DropdownMenuSub>Content</DropdownMenuSub>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
const DropdownMenuSub: typeof BaseMenu.SubmenuRoot & {displayName?: string} = BaseMenu.SubmenuRoot;

/**
 * Renders the dropdown menu trigger.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DropdownMenuTrigger>Content</DropdownMenuTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
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

/**
 * Renders the dropdown menu sub trigger.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DropdownMenuSubTrigger>Content</DropdownMenuSubTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
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

/**
 * Renders the dropdown menu sub content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DropdownMenuSubContent>Content</DropdownMenuSubContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
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

/**
 * Renders the dropdown menu content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DropdownMenuContent>Content</DropdownMenuContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
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

/**
 * Renders the dropdown menu item.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DropdownMenuItem>Content</DropdownMenuItem>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
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

/**
 * Renders the dropdown menu checkbox item.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DropdownMenuCheckboxItem>Content</DropdownMenuCheckboxItem>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
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

/**
 * Renders the dropdown menu radio item.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DropdownMenuRadioItem>Content</DropdownMenuRadioItem>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
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

/**
 * Renders the dropdown menu label.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DropdownMenuLabel>Content</DropdownMenuLabel>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
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

/**
 * Renders the dropdown menu separator.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DropdownMenuSeparator>Content</DropdownMenuSeparator>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
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

/**
 * Renders the dropdown menu shortcut.
 *
 * @remarks
 * - Renders a `<span>` element by default
 * - Built on {@link https://base-ui.com/react/components/menu | Base UI Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DropdownMenuShortcut>Content</DropdownMenuShortcut>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/menu | Base UI Documentation}
 */
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

DropdownMenu.displayName = "DropdownMenu";
DropdownMenuGroup.displayName = "DropdownMenuGroup";
DropdownMenuPortal.displayName = "DropdownMenuPortal";
DropdownMenuRadioGroup.displayName = "DropdownMenuRadioGroup";
DropdownMenuSub.displayName = "DropdownMenuSub";
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";
DropdownMenuContent.displayName = "DropdownMenuContent";
DropdownMenuItem.displayName = "DropdownMenuItem";
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";
DropdownMenuLabel.displayName = "DropdownMenuLabel";
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

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
