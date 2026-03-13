"use client";

import {Select as BaseSelect} from "@base-ui/react/select";
import {Check, ChevronDown, ChevronUp} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./select.module.css";

/**
 * Represents the configurable props for the Select root component.
 *
 * @remarks
 * This compatibility wrapper preserves the library's simpler string-based
 * `onValueChange` callback while forwarding the rest of the Base UI select API.
 */
interface SelectProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseSelect.Root>, "onValueChange"> {
  /**
   * Called when the selected value changes and the next value is a string.
   */
  onValueChange?: (value: string) => void;
  /**
   * The trigger, content, and item subcomponents composed inside the select root.
   */
  children?: React.ReactNode;
}

/**
 * Represents the configurable props for the SelectTrigger component.
 *
 * @remarks
 * Extends the Base UI trigger primitive and exposes a class override for trigger styling.
 */
interface SelectTriggerProps extends React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger> {
  /**
   * Additional CSS classes merged with the select trigger styles.
   */
  className?: string;
  /**
   * The visible trigger content, commonly a {@link SelectValue} element.
   */
  children?: React.ReactNode;
}

/**
 * Represents the configurable props for the SelectScrollUpButton component.
 *
 * @remarks
 * Extends the Base UI scroll-up arrow primitive and documents the class override and fallback icon slot.
 */
interface SelectScrollUpButtonProps extends React.ComponentPropsWithoutRef<typeof BaseSelect.ScrollUpArrow> {
  /**
   * Additional CSS classes merged with the scroll button styles.
   */
  className?: string;
  /**
   * Custom content rendered instead of the default upward chevron icon.
   */
  children?: React.ReactNode;
}

/**
 * Represents the configurable props for the SelectScrollDownButton component.
 *
 * @remarks
 * Extends the Base UI scroll-down arrow primitive and documents the class override and fallback icon slot.
 */
interface SelectScrollDownButtonProps extends React.ComponentPropsWithoutRef<typeof BaseSelect.ScrollDownArrow> {
  /**
   * Additional CSS classes merged with the scroll button styles.
   */
  className?: string;
  /**
   * Custom content rendered instead of the default downward chevron icon.
   */
  children?: React.ReactNode;
}

/**
 * Represents the configurable props for the SelectContent component.
 *
 * @remarks
 * Extends the Base UI positioner primitive and documents the popup content and offset default.
 *
 * @default sideOffset `4`
 */
interface SelectContentProps extends React.ComponentPropsWithoutRef<typeof BaseSelect.Positioner> {
  /**
   * Additional CSS classes merged with the select popup styles.
   */
  className?: string;
  /**
   * The list items and grouping elements rendered inside the popup.
   */
  children?: React.ReactNode;
  /**
   * Distance in pixels between the trigger and the popup content.
   *
   * @default 4
   */
  sideOffset?: number;
}

/**
 * Represents the configurable props for the SelectLabel component.
 *
 * @remarks
 * Extends the Base UI group label primitive and exposes a class override for group headings.
 */
interface SelectLabelProps extends React.ComponentPropsWithoutRef<typeof BaseSelect.GroupLabel> {
  /**
   * Additional CSS classes merged with the select group label styles.
   */
  className?: string;
}

/**
 * Represents the configurable props for the SelectItem component.
 *
 * @remarks
 * Extends the Base UI item primitive and documents the child content rendered as the visible option text.
 */
interface SelectItemProps extends React.ComponentPropsWithoutRef<typeof BaseSelect.Item> {
  /**
   * Additional CSS classes merged with the select item styles.
   */
  className?: string;
  /**
   * The visible option label rendered inside the item text slot.
   */
  children?: React.ReactNode;
}

/**
 * Represents the configurable props for the SelectSeparator component.
 *
 * @remarks
 * Extends the Base UI separator primitive and exposes a class override for visual dividers.
 */
