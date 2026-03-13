"use client";

import {Dialog as BaseDialog} from "@base-ui/react/dialog";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./dialog.module.css";

interface DialogProps extends React.ComponentPropsWithRef<typeof BaseDialog.Root> {}

interface DialogTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Trigger>, "className"> {
  className?: string;
  /** @deprecated Prefer Base UI's `render` prop. */
  asChild?: boolean;
}

interface DialogCloseProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Close>, "className"> {
  className?: string;
}

interface DialogOverlayProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Backdrop>, "className"> {
  className?: string;
}

interface DialogContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Popup>, "className"> {
  className?: string;
}

interface DialogHeaderProps extends React.ComponentPropsWithRef<"div"> {
  className?: string;
  render?: useRender.RenderProp<Record<string, never>>;
  /** @deprecated Prefer the `render` prop. */
  asChild?: boolean;
}

interface DialogFooterProps extends React.ComponentPropsWithRef<"div"> {
  className?: string;
  render?: useRender.RenderProp<Record<string, never>>;
  /** @deprecated Prefer the `render` prop. */
  asChild?: boolean;
}

interface DialogTitleProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Title>, "className"> {
  className?: string;
}

interface DialogDescriptionProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Description>, "className"> {
  className?: string;
}

function Dialog(props: Readonly<Dialog.Props>): React.ReactElement {
  return <BaseDialog.Root {...props} />;
}

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

const DialogPortal = BaseDialog.Portal;

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
