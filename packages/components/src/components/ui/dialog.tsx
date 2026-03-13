"use client";

import {Dialog as BaseDialog} from "@base-ui/react/dialog";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./dialog.module.css";

/**
 * Represents the props forwarded to the Dialog root component.
 *
 * @remarks
 * Dialog forwards the full Base UI dialog root API, including controlled and
 * uncontrolled open-state props, while preserving compatibility with Base UI docs.
 */
interface DialogProps extends React.ComponentPropsWithoutRef<typeof BaseDialog.Root> {}

/**
 * Represents the configurable props for the DialogTrigger component.
 *
 * @remarks
 * Extends the Base UI trigger primitive and adds an `asChild` flag for rendering a
 * custom interactive element without extra DOM wrappers.
 *
 * @default asChild `false`
 */
interface DialogTriggerProps extends React.ComponentPropsWithoutRef<typeof BaseDialog.Trigger> {
  /**
   * When `true`, renders the provided child element as the trigger instead of the default button.
   *
   * @default false
   */
  asChild?: boolean;
}

/**
 * Represents the configurable props for the DialogClose component.
 *
 * @remarks
 * Extends the Base UI close primitive and documents the styling override used for the
 * library's close affordance.
 */
interface DialogCloseProps extends React.ComponentPropsWithoutRef<typeof BaseDialog.Close> {
  /**
   * Additional CSS classes merged with the close button styles.
   */
  className?: string;
}

/**
 * Represents the configurable props for the DialogOverlay component.
 *
 * @remarks
 * Extends the Base UI backdrop primitive and allows consumers to customize the overlay
 * appearance while retaining modal semantics.
 */
interface DialogOverlayProps extends React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop> {
  /**
   * Additional CSS classes merged with the backdrop styles.
   */
  className?: string;
}

/**
 * Represents the configurable props for the DialogContent component.
 *
 * @remarks
 * Extends the Base UI popup primitive and adds explicit documentation for the rendered
 * children and class override.
 */
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof BaseDialog.Popup> {
  /**
   * Additional CSS classes merged with the dialog surface styles.
   */
  className?: string;
  /**
   * The content rendered inside the dialog popup.
   */
  children?: React.ReactNode;
}

/**
 * Represents the configurable props for the DialogHeader component.
 *
 * @remarks
 * Extends native `<div>` attributes for presentational layout regions inside the dialog.
 */
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Additional CSS classes merged with the dialog header layout styles.
   */
  className?: string;
}

/**
 * Represents the configurable props for the DialogFooter component.
 *
 * @remarks
 * Extends native `<div>` attributes for action rows and aligned metadata within the dialog.
 */
interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Additional CSS classes merged with the dialog footer layout styles.
   */
  className?: string;
}

/**
 * Represents the configurable props for the DialogTitle component.
 *
 * @remarks
 * Extends the Base UI title primitive and exposes a class override for the visual heading.
 */
interface DialogTitleProps extends React.ComponentPropsWithoutRef<typeof BaseDialog.Title> {
  /**
   * Additional CSS classes merged with the dialog title styles.
   */
  className?: string;
}

/**
 * Represents the configurable props for the DialogDescription component.
 *
 * @remarks
 * Extends the Base UI description primitive and exposes a class override for supporting copy.
 */
interface DialogDescriptionProps extends React.ComponentPropsWithoutRef<typeof BaseDialog.Description> {
  /**
   * Additional CSS classes merged with the dialog description styles.
   */
  className?: string;
}

/**
 * A modal dialog root for coordinating open state, focus trapping, and accessibility.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * This component is a direct alias of the Base UI dialog root, so it supports the full
 * controlled and uncontrolled dialog API while pairing with the styled subcomponents in
 * this module.
 *
 * @example
 * ```tsx
 * <Dialog>
 *   <DialogTrigger>Open settings</DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Settings</DialogTitle>
 *       <DialogDescription>Manage your profile preferences.</DialogDescription>
 *     </DialogHeader>
 *   </DialogContent>
 * </Dialog>
 * ```
 *
 * @see {@link DialogContent}
 * @see {@link https://base-ui.com/react/components/dialog Base UI Dialog docs}
 */
const Dialog = BaseDialog.Root as React.ComponentType<DialogProps>;

/**
 * A trigger that opens the dialog when activated.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Renders the Base UI dialog trigger primitive. Set `asChild` to reuse an existing
 * button or link component as the activator without introducing nested buttons.
 *
 * @example
 * ```tsx
 * <DialogTrigger asChild>
 *   <button type="button">Edit profile</button>
 * </DialogTrigger>
 * ```
 *
 * @see {@link Dialog}
 * @see {@link https://base-ui.com/react/components/dialog Base UI Dialog docs}
 */
const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(({asChild = false, children, ...props}, ref) => {
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
});
DialogTrigger.displayName = "DialogTrigger";