interface SelectSeparatorProps extends React.ComponentPropsWithoutRef<typeof BaseSelect.Separator> {
  /**
   * Additional CSS classes merged with the select separator styles.
   */
  className?: string;
}

/**
 * An accessible select root for choosing a single value from a list of options.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI select root primitive and preserves the shared library's simpler
 * string-only `onValueChange` callback for compatibility with existing consumers.
 *
 * @example
 * ```tsx
 * <Select defaultValue="pro">
 *   <SelectTrigger>
 *     <SelectValue placeholder="Choose a plan" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="starter">Starter</SelectItem>
 *     <SelectItem value="pro">Pro</SelectItem>
 *   </SelectContent>
 * </Select>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select Base UI Select docs}
 */
function Select({onValueChange, ...props}: Readonly<SelectProps>): React.JSX.Element {
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
      onValueChange={handleChange as never}
      {...props}
    />
  );
}
Select.displayName = "Select";

/**
 * A grouping container for related select items.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * This is a direct alias of the Base UI select group primitive and is typically paired
 * with {@link SelectLabel} to organize larger option lists.
 *
 * @example
 * ```tsx
 * <SelectGroup>
 *   <SelectLabel>Teams</SelectLabel>
 *   <SelectItem value="design">Design</SelectItem>
 * </SelectGroup>
 * ```
 *
 * @see {@link SelectLabel}
 * @see {@link https://base-ui.com/react/components/select Base UI Select docs}
 */
const SelectGroup = BaseSelect.Group;

/**
 * A value slot that renders the selected option label inside the trigger.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * This is a direct alias of the Base UI select value primitive and is commonly used
 * inside {@link SelectTrigger} to show the current selection or placeholder.
 *
 * @example
 * ```tsx
 * <SelectTrigger>
 *   <SelectValue placeholder="Select a workspace" />
 * </SelectTrigger>
 * ```
 *
 * @see {@link SelectTrigger}
 * @see {@link https://base-ui.com/react/components/select Base UI Select docs}
 */
const SelectValue = BaseSelect.Value;

/**
 * The interactive button that opens and closes the select popup.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI trigger primitive, renders the selected value content, and adds a
 * trailing chevron icon to signal the dropdown interaction.
 *
 * @example
 * ```tsx
 * <SelectTrigger aria-label="Plan">
 *   <SelectValue placeholder="Choose a plan" />
 * </SelectTrigger>
 * ```
 *
 * @see {@link SelectValue}
 * @see {@link https://base-ui.com/react/components/select Base UI Select docs}
 */
