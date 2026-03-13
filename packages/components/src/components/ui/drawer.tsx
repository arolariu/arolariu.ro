"use client";

import {Drawer as BaseDrawer} from "@base-ui/react/drawer";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./drawer.module.css";

const Drawer = BaseDrawer.Root;

const DrawerTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseDrawer.Trigger>>(
  ({className, ...props}, ref) => (
    <BaseDrawer.Trigger
      ref={ref}
      className={className}
      {...props}
    />
  ),
);
DrawerTrigger.displayName = "DrawerTrigger";

const DrawerPortal = BaseDrawer.Portal;
const DrawerClose = BaseDrawer.Close;

const DrawerOverlay = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseDrawer.Backdrop>>(
  ({className, ...props}, ref) => (
    <BaseDrawer.Backdrop
      ref={ref}
      className={cn(styles.backdrop, className)}
      {...props}
    />
  ),
);
DrawerOverlay.displayName = "DrawerOverlay";

const DrawerContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseDrawer.Popup>>(
  ({className, children, ...props}, ref) => (
    <DrawerPortal>
      <DrawerOverlay />
      <BaseDrawer.Popup
        ref={ref}
        className={cn(styles.popup, className)}
        {...props}>
        <div className={styles.handle} />
        <BaseDrawer.Content className={styles.content}>{children}</BaseDrawer.Content>
      </BaseDrawer.Popup>
    </DrawerPortal>
  ),
);
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.header, className)}
    {...props}
  />
));
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.footer, className)}
    {...props}
  />
));
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<typeof BaseDrawer.Title>>(
  ({className, ...props}, ref) => (
    <BaseDrawer.Title
      ref={ref}
      className={cn(styles.title, className)}
      {...props}
    />
  ),
);
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<typeof BaseDrawer.Description>>(
  ({className, ...props}, ref) => (
    <BaseDrawer.Description
      ref={ref}
      className={cn(styles.description, className)}
      {...props}
    />
  ),
);
DrawerDescription.displayName = "DrawerDescription";

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
