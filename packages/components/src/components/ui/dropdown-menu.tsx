"use client";

import {Menu as BaseMenu} from "@base-ui/react/menu";
import {Check, ChevronRight, Circle} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./dropdown-menu.module.css";

const DropdownMenu = BaseMenu.Root;
const DropdownMenuGroup = BaseMenu.Group;
const DropdownMenuPortal = BaseMenu.Portal;
const DropdownMenuRadioGroup = BaseMenu.RadioGroup;
const DropdownMenuSub = BaseMenu.SubmenuRoot;

interface DropdownMenuItemProps extends React.ComponentPropsWithoutRef<typeof BaseMenu.Item> {
  /** Adds left inset spacing to match grouped menu items. */
  inset?: boolean;
  /**
   * Renders the first child as the interactive element.
   * Maps to Base UI's `render` prop.
   */
  /** @deprecated Prefer Base UI's `render` prop. */

  asChild?: boolean;
}

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Trigger> & {asChild?: boolean}
>(({asChild = false, children, className, ...props}, ref) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseMenu.Trigger
        ref={ref}
        className={className}
        render={children as React.ReactElement}
        {...props}
      />
    );
  }

  return (
    <BaseMenu.Trigger
      ref={ref}
      className={className}
      {...props}>
      {children}
    </BaseMenu.Trigger>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

const DropdownMenuSubTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.SubmenuTrigger> & {inset?: boolean}
>(({className, inset = false, children, ...props}, ref) => (
  <BaseMenu.SubmenuTrigger
    ref={ref}
    className={cn(styles.item, styles.subTrigger, inset && styles.inset, className)}
    {...props}>
    {children}
    <ChevronRight className={styles.subTriggerIcon} />
  </BaseMenu.SubmenuTrigger>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.Positioner>>(
  ({className, children, ...props}, ref) => (
    <BaseMenu.Positioner
      className={styles.positioner}
      {...props}>
      <BaseMenu.Popup
        ref={ref}
        className={cn(styles.content, className)}>
        {children}
      </BaseMenu.Popup>
    </BaseMenu.Positioner>
  ),
);
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.Positioner>>(
  ({className, children, ...props}, ref) => (
    <DropdownMenuPortal>
      <BaseMenu.Positioner
        className={styles.positioner}
        {...props}>
        <BaseMenu.Popup
          ref={ref}
          className={cn(styles.content, className)}>
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </DropdownMenuPortal>
  ),
);
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({asChild = false, className, inset = false, children, ...props}, ref) => {
    const composedClassName = cn(styles.item, inset && styles.inset, className);

    if (asChild && React.isValidElement(children)) {
      return (
        <BaseMenu.Item
          ref={ref}
          className={composedClassName}
          render={children as React.ReactElement}
          {...props}
        />
      );
    }

    return (
      <BaseMenu.Item
        ref={ref}
        className={composedClassName}
        {...props}>
        {children}
      </BaseMenu.Item>
    );
  },
);
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.CheckboxItem>>(
  ({className, children, ...props}, ref) => (
    <BaseMenu.CheckboxItem
      ref={ref}
      className={cn(styles.item, styles.indicatorItem, className)}
      {...props}>
      <span className={styles.indicatorSlot}>
        <BaseMenu.CheckboxItemIndicator>
          <Check className={styles.indicatorIcon} />
        </BaseMenu.CheckboxItemIndicator>
      </span>
      {children}
    </BaseMenu.CheckboxItem>
  ),
);
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.RadioItem>>(
  ({className, children, ...props}, ref) => (
    <BaseMenu.RadioItem
      ref={ref}
      className={cn(styles.item, styles.indicatorItem, className)}
      {...props}>
      <span className={styles.indicatorSlot}>
        <BaseMenu.RadioItemIndicator>
          <Circle className={styles.radioIndicatorIcon} />
        </BaseMenu.RadioItemIndicator>
      </span>
      {children}
    </BaseMenu.RadioItem>
  ),
);
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel> & {inset?: boolean}>(
  ({className, inset = false, ...props}, ref) => (
    <BaseMenu.GroupLabel
      ref={ref}
      className={cn(styles.label, inset && styles.inset, className)}
      {...props}
    />
  ),
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.Separator>>(
  ({className, ...props}, ref) => (
    <BaseMenu.Separator
      ref={ref}
      className={cn(styles.separator, className)}
      {...props}
    />
  ),
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuShortcut = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({className, ...props}, ref) => (
  <span
    ref={ref}
    className={cn(styles.shortcut, className)}
    {...props}
  />
));
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