/**
 * A portal that renders dialog layers outside the normal DOM flow.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * This is a direct alias of the Base UI dialog portal. Use it when advanced layouts
 * need custom control over where overlay and content nodes mount.
 *
 * @example
 * ```tsx
 * <DialogPortal>
 *   <DialogOverlay />
 *   <DialogContent>Custom portal placement</DialogContent>
 * </DialogPortal>
 * ```
 *
 * @see {@link DialogContent}
 * @see {@link https://base-ui.com/react/components/dialog Base UI Dialog docs}
 */
const DialogPortal = BaseDialog.Portal;

/**
 * A button-like control that closes the dialog when activated.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI close primitive and applies the library's close-button styling.
 * It can render text, icons, or custom children depending on the use case.
 *
 * @example
 * ```tsx
 * <DialogClose aria-label="Close dialog">×</DialogClose>
 * ```
 *
 * @see {@link Dialog}
 * @see {@link https://base-ui.com/react/components/dialog Base UI Dialog docs}
 */
const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(({className, ...props}, ref) => (
  <BaseDialog.Close
    ref={ref}
    className={cn(styles.close, className)}
    {...props}
  />
));
DialogClose.displayName = "DialogClose";

/**
 * A backdrop overlay rendered behind dialog content.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI backdrop primitive and applies the library's modal dimming styles
 * to visually separate dialog content from the underlying page.
 *
 * @example
 * ```tsx
 * <DialogOverlay className="backdrop-blur-sm" />
 * ```
 *
 * @see {@link DialogContent}
 * @see {@link https://base-ui.com/react/components/dialog Base UI Dialog docs}
 */
const DialogOverlay = React.forwardRef<HTMLDivElement, DialogOverlayProps>(({className, ...props}, ref) => (
  <BaseDialog.Backdrop
    ref={ref}
    className={cn(styles.backdrop, className)}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

/**
 * The styled dialog surface rendered inside a portal with an overlay.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * `DialogContent` automatically composes {@link DialogPortal} and {@link DialogOverlay}
 * before rendering the Base UI popup primitive, making it the default choice for most
 * modal dialogs in the design system.
 *
 * @example
 * ```tsx
 * <DialogContent>
 *   <DialogHeader>
 *     <DialogTitle>Delete project</DialogTitle>
 *     <DialogDescription>This action cannot be undone.</DialogDescription>
 *   </DialogHeader>
 * </DialogContent>
 * ```
 *
 * @see {@link DialogOverlay}
 * @see {@link https://base-ui.com/react/components/dialog Base UI Dialog docs}
 */
const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(({className, children, ...props}, ref) => (
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

/**
 * A layout wrapper for dialog titles, descriptions, and introductory content.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Renders a styled `<div>` that standardizes spacing for the top section of a dialog.
 * It is purely presentational and can contain any valid React children.
 *
 * @example
 * ```tsx
 * <DialogHeader>
 *   <DialogTitle>Share report</DialogTitle>
 *   <DialogDescription>Invite teammates to review the latest metrics.</DialogDescription>
 * </DialogHeader>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog Base UI Dialog docs}
 */
const DialogHeader = ({className, ...props}: Readonly<DialogHeaderProps>): React.JSX.Element => (
  <div
    className={cn(styles.header, className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/**
 * A layout wrapper for dialog actions and closing controls.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Renders a styled `<div>` optimized for action rows at the bottom of a dialog,
 * typically containing buttons aligned for confirmation or dismissal workflows.
 *
 * @example
 * ```tsx
 * <DialogFooter>
 *   <button type="button">Cancel</button>
 *   <button type="button">Continue</button>
 * </DialogFooter>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog Base UI Dialog docs}
 */
const DialogFooter = ({className, ...props}: Readonly<DialogFooterProps>): React.JSX.Element => (
  <div
    className={cn(styles.footer, className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

/**
 * The accessible heading announced as the dialog title.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI title primitive so assistive technologies can associate the title
 * with the active dialog while preserving the design system's typography.
 *
 * @example
 * ```tsx
 * <DialogTitle>Confirm export</DialogTitle>
 * ```
 *
 * @see {@link DialogDescription}
 * @see {@link https://base-ui.com/react/components/dialog Base UI Dialog docs}
 */
const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(({className, ...props}, ref) => (
  <BaseDialog.Title
    ref={ref}
    className={cn(styles.title, className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

/**
 * Supporting text that describes the dialog's purpose or consequences.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI description primitive so the dialog exposes a concise accessible
 * summary alongside the visible supporting copy.
 *
 * @example
 * ```tsx
 * <DialogDescription>Exports are generated as CSV files and emailed to you.</DialogDescription>
 * ```
 *
 * @see {@link DialogTitle}
 * @see {@link https://base-ui.com/react/components/dialog Base UI Dialog docs}
 */
const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(({className, ...props}, ref) => (
  <BaseDialog.Description
    ref={ref}
    className={cn(styles.description, className)}
    {...props}
  />
));
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
