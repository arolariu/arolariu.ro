"use client";

import {Dialog as BaseDialog} from "@base-ui/react/dialog";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./dialog.module.css";

const Dialog = BaseDialog.Root;

const DialogTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Trigger> & {asChild?: boolean}>(
  ({asChild = false, children, ...props}, ref) => {
    if (asChild && React.isValidElement(children)) {
      return (
        <BaseDialog.Trigger
          ref={ref}
          render={children as React.ReactElement}
          {...props}
        />
      );
    }

    return (
      <BaseDialog.Trigger
        ref={ref}
        {...props}>
        {children}
      </BaseDialog.Trigger>
    );
  },
);
DialogTrigger.displayName = "DialogTrigger";

const DialogPortal = BaseDialog.Portal;

const DialogClose = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Close>>(
  ({className, ...props}, ref) => (
    <BaseDialog.Close
      ref={ref}
      className={cn(styles.close, className)}
      {...props}
    />
  ),
);
DialogClose.displayName = "DialogClose";

const DialogOverlay = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop>>(
  ({className, ...props}, ref) => (
    <BaseDialog.Backdrop
      ref={ref}
      className={cn(styles.backdrop, className)}
      {...props}
    />
  ),
);
DialogOverlay.displayName = "DialogOverlay";

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Popup> & {children?: React.ReactNode}
>(({className, children, ...props}, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <BaseDialog.Popup
      ref={ref}
      className={cn(styles.popup, className)}
      {...props}>
      {children}
    </BaseDialog.Popup>
  </DialogPortal>
));
DialogContent.displayName = "DialogContent";

const DialogHeader = ({className, ...props}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(styles.header, className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({className, ...props}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(styles.footer, className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Title>>(
  ({className, ...props}, ref) => (
    <BaseDialog.Title
      ref={ref}
      className={cn(styles.title, className)}
      {...props}
    />
  ),
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<typeof BaseDialog.Description>>(
  ({className, ...props}, ref) => (
    <BaseDialog.Description
      ref={ref}
      className={cn(styles.description, className)}
      {...props}
    />
  ),
);
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
