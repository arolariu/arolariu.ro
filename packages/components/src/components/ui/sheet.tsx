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
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Enables child element composition instead of rendering the default wrapper.
   * @default false
   * @deprecated Prefer Base UI's `render` prop.
   */
  asChild?: boolean;
}

interface SheetOverlayProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Backdrop>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

export interface SheetContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Popup>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Controls which side of the viewport the sheet enters from.
   * @default "right"
   */
  side?: SheetSide;
}

interface SheetHeaderProps extends React.ComponentPropsWithRef<"div"> {
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

interface SheetFooterProps extends React.ComponentPropsWithRef<"div"> {
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

interface SheetTitleProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Title>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

interface SheetDescriptionProps extends Omit<React.ComponentPropsWithRef<typeof BaseDialog.Description>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
}

/**
 * Coordinates sheet state and accessibility behavior.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <Sheet>Content</Sheet>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
function Sheet(props: Readonly<Sheet.Props>): React.ReactElement {
  return <BaseDialog.Root {...props} />;
}

/**
 * Provides the sheet portal container.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <SheetPortal>Content</SheetPortal>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
const SheetPortal = BaseDialog.Portal;
/**
 * Renders the sheet close.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <SheetClose>Content</SheetClose>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
const SheetClose = BaseDialog.Close;

/**
 * Renders the sheet trigger.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <SheetTrigger>Content</SheetTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
const SheetTrigger = React.forwardRef<HTMLButtonElement, SheetTrigger.Props>(
  (props: Readonly<SheetTrigger.Props>, ref): React.ReactElement => {
    // eslint-disable-next-line sonarjs/deprecation -- backward-compatible asChild API
    const {asChild = false, children, className, render, ...otherProps} = props;
    const renderProp = asChild && React.isValidElement(children) ? children : render;

    return (
      <BaseDialog.Trigger
        ref={ref}
        {...otherProps}
        render={useRender({
          defaultTagName: "button",
          render: renderProp as never,
          props: mergeProps({className}, {}),
        })}>
        {renderProp ? undefined : children}
      </BaseDialog.Trigger>
    );
  },
);

/**
 * Renders the sheet overlay.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <SheetOverlay>Content</SheetOverlay>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
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

/**
 * Renders the sheet content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <SheetContent>Content</SheetContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
const SheetContent = React.forwardRef<React.ComponentRef<typeof BaseDialog.Popup>, SheetContent.Props>(
  (props: Readonly<SheetContent.Props>, ref): React.ReactElement => {
    const {className, children, render, side = "right", ...otherProps} = props;

    return (
      <SheetPortal>
        <SheetOverlay />
        <BaseDialog.Popup
          ref={ref}
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
  },
);

/**
 * Renders the sheet header.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <SheetHeader>Content</SheetHeader>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
function SheetHeader(props: Readonly<SheetHeader.Props>): React.ReactElement {
  // eslint-disable-next-line sonarjs/deprecation -- backward-compatible asChild API
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
 * Renders the sheet footer.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <SheetFooter>Content</SheetFooter>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
function SheetFooter(props: Readonly<SheetFooter.Props>): React.ReactElement {
  // eslint-disable-next-line sonarjs/deprecation -- backward-compatible asChild API
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
 * Renders the sheet title.
 *
 * @remarks
 * - Renders a `<h2>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <SheetTitle>Content</SheetTitle>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
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

/**
 * Renders the sheet description.
 *
 * @remarks
 * - Renders a `<p>` element by default
 * - Built on {@link https://base-ui.com/react/components/dialog | Base UI Dialog}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <SheetDescription>Content</SheetDescription>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Documentation}
 */
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

Sheet.displayName = "Sheet";
SheetPortal.displayName = "SheetPortal";
SheetClose.displayName = "SheetClose";
SheetTrigger.displayName = "SheetTrigger";
SheetOverlay.displayName = "SheetOverlay";
SheetContent.displayName = "SheetContent";
SheetHeader.displayName = "SheetHeader";
SheetFooter.displayName = "SheetFooter";
SheetTitle.displayName = "SheetTitle";
SheetDescription.displayName = "SheetDescription";

export {Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger};
