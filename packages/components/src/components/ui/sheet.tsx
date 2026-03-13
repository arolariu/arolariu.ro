"use client";

import {Dialog as BaseDialog} from "@base-ui/react/dialog";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import {X} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./sheet.module.css";

export type SheetSide = "top" | "right" | "bottom" | "left";

interface SheetProps extends React.ComponentPropsWithRef<typeof BaseDialog.Root> {}

interface SheetTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Trigger>, "className"> {
  className?: string;
  /** @deprecated Prefer Base UI's `render` prop. */
  asChild?: boolean;
}

interface SheetOverlayProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Backdrop>, "className"> {
  className?: string;
}

export interface SheetContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Popup>, "className"> {
  className?: string;
  side?: SheetSide;
}

interface SheetHeaderProps extends React.ComponentPropsWithRef<"div"> {
  className?: string;
  render?: useRender.RenderProp<Record<string, never>>;
  asChild?: boolean;
}

interface SheetFooterProps extends React.ComponentPropsWithRef<"div"> {
  className?: string;
  render?: useRender.RenderProp<Record<string, never>>;
  asChild?: boolean;
}

interface SheetTitleProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Title>, "className"> {
  className?: string;
}

interface SheetDescriptionProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Description>, "className"> {
  className?: string;
}

function Sheet(props: Readonly<Sheet.Props>): React.ReactElement {
  return <BaseDialog.Root {...props} />;
}

const SheetPortal = BaseDialog.Portal;
const SheetClose = BaseDialog.Close;

function SheetTrigger(props: Readonly<SheetTrigger.Props>): React.ReactElement {
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

function SheetOverlay(props: Readonly<SheetOverlay.Props>): React.ReactElement {
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

function SheetContent(props: Readonly<SheetContent.Props>): React.ReactElement {
  const {className, children, render, side = "right", ...otherProps} = props;

  return (
    <SheetPortal>
      <SheetOverlay />
      <BaseDialog.Popup
        {...otherProps}
        render={useRender({
          defaultTagName: "div",
          render: render as never,
          props: mergeProps({className: cn(styles.popup, styles[side], className)}, {}),
        })}>
        <BaseDialog.Close
          aria-label='Close'
          className={styles.close}>
          <X className={styles.closeIcon} />
        </BaseDialog.Close>
        {children}
      </BaseDialog.Popup>
    </SheetPortal>
  );
}

function SheetHeader(props: Readonly<SheetHeader.Props>): React.ReactElement {
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

function SheetFooter(props: Readonly<SheetFooter.Props>): React.ReactElement {
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

function SheetTitle(props: Readonly<SheetTitle.Props>): React.ReactElement {
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

function SheetDescription(props: Readonly<SheetDescription.Props>): React.ReactElement {
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
namespace Sheet {
  export type Props = SheetProps;
  export type State = BaseDialog.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SheetTrigger {
  export type Props = SheetTriggerProps;
  export type State = BaseDialog.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SheetOverlay {
  export type Props = SheetOverlayProps;
  export type State = BaseDialog.Backdrop.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SheetContent {
  export type Props = SheetContentProps;
  export type State = BaseDialog.Popup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SheetHeader {
  export type Props = SheetHeaderProps;
  export type State = Record<string, never>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SheetFooter {
  export type Props = SheetFooterProps;
  export type State = Record<string, never>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SheetTitle {
  export type Props = SheetTitleProps;
  export type State = BaseDialog.Title.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SheetDescription {
  export type Props = SheetDescriptionProps;
  export type State = BaseDialog.Description.State;
}

export {Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger};
