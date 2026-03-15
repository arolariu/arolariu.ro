"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Select as BaseSelect} from "@base-ui/react/select";
import {useRender} from "@base-ui/react/use-render";
import {Check, ChevronDown, ChevronUp} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./select.module.css";

interface SelectProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.Root>, "onValueChange"> {
  /** Called when the selected value changes and resolves to a string. @default undefined */
  onValueChange?: (value: string) => void;
}

interface SelectTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.Trigger>, "className"> {
  /** Additional CSS classes merged with the select trigger styles. @default undefined */
  className?: string;
}

interface SelectScrollUpButtonProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.ScrollUpArrow>, "className"> {
  /** Additional CSS classes merged with the scroll-up control styles. @default undefined */
  className?: string;
}

interface SelectScrollDownButtonProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.ScrollDownArrow>, "className"> {
  /** Additional CSS classes merged with the scroll-down control styles. @default undefined */
  className?: string;
}

interface SelectContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.Positioner>, "className"> {
  /** Additional CSS classes merged with the select popup styles. @default undefined */
  className?: string;
  /** The offset in pixels between the trigger and the popup. @default 4 */
  sideOffset?: number;
}

interface SelectLabelProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.GroupLabel>, "className"> {
  /** Additional CSS classes merged with the group label styles. @default undefined */
  className?: string;
}

interface SelectItemProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.Item>, "className"> {
  /** Additional CSS classes merged with the select item styles. @default undefined */
  className?: string;
}

interface SelectSeparatorProps extends Omit<React.ComponentPropsWithRef<typeof BaseSelect.Separator>, "className"> {
  /** Additional CSS classes merged with the separator styles. @default undefined */
  className?: string;
}

/**
 * Coordinates select state, keyboard navigation, and value management.
 *
 * @remarks
 * - Renders no DOM element by default and coordinates descendant select parts
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports composition through descendant `render` props
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Select defaultValue="one">
 *   <SelectTrigger />
 *   <SelectContent>
 *     <SelectItem value="one">One</SelectItem>
 *   </SelectContent>
 * </Select>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
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
Select.displayName = "Select";

/**
 * Groups related select items into a shared logical section.
 *
 * @remarks
 * - Renders no DOM element by default beyond the underlying grouped option container
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports composition through descendant `render` props
 * - Styling via CSS Modules with `--ac-*` custom properties through descendant components
 *
 * @example Basic usage
 * ```tsx
 * <SelectGroup>
 *   <SelectLabel>Team</SelectLabel>
 *   <SelectItem value="one">One</SelectItem>
 * </SelectGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
const SelectGroup = BaseSelect.Group;
SelectGroup.displayName = "SelectGroup";
/**
 * Displays the currently selected option inside the trigger.
 *
 * @remarks
 * - Renders no DOM element by default beyond the underlying value slot
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports composition through surrounding select trigger rendering
 * - Styling via CSS Modules with `--ac-*` custom properties through descendant components
 *
 * @example Basic usage
 * ```tsx
 * <SelectValue placeholder="Select an option" />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
const SelectValue = BaseSelect.Value;
SelectValue.displayName = "SelectValue";

/**
 * Opens the select popup and displays the current selected value.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <SelectTrigger>
 *   <SelectValue />
 * </SelectTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
const SelectTrigger = React.forwardRef<React.ComponentRef<typeof BaseSelect.Trigger>, SelectTrigger.Props>(
  (props: Readonly<SelectTrigger.Props>, ref): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseSelect.Trigger
        ref={ref}
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
  },
);
SelectTrigger.displayName = "SelectTrigger";

/**
 * Scrolls the select list upward when the popup overflows its viewport.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Pass `children` to override the default `ChevronUp` icon
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <SelectScrollUpButton />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
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
SelectScrollUpButton.displayName = "SelectScrollUpButton";

/**
 * Scrolls the select list downward when the popup overflows its viewport.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Pass `children` to override the default `ChevronDown` icon
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <SelectScrollDownButton />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
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
SelectScrollDownButton.displayName = "SelectScrollDownButton";

/**
 * Portals and positions the select popup with scroll affordances.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <SelectContent>
 *   <SelectItem value="one">One</SelectItem>
 * </SelectContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
const SelectContent = React.forwardRef<React.ComponentRef<typeof BaseSelect.Popup>, SelectContent.Props>(
  (props: Readonly<SelectContent.Props>, ref): React.ReactElement => {
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
            ref={ref}
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
  },
);
SelectContent.displayName = "SelectContent";

/**
 * Labels a logical group of options inside the select popup.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <SelectLabel>Team</SelectLabel>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
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
SelectLabel.displayName = "SelectLabel";

/**
 * Renders a selectable option row within the select popup.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <SelectItem value="one">One</SelectItem>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
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
SelectItem.displayName = "SelectItem";

/**
 * Separates groups of options inside the select popup.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <SelectSeparator />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
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
SelectSeparator.displayName = "SelectSeparator";

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
