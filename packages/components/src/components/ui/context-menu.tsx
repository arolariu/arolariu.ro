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

interface ContextMenuSubTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.SubmenuTrigger>, "className"> {
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

interface ContextMenuContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.Positioner>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface ContextMenuItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.Item>, "className"> {
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

interface ContextMenuCheckboxItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.CheckboxItem>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface ContextMenuRadioItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.RadioItem>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface ContextMenuLabelProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.GroupLabel>, "className"> {
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

interface ContextMenuSeparatorProps extends Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.Separator>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface ContextMenuShortcutProps extends React.ComponentPropsWithRef<"span"> {
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
 * Coordinates context menu state and accessibility behavior.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <ContextMenu>Content</ContextMenu>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
function ContextMenu(props: Readonly<ContextMenu.Props>): React.ReactElement {
  return <BaseContextMenu.Root {...props} />;
}

/**
 * Renders the context menu group.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <ContextMenuGroup>Content</ContextMenuGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
const ContextMenuGroup = BaseContextMenu.Group;
/**
 * Provides the context menu portal container.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <ContextMenuPortal>Content</ContextMenuPortal>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
const ContextMenuPortal = BaseContextMenu.Portal;
/**
 * Coordinates the context menu radio group.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <ContextMenuRadioGroup>Content</ContextMenuRadioGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
const ContextMenuRadioGroup = BaseContextMenu.RadioGroup;
/**
 * Coordinates the context menu sub.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <ContextMenuSub>Content</ContextMenuSub>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
const ContextMenuSub: typeof BaseContextMenu.SubmenuRoot & {displayName?: string} = BaseContextMenu.SubmenuRoot;

/**
 * Renders the context menu trigger.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <ContextMenuTrigger>Content</ContextMenuTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
const ContextMenuTrigger = React.forwardRef<React.ComponentRef<typeof BaseContextMenu.Trigger>, ContextMenuTrigger.Props>(
  (props: Readonly<ContextMenuTrigger.Props>, ref): React.ReactElement => {
    const {asChild = false, children, className, render, ...otherProps} = props;
    const renderProp = asChild && React.isValidElement(children) ? children : render;

    return (
      <BaseContextMenu.Trigger
        ref={ref}
        {...otherProps}
        render={useRender({
          defaultTagName: "div",
          render: renderProp as never,
          props: mergeProps({className}, {}),
        })}>
        {renderProp ? undefined : children}
      </BaseContextMenu.Trigger>
    );
  },
);

/**
 * Renders the context menu sub trigger.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <ContextMenuSubTrigger>Content</ContextMenuSubTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
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

/**
 * Renders the context menu sub content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <ContextMenuSubContent>Content</ContextMenuSubContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
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

/**
 * Renders the context menu content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <ContextMenuContent>Content</ContextMenuContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
const ContextMenuContent = React.forwardRef<React.ComponentRef<typeof BaseContextMenu.Popup>, ContextMenuContent.Props>(
  (props: Readonly<ContextMenuContent.Props>, ref): React.ReactElement => {
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
            ref={ref}
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
  },
);

/**
 * Renders the context menu item.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <ContextMenuItem>Content</ContextMenuItem>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
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

/**
 * Renders the context menu checkbox item.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <ContextMenuCheckboxItem>Content</ContextMenuCheckboxItem>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
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

/**
 * Renders the context menu radio item.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <ContextMenuRadioItem>Content</ContextMenuRadioItem>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
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

/**
 * Renders the context menu label.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <ContextMenuLabel>Content</ContextMenuLabel>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
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

/**
 * Renders the context menu separator.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <ContextMenuSeparator>Content</ContextMenuSeparator>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
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

/**
 * Renders the context menu shortcut.
 *
 * @remarks
 * - Renders a `<span>` element by default
 * - Built on {@link https://base-ui.com/react/components/context-menu | Base UI Context Menu}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <ContextMenuShortcut>Content</ContextMenuShortcut>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/context-menu | Base UI Documentation}
 */
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

ContextMenu.displayName = "ContextMenu";
ContextMenuGroup.displayName = "ContextMenuGroup";
ContextMenuPortal.displayName = "ContextMenuPortal";
ContextMenuRadioGroup.displayName = "ContextMenuRadioGroup";
ContextMenuSub.displayName = "ContextMenuSub";
ContextMenuTrigger.displayName = "ContextMenuTrigger";
ContextMenuSubTrigger.displayName = "ContextMenuSubTrigger";
ContextMenuSubContent.displayName = "ContextMenuSubContent";
ContextMenuContent.displayName = "ContextMenuContent";
ContextMenuItem.displayName = "ContextMenuItem";
ContextMenuCheckboxItem.displayName = "ContextMenuCheckboxItem";
ContextMenuRadioItem.displayName = "ContextMenuRadioItem";
ContextMenuLabel.displayName = "ContextMenuLabel";
ContextMenuSeparator.displayName = "ContextMenuSeparator";
ContextMenuShortcut.displayName = "ContextMenuShortcut";

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
