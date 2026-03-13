"use client";

import {Drawer as BaseDrawer} from "@base-ui/react/drawer";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./drawer.module.css";

interface DrawerProps extends React.ComponentPropsWithRef<typeof BaseDrawer.Root> {}

interface DrawerTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseDrawer.Trigger>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface DrawerOverlayProps extends Omit<React.ComponentPropsWithRef<typeof BaseDrawer.Backdrop>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface DrawerContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseDrawer.Popup>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface DrawerHeaderProps extends React.ComponentPropsWithRef<"div"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Overrides the default rendered element while preserving component behavior.
   * @default undefined
   */
  render?: useRender.RenderProp<Record<string, never>>;
  /**
   * Enables child element composition instead of rendering the default wrapper.
   * @default false
   * @deprecated Prefer Base UI's `render` prop.
   */
  asChild?: boolean;
}

interface DrawerFooterProps extends React.ComponentPropsWithRef<"div"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Overrides the default rendered element while preserving component behavior.
   * @default undefined
   */
  render?: useRender.RenderProp<Record<string, never>>;
  /**
   * Enables child element composition instead of rendering the default wrapper.
   * @default false
   * @deprecated Prefer Base UI's `render` prop.
   */
  asChild?: boolean;
}

interface DrawerTitleProps extends Omit<React.ComponentPropsWithRef<typeof BaseDrawer.Title>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface DrawerDescriptionProps extends Omit<React.ComponentPropsWithRef<typeof BaseDrawer.Description>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

/**
 * Coordinates drawer state and accessibility behavior.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <Drawer>Content</Drawer>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
function Drawer(props: Readonly<Drawer.Props>): React.ReactElement {
  return <BaseDrawer.Root {...props} />;
}

/**
 * Renders the drawer trigger.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DrawerTrigger>Content</DrawerTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
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

/**
 * Provides the drawer portal container.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <DrawerPortal>Content</DrawerPortal>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
const DrawerPortal: typeof BaseDrawer.Portal & {displayName?: string} = BaseDrawer.Portal;
/**
 * Renders the drawer close.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <DrawerClose>Content</DrawerClose>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
const DrawerClose: typeof BaseDrawer.Close & {displayName?: string} = BaseDrawer.Close;

/**
 * Renders the drawer overlay.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DrawerOverlay>Content</DrawerOverlay>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
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

/**
 * Renders the drawer content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DrawerContent>Content</DrawerContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
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

/**
 * Renders the drawer header.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DrawerHeader>Content</DrawerHeader>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
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

/**
 * Renders the drawer footer.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DrawerFooter>Content</DrawerFooter>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
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

/**
 * Renders the drawer title.
 *
 * @remarks
 * - Renders a `<h2>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DrawerTitle>Content</DrawerTitle>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
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

/**
 * Renders the drawer description.
 *
 * @remarks
 * - Renders a `<p>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DrawerDescription>Content</DrawerDescription>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
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

Drawer.displayName = "Drawer";
DrawerTrigger.displayName = "DrawerTrigger";
DrawerPortal.displayName = "DrawerPortal";
DrawerClose.displayName = "DrawerClose";
DrawerOverlay.displayName = "DrawerOverlay";
DrawerContent.displayName = "DrawerContent";
DrawerHeader.displayName = "DrawerHeader";
DrawerFooter.displayName = "DrawerFooter";
DrawerTitle.displayName = "DrawerTitle";
DrawerDescription.displayName = "DrawerDescription";

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
