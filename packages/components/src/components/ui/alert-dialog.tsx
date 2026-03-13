"use client";

import {AlertDialog as BaseAlertDialog} from "@base-ui/react/alert-dialog";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./alert-dialog.module.css";
import buttonStyles from "./button.module.css";

interface AlertDialogProps extends React.ComponentPropsWithRef<typeof BaseAlertDialog.Root> {}

interface AlertDialogTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Trigger>, "className"> {
  className?: string;
  /** @deprecated Prefer Base UI's `render` prop. */
  asChild?: boolean;
}

interface AlertDialogOverlayProps extends Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Backdrop>, "className"> {
  className?: string;
}

interface AlertDialogContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Popup>, "className"> {
  className?: string;
}

interface AlertDialogHeaderProps extends React.ComponentPropsWithRef<"div"> {
  className?: string;
  render?: useRender.RenderProp<Record<string, never>>;
  /** @deprecated Prefer the `render` prop. */
  asChild?: boolean;
}

interface AlertDialogFooterProps extends React.ComponentPropsWithRef<"div"> {
  className?: string;
  render?: useRender.RenderProp<Record<string, never>>;
  /** @deprecated Prefer the `render` prop. */
  asChild?: boolean;
}

interface AlertDialogTitleProps extends Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Title>, "className"> {
  className?: string;
}

interface AlertDialogDescriptionProps extends Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Description>, "className"> {
  className?: string;
}

interface AlertDialogActionProps extends Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Close>, "className"> {
  className?: string;
}

interface AlertDialogCancelProps extends Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Close>, "className"> {
  className?: string;
}

/**
 * Coordinates alert-dialog state and accessibility behavior.
 */
function AlertDialog(props: Readonly<AlertDialog.Props>): React.ReactElement {
  return <BaseAlertDialog.Root {...props} />;
}

/**
 * Renders the alert-dialog trigger.
 */
function AlertDialogTrigger(props: Readonly<AlertDialogTrigger.Props>): React.ReactElement {
  const {asChild = false, children, className, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return (
    <BaseAlertDialog.Trigger
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: renderProp as never,
        props: mergeProps({className}, {}),
      })}>
      {renderProp ? undefined : children}
    </BaseAlertDialog.Trigger>
  );
}

const AlertDialogPortal = BaseAlertDialog.Portal;

/**
 * Renders the alert-dialog backdrop.
 */
function AlertDialogOverlay(props: Readonly<AlertDialogOverlay.Props>): React.ReactElement {
  const {className, render, ...otherProps} = props;

  return (
    <BaseAlertDialog.Backdrop
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.backdrop, className)}, {}),
      })}
    />
  );
}

/**
 * Renders the alert-dialog popup with portal and overlay composition.
 */
function AlertDialogContent(props: Readonly<AlertDialogContent.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <BaseAlertDialog.Popup
        {...otherProps}
        render={useRender({
          defaultTagName: "div",
          render: render as never,
          props: mergeProps({className: cn(styles.popup, className)}, {}),
        })}>
        {children}
      </BaseAlertDialog.Popup>
    </AlertDialogPortal>
  );
}

/**
 * Renders the alert-dialog header layout.
 */
function AlertDialogHeader(props: Readonly<AlertDialogHeader.Props>): React.ReactElement {
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

/**
 * Renders the alert-dialog footer layout.
 */
function AlertDialogFooter(props: Readonly<AlertDialogFooter.Props>): React.ReactElement {
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

/**
 * Renders the alert-dialog title.
 */
function AlertDialogTitle(props: Readonly<AlertDialogTitle.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseAlertDialog.Title
      {...otherProps}
      render={useRender({
        defaultTagName: "h2",
        render: render as never,
        props: mergeProps({className: cn(styles.title, className)}, {}),
      })}>
      {children}
    </BaseAlertDialog.Title>
  );
}

/**
 * Renders the alert-dialog description.
 */
function AlertDialogDescription(props: Readonly<AlertDialogDescription.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseAlertDialog.Description
      {...otherProps}
      render={useRender({
        defaultTagName: "p",
        render: render as never,
        props: mergeProps({className: cn(styles.description, className)}, {}),
      })}>
      {children}
    </BaseAlertDialog.Description>
  );
}

/**
 * Renders the primary alert-dialog action button.
 */
function AlertDialogAction(props: Readonly<AlertDialogAction.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseAlertDialog.Close
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps(
          {
            className: cn(buttonStyles.button, buttonStyles.default, buttonStyles.sizeDefault, className),
          },
          {},
        ),
      })}>
      {children}
    </BaseAlertDialog.Close>
  );
}

/**
 * Renders the secondary alert-dialog cancel button.
 */
function AlertDialogCancel(props: Readonly<AlertDialogCancel.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseAlertDialog.Close
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps(
          {
            className: cn(buttonStyles.button, buttonStyles.outline, buttonStyles.sizeDefault, styles.cancel, className),
          },
          {},
        ),
      })}>
      {children}
    </BaseAlertDialog.Close>
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AlertDialog {
  export type Props = AlertDialogProps;
  export type State = BaseAlertDialog.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AlertDialogTrigger {
  export type Props = AlertDialogTriggerProps;
  export type State = BaseAlertDialog.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AlertDialogOverlay {
  export type Props = AlertDialogOverlayProps;
  export type State = BaseAlertDialog.Backdrop.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AlertDialogContent {
  export type Props = AlertDialogContentProps;
  export type State = BaseAlertDialog.Popup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AlertDialogHeader {
  export type Props = AlertDialogHeaderProps;
  export type State = Record<string, never>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AlertDialogFooter {
  export type Props = AlertDialogFooterProps;
  export type State = Record<string, never>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AlertDialogTitle {
  export type Props = AlertDialogTitleProps;
  export type State = BaseAlertDialog.Title.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AlertDialogDescription {
  export type Props = AlertDialogDescriptionProps;
  export type State = BaseAlertDialog.Description.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AlertDialogAction {
  export type Props = AlertDialogActionProps;
  export type State = BaseAlertDialog.Close.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AlertDialogCancel {
  export type Props = AlertDialogCancelProps;
  export type State = BaseAlertDialog.Close.State;
}

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
