"use client";

import {Dialog as BaseDialog} from "@base-ui/react/dialog";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./dialog.module.css";

interface DialogProps extends React.ComponentPropsWithRef<typeof BaseDialog.Root> {}

interface DialogTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Trigger>, "className"> {
  /** Additional CSS classes merged with the dialog trigger styles. @default undefined */
  className?: string;
  /** Backward-compatible child-slot API that maps the child element to `render`. @default false @deprecated Prefer Base UI's `render` prop. */
  asChild?: boolean;
}

interface DialogCloseProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Close>, "className"> {
  /** Additional CSS classes merged with the dialog close control styles. @default undefined */
  className?: string;
}

interface DialogOverlayProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Backdrop>, "className"> {
  /** Additional CSS classes merged with the dialog backdrop styles. @default undefined */
  className?: string;
}

interface DialogContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Popup>, "className"> {
  /** Additional CSS classes merged with the dialog content styles. @default undefined */
  className?: string;
}

interface DialogHeaderProps extends React.ComponentPropsWithRef<"div"> {
  /** Additional CSS classes merged with the dialog header layout styles. @default undefined */
  className?: string;
  /** Custom element or render callback used to replace the default header container. @default undefined */
  render?: useRender.RenderProp<Record<string, never>>;
  /** Backward-compatible child-slot API that maps the child element to `render`. @default false @deprecated Prefer the `render` prop. */
  asChild?: boolean;
}

interface DialogFooterProps extends React.ComponentPropsWithRef<"div"> {
  /** Additional CSS classes merged with the dialog footer layout styles. @default undefined */
  className?: string;
  /** Custom element or render callback used to replace the default footer container. @default undefined */
  render?: useRender.RenderProp<Record<string, never>>;
  /** Backward-compatible child-slot API that maps the child element to `render`. @default false @deprecated Prefer the `render` prop. */
  asChild?: boolean;
}

interface DialogTitleProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Title>, "className"> {
  /** Additional CSS classes merged with the dialog title styles. @default undefined */
  className?: string;
}

interface DialogDescriptionProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Description>, "className"> {
  /** Additional CSS classes merged with the dialog description styles. @default undefined */
  className?: string;
}