const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(({className, children, ...props}, ref) => (
  <BaseSelect.Trigger
    ref={ref}
    className={cn(styles.trigger, className)}
    {...props}>
    {children}
    <BaseSelect.Icon className={styles.icon}>
      <ChevronDown className={styles.iconSvg} />
    </BaseSelect.Icon>
  </BaseSelect.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

/**
 * A scroll affordance shown when additional items exist above the visible list.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI scroll-up arrow primitive and renders a default chevron icon when
 * custom children are not supplied.
 *
 * @example
 * ```tsx
 * <SelectScrollUpButton />
 * ```
 *
 * @see {@link SelectContent}
 * @see {@link https://base-ui.com/react/components/select Base UI Select docs}
 */
const SelectScrollUpButton = React.forwardRef<HTMLDivElement, SelectScrollUpButtonProps>(({className, children, ...props}, ref) => (
  <BaseSelect.ScrollUpArrow
    ref={ref}
    className={cn(styles.scrollButton, className)}
    {...props}>
    {children ?? <ChevronUp className={styles.scrollIcon} />}
  </BaseSelect.ScrollUpArrow>
));
SelectScrollUpButton.displayName = "SelectScrollUpButton";

/**
 * A scroll affordance shown when additional items exist below the visible list.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI scroll-down arrow primitive and renders a default chevron icon when
 * custom children are not supplied.
 *
 * @example
 * ```tsx
 * <SelectScrollDownButton />
 * ```
 *
 * @see {@link SelectContent}
 * @see {@link https://base-ui.com/react/components/select Base UI Select docs}
 */
const SelectScrollDownButton = React.forwardRef<HTMLDivElement, SelectScrollDownButtonProps>(({className, children, ...props}, ref) => (
  <BaseSelect.ScrollDownArrow
    ref={ref}
    className={cn(styles.scrollButton, className)}
    {...props}>
    {children ?? <ChevronDown className={styles.scrollIcon} />}
  </BaseSelect.ScrollDownArrow>
));
SelectScrollDownButton.displayName = "SelectScrollDownButton";

/**
 * The floating select popup that renders grouped items inside a portal.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * `SelectContent` composes the Base UI portal, positioner, popup, list, and scroll
 * controls so most consumers only need to render options as children.
 *
 * @example
 * ```tsx
 * <SelectContent>
 *   <SelectItem value="engineering">Engineering</SelectItem>
 *   <SelectItem value="product">Product</SelectItem>
 * </SelectContent>
 * ```
 *
 * @see {@link SelectItem}
 * @see {@link https://base-ui.com/react/components/select Base UI Select docs}
 */
const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(({className, children, sideOffset = 4, ...props}, ref) => (
  <BaseSelect.Portal>
    <BaseSelect.Positioner
      className={styles.positioner}
      sideOffset={sideOffset}
      {...props}>
      <BaseSelect.Popup
        ref={ref}
        className={cn(styles.popup, className)}>
        <SelectScrollUpButton />
        <BaseSelect.List className={styles.list}>{children}</BaseSelect.List>
        <SelectScrollDownButton />
      </BaseSelect.Popup>
    </BaseSelect.Positioner>
  </BaseSelect.Portal>
));
SelectContent.displayName = "SelectContent";

/**
 * A heading label for a grouped set of select items.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI group label primitive and applies muted typography suitable for
 * option grouping inside large select menus.
 *
 * @example
 * ```tsx
 * <SelectLabel>Recent workspaces</SelectLabel>
 * ```
 *
 * @see {@link SelectGroup}
 * @see {@link https://base-ui.com/react/components/select Base UI Select docs}
 */
const SelectLabel = React.forwardRef<HTMLDivElement, SelectLabelProps>(({className, ...props}, ref) => (
  <BaseSelect.GroupLabel
    ref={ref}
    className={cn(styles.label, className)}
    {...props}
  />
));
SelectLabel.displayName = "SelectLabel";

/**
 * A selectable option rendered inside the select popup.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI item primitive, adds a leading selection indicator slot, and
 * renders the visible option label through the item text primitive.
 *
 * @example
 * ```tsx
 * <SelectItem value="enterprise">Enterprise</SelectItem>
 * ```
 *
 * @see {@link SelectContent}
 * @see {@link https://base-ui.com/react/components/select Base UI Select docs}
 */
const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(({className, children, ...props}, ref) => (
  <BaseSelect.Item
    ref={ref}
    className={cn(styles.item, className)}
    {...props}>
    <span className={styles.itemIndicatorSlot}>
      <BaseSelect.ItemIndicator>
        <Check className={styles.itemIndicatorIcon} />
      </BaseSelect.ItemIndicator>
    </span>
    <BaseSelect.ItemText className={styles.itemText}>{children}</BaseSelect.ItemText>
  </BaseSelect.Item>
));
SelectItem.displayName = "SelectItem";

/**
 * A visual separator for grouping related select options.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI separator primitive and renders a subtle divider between logical
 * sets of options within the popup.
 *
 * @example
 * ```tsx
 * <SelectSeparator />
 * ```
 *
 * @see {@link SelectContent}
 * @see {@link https://base-ui.com/react/components/select Base UI Select docs}
 */
const SelectSeparator = React.forwardRef<HTMLDivElement, SelectSeparatorProps>(({className, ...props}, ref) => (
  <BaseSelect.Separator
    ref={ref}
    className={cn(styles.separator, className)}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";

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
