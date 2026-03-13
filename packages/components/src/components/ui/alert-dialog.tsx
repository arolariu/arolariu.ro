"use client";

import {AlertDialog as BaseAlertDialog} from "@base-ui/react/alert-dialog";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./alert-dialog.module.css";
import buttonStyles from "./button.module.css";

const AlertDialog = BaseAlertDialog.Root;

const AlertDialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Trigger> & {asChild?: boolean}
>(({asChild = false, children, className, ...props}, ref) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseAlertDialog.Trigger
        ref={ref}
        className={className}
        render={children as React.ReactElement}
        {...props}
      />
    );
  }

  return (
    <BaseAlertDialog.Trigger
      ref={ref}
      className={className}
      {...props}>
      {children}
    </BaseAlertDialog.Trigger>
  );
});
AlertDialogTrigger.displayName = "AlertDialogTrigger";

const AlertDialogPortal = BaseAlertDialog.Portal;

const AlertDialogOverlay = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Backdrop>>(
  ({className, ...props}, ref) => (
    <BaseAlertDialog.Backdrop
      ref={ref}
      className={cn(styles.backdrop, className)}
      {...props}
    />
  ),
);
AlertDialogOverlay.displayName = "AlertDialogOverlay";

const AlertDialogContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Popup>>(
  ({className, children, ...props}, ref) => (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <BaseAlertDialog.Popup
        ref={ref}
        className={cn(styles.popup, className)}
        {...props}>
        {children}
      </BaseAlertDialog.Popup>
    </AlertDialogPortal>
  ),
);
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.header, className)}
    {...props}
  />
));
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.footer, className)}
    {...props}
  />
));
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Title>>(
  ({className, ...props}, ref) => (
    <BaseAlertDialog.Title
      ref={ref}
      className={cn(styles.title, className)}
      {...props}
    />
  ),
);
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Description>>(
  ({className, ...props}, ref) => (
    <BaseAlertDialog.Description
      ref={ref}
      className={cn(styles.description, className)}
      {...props}
    />
  ),
);
AlertDialogDescription.displayName = "AlertDialogDescription";

const AlertDialogAction = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Close>>(
  ({className, ...props}, ref) => (
    <BaseAlertDialog.Close
      ref={ref}
      className={cn(buttonStyles.button, buttonStyles.default, buttonStyles.sizeDefault, className)}
      {...props}
    />
  ),
);
AlertDialogAction.displayName = "AlertDialogAction";

const AlertDialogCancel = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseAlertDialog.Close>>(
  ({className, ...props}, ref) => (
    <BaseAlertDialog.Close
      ref={ref}
      className={cn(buttonStyles.button, buttonStyles.outline, buttonStyles.sizeDefault, styles.cancel, className)}
      {...props}
    />
  ),
);
AlertDialogCancel.displayName = "AlertDialogCancel";

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
