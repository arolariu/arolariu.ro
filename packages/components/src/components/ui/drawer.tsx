"use client";

import {Drawer as BaseDrawer} from "@base-ui/react/drawer";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./drawer.module.css";

interface DrawerProps extends React.ComponentPropsWithRef<typeof BaseDrawer.Root> {}

interface DrawerTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseDrawer.Trigger>, "className"> {
  className?: string;
}

interface DrawerOverlayProps extends Omit<React.ComponentPropsWithRef<typeof BaseDrawer.Backdrop>, "className"> {
  className?: string;
}

interface DrawerContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseDrawer.Popup>, "className"> {
  className?: string;
}

interface DrawerHeaderProps extends React.ComponentPropsWithRef<"div"> {
  className?: string;
  render?: useRender.RenderProp<Record<string, never>>;
  asChild?: boolean;
}

interface DrawerFooterProps extends React.ComponentPropsWithRef<"div"> {
  className?: string;
  render?: useRender.RenderProp<Record<string, never>>;
  asChild?: boolean;
}

interface DrawerTitleProps extends Omit<React.ComponentPropsWithRef<typeof BaseDrawer.Title>, "className"> {
  className?: string;
}

interface DrawerDescriptionProps extends Omit<React.ComponentPropsWithRef<typeof BaseDrawer.Description>, "className"> {
  className?: string;
}

function Drawer(props: Readonly<Drawer.Props>): React.ReactElement {
  return <BaseDrawer.Root {...props} />;
}

function DrawerTrigger(props: Readonly<DrawerTrigger.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseDrawer.Trigger
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps({className}, {}),
      })}>
      {children}
    </BaseDrawer.Trigger>
  );
}

const DrawerPortal = BaseDrawer.Portal;
const DrawerClose = BaseDrawer.Close;

function DrawerOverlay(props: Readonly<DrawerOverlay.Props>): React.ReactElement {
  const {className, render, ...otherProps} = props;

  return (
    <BaseDrawer.Backdrop
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.backdrop, className)}, {}),
      })}
    />
  );
}

function DrawerContent(props: Readonly<DrawerContent.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <BaseDrawer.Popup
        {...otherProps}
        render={useRender({
          defaultTagName: "div",
          render: render as never,
          props: mergeProps({className: cn(styles.popup, className)}, {}),
        })}>
        <div className={styles.handle} />
        <BaseDrawer.Content className={styles.content}>{children}</BaseDrawer.Content>
      </BaseDrawer.Popup>
    </DrawerPortal>
  );
}

function DrawerHeader(props: Readonly<DrawerHeader.Props>): React.ReactElement {
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

function DrawerFooter(props: Readonly<DrawerFooter.Props>): React.ReactElement {
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

function DrawerTitle(props: Readonly<DrawerTitle.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseDrawer.Title
      {...otherProps}
      render={useRender({
        defaultTagName: "h2",
        render: render as never,
        props: mergeProps({className: cn(styles.title, className)}, {}),
      })}>
      {children}
    </BaseDrawer.Title>
  );
}

function DrawerDescription(props: Readonly<DrawerDescription.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseDrawer.Description
      {...otherProps}
      render={useRender({
        defaultTagName: "p",
        render: render as never,
        props: mergeProps({className: cn(styles.description, className)}, {}),
      })}>
      {children}
    </BaseDrawer.Description>
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Drawer {
  export type Props = DrawerProps;
  export type State = BaseDrawer.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerTrigger {
  export type Props = DrawerTriggerProps;
  export type State = BaseDrawer.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerOverlay {
  export type Props = DrawerOverlayProps;
  export type State = BaseDrawer.Backdrop.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerContent {
  export type Props = DrawerContentProps;
  export type State = BaseDrawer.Popup.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerHeader {
  export type Props = DrawerHeaderProps;
  export type State = Record<string, never>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerFooter {
  export type Props = DrawerFooterProps;
  export type State = Record<string, never>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerTitle {
  export type Props = DrawerTitleProps;
  export type State = BaseDrawer.Title.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerDescription {
  export type Props = DrawerDescriptionProps;
  export type State = BaseDrawer.Description.State;
}

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
