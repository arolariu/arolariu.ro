"use client";

import {Select as BaseSelect} from "@base-ui/react/select";
import {Check, ChevronDown, ChevronUp} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./select.module.css";

/** Compatibility wrapper for Select.Root — maps V1 onValueChange(string) to Base UI's signature */
interface SelectProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseSelect.Root>, "onValueChange"> {
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

function Select({onValueChange, ...props}: SelectProps): React.JSX.Element {
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
const SelectGroup = BaseSelect.Group;
const SelectValue = BaseSelect.Value;

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger>>(
  ({className, children, ...props}, ref) => (
    <BaseSelect.Trigger
      ref={ref}
      className={cn(styles.trigger, className)}
      {...props}>
      {children}
      <BaseSelect.Icon className={styles.icon}>
        <ChevronDown className={styles.iconSvg} />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  ),
);
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.ScrollUpArrow>>(
  ({className, children, ...props}, ref) => (
    <BaseSelect.ScrollUpArrow
      ref={ref}
      className={cn(styles.scrollButton, className)}
      {...props}>
      {children ?? <ChevronUp className={styles.scrollIcon} />}
    </BaseSelect.ScrollUpArrow>
  ),
);
SelectScrollUpButton.displayName = "SelectScrollUpButton";

const SelectScrollDownButton = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.ScrollDownArrow>>(
  ({className, children, ...props}, ref) => (
    <BaseSelect.ScrollDownArrow
      ref={ref}
      className={cn(styles.scrollButton, className)}
      {...props}>
      {children ?? <ChevronDown className={styles.scrollIcon} />}
    </BaseSelect.ScrollDownArrow>
  ),
);
SelectScrollDownButton.displayName = "SelectScrollDownButton";

const SelectContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Positioner>>(
  ({className, children, sideOffset = 4, ...props}, ref) => (
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
  ),
);
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.GroupLabel>>(
  ({className, ...props}, ref) => (
    <BaseSelect.GroupLabel
      ref={ref}
      className={cn(styles.label, className)}
      {...props}
    />
  ),
);
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Item>>(
  ({className, children, ...props}, ref) => (
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
  ),
);
SelectItem.displayName = "SelectItem";

const SelectSeparator = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Separator>>(
  ({className, ...props}, ref) => (
    <BaseSelect.Separator
      ref={ref}
      className={cn(styles.separator, className)}
      {...props}
    />
  ),
);
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
