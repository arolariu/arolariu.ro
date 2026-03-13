"use client";

import {Menu as BaseMenu} from "@base-ui/react/menu";
import {Menubar as BaseMenubar} from "@base-ui/react/menubar";
import {Check, ChevronRight, Circle} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./menubar.module.css";

const MenubarMenu = BaseMenu.Root;
const MenubarGroup = BaseMenu.Group;
const MenubarPortal = BaseMenu.Portal;
const MenubarRadioGroup = BaseMenu.RadioGroup;
const MenubarSub = BaseMenu.SubmenuRoot;

const Menubar = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenubar>>(({className, ...props}, ref) => (
  <BaseMenubar
    ref={ref}
    className={cn(styles.root, className)}
    {...props}
  />
));
Menubar.displayName = "Menubar";

const MenubarTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseMenu.Trigger>>(
  ({className, ...props}, ref) => (
    <BaseMenu.Trigger
      ref={ref}
      className={cn(styles.trigger, className)}
      {...props}
    />
  ),
);
MenubarTrigger.displayName = "MenubarTrigger";

const MenubarSubTrigger = React.forwardRef<
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
MenubarSubTrigger.displayName = "MenubarSubTrigger";

const MenubarSubContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.Positioner>>(
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
MenubarSubContent.displayName = "MenubarSubContent";

const MenubarContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.Positioner>>(
  ({className, children, sideOffset = 8, alignOffset = -4, ...props}, ref) => (
    <MenubarPortal>
      <BaseMenu.Positioner
        className={styles.positioner}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        {...props}>
        <BaseMenu.Popup
          ref={ref}
          className={cn(styles.content, className)}>
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </MenubarPortal>
  ),
);
MenubarContent.displayName = "MenubarContent";

const MenubarItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.Item> & {inset?: boolean}>(
  ({className, inset = false, ...props}, ref) => (
    <BaseMenu.Item
      ref={ref}
      className={cn(styles.item, inset && styles.inset, className)}
      {...props}
    />
  ),
);
MenubarItem.displayName = "MenubarItem";

const MenubarCheckboxItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.CheckboxItem>>(
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
MenubarCheckboxItem.displayName = "MenubarCheckboxItem";

const MenubarRadioItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.RadioItem>>(
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
MenubarRadioItem.displayName = "MenubarRadioItem";

const MenubarLabel = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel> & {inset?: boolean}>(
  ({className, inset = false, ...props}, ref) => (
    <BaseMenu.GroupLabel
      ref={ref}
      className={cn(styles.label, inset && styles.inset, className)}
      {...props}
    />
  ),
);
MenubarLabel.displayName = "MenubarLabel";

const MenubarSeparator = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.Separator>>(
  ({className, ...props}, ref) => (
    <BaseMenu.Separator
      ref={ref}
      className={cn(styles.separator, className)}
      {...props}
    />
  ),
);
MenubarSeparator.displayName = "MenubarSeparator";

const MenubarShortcut = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({className, ...props}, ref) => (
  <span
    ref={ref}
    className={cn(styles.shortcut, className)}
    {...props}
  />
));
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