/**
 * Coordinates modal dialog state, focus management, and accessibility semantics.
 *
 * @remarks
 * - Renders no DOM element by default and coordinates descendant dialog parts
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports composition through descendant `render` props
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Dialog>
 *   <DialogTrigger>Open</DialogTrigger>
 *   <DialogContent>
 *     <DialogTitle>Details</DialogTitle>
 *   </DialogContent>
 * </Dialog>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
function Dialog(props: Readonly<Dialog.Props>): React.ReactElement {
  return <BaseDialog.Root {...props} />;
}
Dialog.displayName = "Dialog";

/**
 * Opens the dialog from an interactive trigger element.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <DialogTrigger>Open</DialogTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
function DialogTrigger(props: Readonly<DialogTrigger.Props>): React.ReactElement {
  const {asChild = false, children, className, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return (
    <BaseDialog.Trigger
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: renderProp as never,
        props: mergeProps({className}, {}),
      })}>
      {renderProp ? undefined : children}
    </BaseDialog.Trigger>
  );
}
DialogTrigger.displayName = "DialogTrigger";

/**
 * Portals dialog descendants outside the local DOM hierarchy.
 *
 * @remarks
 * - Renders no DOM element by default and portals descendants into the document body
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Does not expose a `render` prop because it only controls mounting context
 * - Styling via CSS Modules with `--ac-*` custom properties through descendant components
 *
 * @example Basic usage
 * ```tsx
 * <DialogPortal>
 *   <DialogOverlay />
 *   <DialogContent />
 * </DialogPortal>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
const DialogPortal = BaseDialog.Portal;
DialogPortal.displayName = "DialogPortal";

/**
 * Closes the dialog from an interactive control inside the modal.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <DialogClose>Dismiss</DialogClose>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
function DialogClose(props: Readonly<DialogClose.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseDialog.Close
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps({className: cn(styles.close, className)}, {}),
      })}>
      {children}
    </BaseDialog.Close>
  );
}
DialogClose.displayName = "DialogClose";

/**
 * Renders the dimmed backdrop behind dialog content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <DialogOverlay />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
function DialogOverlay(props: Readonly<DialogOverlay.Props>): React.ReactElement {
  const {className, render, ...otherProps} = props;

  return (
    <BaseDialog.Backdrop
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.backdrop, className)}, {}),
      })}
    />
  );
}
DialogOverlay.displayName = "DialogOverlay";

/**
 * Renders the dialog popup inside a portal with its backdrop.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <DialogContent>
 *   <DialogTitle>Details</DialogTitle>
 * </DialogContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
function DialogContent(props: Readonly<DialogContent.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <DialogPortal>
      <DialogOverlay />
      <BaseDialog.Popup
        {...otherProps}
        render={useRender({
          defaultTagName: "div",
          render: render as never,
          props: mergeProps({className: cn(styles.popup, className)}, {}),
        })}>
        {children}
      </BaseDialog.Popup>
    </DialogPortal>
  );
}
DialogContent.displayName = "DialogContent";

/**
 * Lays out the title and supporting content at the top of a dialog.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <DialogHeader>
 *   <DialogTitle>Details</DialogTitle>
 * </DialogHeader>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
function DialogHeader(props: Readonly<DialogHeader.Props>): React.ReactElement {
  const {asChild = false, children, className, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return useRender({
    defaultTagName: "div",
    render: renderProp as never,
    props: mergeProps({className: cn(styles.header, className)}, otherProps, {
      children: renderProp ? undefined : children,
    }),
  });
}
DialogHeader.displayName = "DialogHeader";

/**
 * Lays out dialog actions and secondary controls at the bottom edge.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <DialogFooter>
 *   <DialogClose>Close</DialogClose>
 * </DialogFooter>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
function DialogFooter(props: Readonly<DialogFooter.Props>): React.ReactElement {
  const {asChild = false, children, className, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return useRender({
    defaultTagName: "div",
    render: renderProp as never,
    props: mergeProps({className: cn(styles.footer, className)}, otherProps, {
      children: renderProp ? undefined : children,
    }),
  });
}
DialogFooter.displayName = "DialogFooter";

/**
 * Renders the accessible heading for dialog content.
 *
 * @remarks
 * - Renders an `<h2>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <DialogTitle>Details</DialogTitle>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
function DialogTitle(props: Readonly<DialogTitle.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseDialog.Title
      {...otherProps}
      render={useRender({
        defaultTagName: "h2",
        render: render as never,
        props: mergeProps({className: cn(styles.title, className)}, {}),
      })}>
      {children}
    </BaseDialog.Title>
  );
}
DialogTitle.displayName = "DialogTitle";

/**
 * Renders supporting copy beneath the dialog title.
 *
 * @remarks
 * - Renders a `<p>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <DialogDescription>Review the details before continuing.</DialogDescription>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
function DialogDescription(props: Readonly<DialogDescription.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseDialog.Description
      {...otherProps}
      render={useRender({
        defaultTagName: "p",
        render: render as never,
        props: mergeProps({className: cn(styles.description, className)}, {}),
      })}>
      {children}
    </BaseDialog.Description>
  );
}
DialogDescription.displayName = "DialogDescription";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Dialog {
  export type Props = DialogProps;
  export type State = BaseDialog.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DialogTrigger {
  export type Props = DialogTriggerProps;
  export type State = BaseDialog.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DialogClose {
  export type Props = DialogCloseProps;
  export type State = BaseDialog.Close.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DialogOverlay {
  export type Props = DialogOverlayProps;
  export type State = BaseDialog.Backdrop.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DialogContent {
  export type Props = DialogContentProps;
  export type State = BaseDialog.Popup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DialogHeader {
  export type Props = DialogHeaderProps;
  export type State = Record<string, never>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DialogFooter {
  export type Props = DialogFooterProps;
  export type State = Record<string, never>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DialogTitle {
  export type Props = DialogTitleProps;
  export type State = BaseDialog.Title.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DialogDescription {
  export type Props = DialogDescriptionProps;
  export type State = BaseDialog.Description.State;
}

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
