"use client";

import {ContextMenu as BaseContextMenu} from "@base-ui/react/context-menu";
import {Check, ChevronRight, Circle} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./context-menu.module.css";

const ContextMenu = BaseContextMenu.Root;
const ContextMenuGroup = BaseContextMenu.Group;
const ContextMenuPortal = BaseContextMenu.Portal;
const ContextMenuRadioGroup = BaseContextMenu.RadioGroup;
const ContextMenuSub = BaseContextMenu.SubmenuRoot;

interface ContextMenuItemProps extends React.ComponentPropsWithoutRef<typeof BaseContextMenu.Item> {
  /** Adds left inset spacing to match grouped menu items. */
  inset?: boolean;
  /**
   * Renders the first child as the interactive element.
   * Maps to Base UI's `render` prop.
   */
  /** @deprecated Prefer Base UI's `render` prop. */

  asChild?: boolean;
}

const ContextMenuTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.Trigger> & {asChild?: boolean}
>(({asChild = false, children, className, ...props}, ref) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseContextMenu.Trigger
        ref={ref}
        className={className}
        render={children as React.ReactElement}
        {...props}
      />
    );
  }

  return (
    <BaseContextMenu.Trigger
      ref={ref}
      className={className}
      {...props}>
      {children}
    </BaseContextMenu.Trigger>
  );
});
ContextMenuTrigger.displayName = "ContextMenuTrigger";

const ContextMenuSubTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.SubmenuTrigger> & {inset?: boolean}
>(({className, inset = false, children, ...props}, ref) => (
  <BaseContextMenu.SubmenuTrigger
    ref={ref}
    className={cn(styles.item, styles.subTrigger, inset && styles.inset, className)}
    {...props}>
    {children}
    <ChevronRight className={styles.subTriggerIcon} />
  </BaseContextMenu.SubmenuTrigger>
));
ContextMenuSubTrigger.displayName = "ContextMenuSubTrigger";

const ContextMenuSubContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseContextMenu.Positioner>>(
  ({className, children, ...props}, ref) => (
    <BaseContextMenu.Positioner
      className={styles.positioner}
      {...props}>
      <BaseContextMenu.Popup
        ref={ref}
        className={cn(styles.content, className)}>
        {children}
      </BaseContextMenu.Popup>
    </BaseContextMenu.Positioner>
  ),
);
ContextMenuSubContent.displayName = "ContextMenuSubContent";

const ContextMenuContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseContextMenu.Positioner>>(
  ({className, children, ...props}, ref) => (
    <ContextMenuPortal>
      <BaseContextMenu.Positioner
        className={styles.positioner}
        {...props}>
        <BaseContextMenu.Popup
          ref={ref}
          className={cn(styles.content, className)}>
          {children}
        </BaseContextMenu.Popup>
      </BaseContextMenu.Positioner>
    </ContextMenuPortal>
  ),
);
ContextMenuContent.displayName = "ContextMenuContent";

const ContextMenuItem = React.forwardRef<HTMLDivElement, ContextMenuItemProps>(
  ({asChild = false, className, inset = false, children, ...props}, ref) => {
    const composedClassName = cn(styles.item, inset && styles.inset, className);

    if (asChild && React.isValidElement(children)) {
      return (
        <BaseContextMenu.Item
          ref={ref}
          className={composedClassName}
          render={children as React.ReactElement}
          {...props}
        />
      );
    }

    return (
      <BaseContextMenu.Item
        ref={ref}
        className={composedClassName}
        {...props}>
        {children}
      </BaseContextMenu.Item>
    );
  },
);
ContextMenuItem.displayName = "ContextMenuItem";

const ContextMenuCheckboxItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseContextMenu.CheckboxItem>>(
  ({className, children, ...props}, ref) => (
    <BaseContextMenu.CheckboxItem
      ref={ref}
      className={cn(styles.item, styles.indicatorItem, className)}
      {...props}>
      <span className={styles.indicatorSlot}>
        <BaseContextMenu.CheckboxItemIndicator>
          <Check className={styles.indicatorIcon} />
        </BaseContextMenu.CheckboxItemIndicator>
      </span>
      {children}
    </BaseContextMenu.CheckboxItem>
  ),
);
ContextMenuCheckboxItem.displayName = "ContextMenuCheckboxItem";

const ContextMenuRadioItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseContextMenu.RadioItem>>(
  ({className, children, ...props}, ref) => (
    <BaseContextMenu.RadioItem
      ref={ref}
      className={cn(styles.item, styles.indicatorItem, className)}
      {...props}>
      <span className={styles.indicatorSlot}>
        <BaseContextMenu.RadioItemIndicator>
          <Circle className={styles.radioIndicatorIcon} />
        </BaseContextMenu.RadioItemIndicator>
      </span>
      {children}
    </BaseContextMenu.RadioItem>
  ),
);
ContextMenuRadioItem.displayName = "ContextMenuRadioItem";

const ContextMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseContextMenu.GroupLabel> & {inset?: boolean}
>(({className, inset = false, ...props}, ref) => (
  <BaseContextMenu.GroupLabel
    ref={ref}
    className={cn(styles.label, inset && styles.inset, className)}
    {...props}
  />
));
ContextMenuLabel.displayName = "ContextMenuLabel";

const ContextMenuSeparator = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseContextMenu.Separator>>(
  ({className, ...props}, ref) => (
    <BaseContextMenu.Separator
      ref={ref}
      className={cn(styles.separator, className)}
      {...props}
    />
  ),
);
ContextMenuSeparator.displayName = "ContextMenuSeparator";

const ContextMenuShortcut = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({className, ...props}, ref) => (
  <span
    ref={ref}
    className={cn(styles.shortcut, className)}
    {...props}
  />
));
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
