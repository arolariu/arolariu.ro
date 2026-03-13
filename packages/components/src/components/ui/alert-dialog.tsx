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
  /** Additional CSS classes merged with the alert-dialog trigger styles. @default undefined */
  className?: string;
  /** Backward-compatible child-slot API that maps the child element to `render`. @default false @deprecated Prefer Base UI's `render` prop. */
  asChild?: boolean;
}

interface AlertDialogOverlayProps extends Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Backdrop>, "className"> {
  /** Additional CSS classes merged with the alert-dialog backdrop styles. @default undefined */
  className?: string;
}

interface AlertDialogContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Popup>, "className"> {
  /** Additional CSS classes merged with the alert-dialog popup styles. @default undefined */
  className?: string;
}

interface AlertDialogHeaderProps extends React.ComponentPropsWithRef<"div"> {
  /** Additional CSS classes merged with the alert-dialog header layout styles. @default undefined */
  className?: string;
  /** Custom element or render callback used to replace the default header container. @default undefined */
  render?: useRender.RenderProp<Record<string, never>>;
  /** Backward-compatible child-slot API that maps the child element to `render`. @default false @deprecated Prefer the `render` prop. */
  asChild?: boolean;
}

interface AlertDialogFooterProps extends React.ComponentPropsWithRef<"div"> {
  /** Additional CSS classes merged with the alert-dialog footer layout styles. @default undefined */
  className?: string;
  /** Custom element or render callback used to replace the default footer container. @default undefined */
  render?: useRender.RenderProp<Record<string, never>>;
  /** Backward-compatible child-slot API that maps the child element to `render`. @default false @deprecated Prefer the `render` prop. */
  asChild?: boolean;
}

interface AlertDialogTitleProps extends Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Title>, "className"> {
  /** Additional CSS classes merged with the alert-dialog title styles. @default undefined */
  className?: string;
}

interface AlertDialogDescriptionProps extends Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Description>, "className"> {
  /** Additional CSS classes merged with the alert-dialog description styles. @default undefined */
  className?: string;
}

interface AlertDialogActionProps extends Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Close>, "className"> {
  /** Additional CSS classes merged with the primary action button styles. @default undefined */
  className?: string;
}

interface AlertDialogCancelProps extends Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Close>, "className"> {
  /** Additional CSS classes merged with the cancel action button styles. @default undefined */
  className?: string;
}

/**
 * Coordinates destructive confirmation dialogs with modal accessibility behavior.
 *
 * @remarks
 * - Renders no DOM element by default and coordinates descendant alert-dialog parts
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Supports composition through descendant `render` props
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AlertDialog>
 *   <AlertDialogTrigger>Delete</AlertDialogTrigger>
 *   <AlertDialogContent>
 *     <AlertDialogTitle>Are you sure?</AlertDialogTitle>
 *   </AlertDialogContent>
 * </AlertDialog>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
 */
function AlertDialog(props: Readonly<AlertDialog.Props>): React.ReactElement {
  return <BaseAlertDialog.Root {...props} />;
}
AlertDialog.displayName = "AlertDialog";

/**
 * Opens the alert dialog from an interactive trigger element.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AlertDialogTrigger>Delete</AlertDialogTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
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
AlertDialogTrigger.displayName = "AlertDialogTrigger";

/**
 * Portals alert-dialog descendants outside the local DOM hierarchy.
 *
 * @remarks
 * - Renders no DOM element by default and portals descendants into the document body
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Does not expose a `render` prop because it only controls mounting context
 * - Styling via CSS Modules with `--ac-*` custom properties through descendant components
 *
 * @example Basic usage
 * ```tsx
 * <AlertDialogPortal>
 *   <AlertDialogOverlay />
 *   <AlertDialogContent />
 * </AlertDialogPortal>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
 */
const AlertDialogPortal = BaseAlertDialog.Portal;
AlertDialogPortal.displayName = "AlertDialogPortal";

/**
 * Renders the dimmed backdrop behind the alert dialog popup.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AlertDialogOverlay />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
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
AlertDialogOverlay.displayName = "AlertDialogOverlay";

/**
 * Renders the alert dialog popup inside a portal with its backdrop.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AlertDialogContent>
 *   <AlertDialogTitle>Are you sure?</AlertDialogTitle>
 * </AlertDialogContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
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
AlertDialogContent.displayName = "AlertDialogContent";

/**
 * Lays out the alert dialog heading and supporting content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AlertDialogHeader>
 *   <AlertDialogTitle>Are you sure?</AlertDialogTitle>
 * </AlertDialogHeader>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
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
AlertDialogHeader.displayName = "AlertDialogHeader";

/**
 * Lays out confirmation and dismissal actions at the bottom edge.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AlertDialogFooter>
 *   <AlertDialogCancel>Cancel</AlertDialogCancel>
 * </AlertDialogFooter>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
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
AlertDialogFooter.displayName = "AlertDialogFooter";

/**
 * Renders the accessible heading for alert dialog content.
 *
 * @remarks
 * - Renders an `<h2>` element by default
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AlertDialogTitle>Are you sure?</AlertDialogTitle>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
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
AlertDialogTitle.displayName = "AlertDialogTitle";

/**
 * Renders supporting copy beneath the alert dialog title.
 *
 * @remarks
 * - Renders a `<p>` element by default
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
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
AlertDialogDescription.displayName = "AlertDialogDescription";

/**
 * Renders the primary confirmation action inside the alert dialog.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AlertDialogAction>Continue</AlertDialogAction>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
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
AlertDialogAction.displayName = "AlertDialogAction";

/**
 * Renders the secondary dismissal action inside the alert dialog.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AlertDialogCancel>Cancel</AlertDialogCancel>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
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
AlertDialogCancel.displayName = "AlertDialogCancel";

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
