"use client";

import {Dialog as BaseDialog} from "@base-ui/react/dialog";
import {X} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./sheet.module.css";

export type SheetSide = "top" | "right" | "bottom" | "left";

const Sheet = BaseDialog.Root;
const SheetPortal = BaseDialog.Portal;
const SheetClose = BaseDialog.Close;

const SheetTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Trigger> & {asChild?: boolean}>(
  ({asChild = false, children, className, ...props}, ref) => {
    if (asChild && React.isValidElement(children)) {
      return (
        <BaseDialog.Trigger
          ref={ref}
          className={className}
          render={children as React.ReactElement}
          {...props}
        />
      );
    }

    return (
      <BaseDialog.Trigger
        ref={ref}
        className={className}
        {...props}>
        {children}
      </BaseDialog.Trigger>
    );
  },
);
SheetTrigger.displayName = "SheetTrigger";

const SheetOverlay = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop>>(
  ({className, ...props}, ref) => (
    <BaseDialog.Backdrop
      ref={ref}
      className={cn(styles.backdrop, className)}
      {...props}
    />
  ),
);
SheetOverlay.displayName = "SheetOverlay";

export interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof BaseDialog.Popup> {
  side?: SheetSide;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(({className, children, side = "right", ...props}, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <BaseDialog.Popup
      ref={ref}
      className={cn(styles.popup, styles[side], className)}
      {...props}>
      <BaseDialog.Close
        className={styles.close}
        aria-label='Close'>
        <X className={styles.closeIcon} />
      </BaseDialog.Close>
      {children}
    </BaseDialog.Popup>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.header, className)}
    {...props}
  />
));
SheetHeader.displayName = "SheetHeader";

const SheetFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.footer, className)}
    {...props}
  />
));
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Title>>(
  ({className, ...props}, ref) => (
    <BaseDialog.Title
      ref={ref}
      className={cn(styles.title, className)}
      {...props}
    />
  ),
);
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Description>>(
  ({className, ...props}, ref) => (
    <BaseDialog.Description
      ref={ref}
      className={cn(styles.description, className)}
      {...props}
    />
  ),
);
SheetDescription.displayName = "SheetDescription";

export {Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger};
