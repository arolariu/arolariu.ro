"use client";

import {Dialog as BaseDialog} from "@base-ui/react/dialog";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import {X} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {Button} from "./button";
import styles from "./dialog.module.css";

/** Base UI owns modal state, dismissal, focus and trigger payloads. */
export type DialogProps<Payload = unknown> = Readonly<BaseDialog.Root.Props<Payload>>;
/** Trigger composition uses Base UI's real state and polymorphic render contract. */
export type DialogTriggerProps = Readonly<
  Omit<BaseDialog.Trigger.Props, "ref"> & {
    ref?: React.Ref<HTMLElement>;
    /** Legacy single-element slot. Prefer `render`. @default false */
    asChild?: boolean;
  }
>;
/** Unstyled close control; presentation belongs to its caller. */
export type DialogCloseProps = Readonly<React.ComponentPropsWithRef<typeof BaseDialog.Close>>;
/** Backdrop props with the library's presentation classes. */
export type DialogOverlayProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseDialog.Backdrop>, "className"> & {className?: string}
>;
/** Popup props, including Base UI's initial/final focus and render contracts. */
export type DialogContentProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseDialog.Popup>, "className"> & {
    className?: string;
    /** Append an accessible icon close after the content. @default true */
    showCloseButton?: boolean;
  }
>;
/** Layout composition uses Base UI's polymorphic callback props, not div-specific refs. */
export type DialogHeaderProps = Readonly<
  Omit<useRender.ComponentProps<"div", Record<string, never>>, "ref"> & {
    ref?: React.Ref<HTMLElement>;
    /** Legacy single-element slot. Prefer `render`. @default false */
    asChild?: boolean;
  }
>;
/** Dialog action layout with an optional explicit dismissal button. */
export type DialogFooterProps = Readonly<
  DialogHeaderProps & {
    /** Append an outline Close button after the supplied actions. @default false */
    showCloseButton?: boolean;
  }
>;
/** Accessible dialog heading, wired by Base UI. */
export type DialogTitleProps = Readonly<Omit<React.ComponentPropsWithRef<typeof BaseDialog.Title>, "className"> & {className?: string}>;
/** Accessible dialog description, wired by Base UI. */
export type DialogDescriptionProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseDialog.Description>, "className"> & {className?: string}
>;

function legacyChild(children: React.ReactNode, asChild: boolean): React.ReactElement<{children?: React.ReactNode}> | undefined {
  if (!asChild) return undefined;
  if (!React.isValidElement<{children?: React.ReactNode}>(children) || children.type === React.Fragment) {
    throw new TypeError("Dialog asChild requires a single non-Fragment React element.");
  }
  return children;
}

/** Coordinates a modal dialog without adding a DOM wrapper. */
function Dialog<Payload = unknown>(props: Readonly<Dialog.Props<Payload>>): React.ReactElement {
  return <BaseDialog.Root {...props} />;
}
Dialog.displayName = "Dialog";

/** Opens a dialog. Canonical `render` callers specify `nativeButton={false}` for non-buttons. */
const DialogTrigger = React.forwardRef<HTMLElement, DialogTrigger.Props>(
  ({asChild = false, children, render, nativeButton, ...props}: Readonly<DialogTrigger.Props>, ref): React.ReactElement => {
    const child = legacyChild(children, asChild);
    const primitiveRef: React.RefCallback<HTMLElement> = React.useCallback(
      (element) => {
        if (typeof ref === "function") return ref(element);
        if (ref) ref.current = element;
        return undefined;
      },
      [ref],
    );
    return (
      <BaseDialog.Trigger
        data-slot='dialog-trigger'
        {...props}
        ref={primitiveRef}
        nativeButton={nativeButton ?? (child && typeof child.type === "string" ? child.type === "button" : true)}
        render={child ?? render}>
        {child ? undefined : children}
      </BaseDialog.Trigger>
    );
  },
);
DialogTrigger.displayName = "DialogTrigger";

/** Mounts dialog parts outside their local DOM hierarchy; supports `keepMounted`. */
const DialogPortal = BaseDialog.Portal;

/** Closes a dialog without imposing the automatic icon's positioning or styling. */
function DialogClose(props: Readonly<DialogClose.Props>): React.ReactElement {
  return (
    <BaseDialog.Close
      data-slot='dialog-close'
      {...props}
    />
  );
}
DialogClose.displayName = "DialogClose";

/** Renders the styled backdrop while forwarding render state and refs directly to Base UI. */
function DialogOverlay({className, ...props}: Readonly<DialogOverlay.Props>): React.ReactElement {
  return (
    <BaseDialog.Backdrop
      data-slot='dialog-overlay'
      {...props}
      className={cn(styles.backdrop, className)}
    />
  );
}
DialogOverlay.displayName = "DialogOverlay";

/**
 * Portals a popup above its backdrop. Base UI owns modal/focus behavior.
 * The automatic icon close is last in DOM order; opt out with `showCloseButton={false}`.
 */
const DialogContent = React.forwardRef<HTMLDivElement, DialogContent.Props>(
  (
    {className, children, render, showCloseButton = true, ...props}: Readonly<React.PropsWithoutRef<DialogContent.Props>>,
    ref,
  ): React.ReactElement => {
    const renderElement = React.isValidElement<{children?: React.ReactNode}>(render) ? render : undefined;
    const content = (
      <>
        {children === undefined ? renderElement?.props.children : children}
        {showCloseButton ? (
          <DialogClose
            aria-label='Close'
            render={
              <Button
                variant='ghost'
                size='icon-sm'
                className={cn(styles.close)}
              />
            }>
            <X
              aria-hidden='true'
              className={styles.closeIcon}
            />
          </DialogClose>
        ) : null}
      </>
    );
    // eslint-disable-next-line react-x/no-clone-element -- extend only top-level children; Base UI still owns state, event and ref merging.
    const popupRender = renderElement ? React.cloneElement(renderElement, {children: content}) : render;
    return (
      <DialogPortal>
        <DialogOverlay />
        <BaseDialog.Popup
          data-slot='dialog-content'
          {...props}
          ref={ref}
          render={popupRender}
          className={cn(styles.popup, className)}>
          {content}
        </BaseDialog.Popup>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = "DialogContent";

/** Composes the dialog heading layout without discarding children, events or refs. */
const DialogHeader = React.forwardRef<HTMLElement, DialogHeader.Props>(
  (
    {asChild = false, children, className, render, ...props}: Readonly<React.PropsWithoutRef<DialogHeader.Props>>,
    ref,
  ): React.ReactElement => {
    const child = legacyChild(children, asChild);
    return useRender({
      defaultTagName: "div",
      ref,
      render: child ?? render,
      props: {
        "data-slot": "dialog-header",
        ...mergeProps<"div">({className: cn(styles.header, className)}, props, {
          children: child ? undefined : children,
        }),
      },
    });
  },
);
DialogHeader.displayName = "DialogHeader";

/** Composes footer actions; `showCloseButton` adds a separate outline dismissal control. */
const DialogFooter = React.forwardRef<HTMLElement, DialogFooter.Props>(
  (
    {asChild = false, children, className, render, showCloseButton = false, ...props}: Readonly<React.PropsWithoutRef<DialogFooter.Props>>,
    ref,
  ): React.ReactElement => {
    const child = legacyChild(children, asChild);
    const renderElement = child ?? render;
    const suppliedChildren = child
      ? child.props.children
      : children === undefined && React.isValidElement<{children?: React.ReactNode}>(render)
        ? render.props.children
        : children;
    const content = showCloseButton ? (
      <>
        {suppliedChildren}
        <DialogClose render={<Button variant='outline' />}>Close</DialogClose>
      </>
    ) : child ? undefined : (
      children
    );
    return useRender({
      defaultTagName: "div",
      ref,
      render:
        showCloseButton && React.isValidElement<{children?: React.ReactNode}>(renderElement)
          ? // eslint-disable-next-line react-x/no-clone-element -- append the opt-in close without changing primitive-owned refs or handlers.
            React.cloneElement(renderElement, {children: content})
          : renderElement,
      props: {
        "data-slot": "dialog-footer",
        ...mergeProps<"div">({className: cn(styles.footer, className)}, props, {
          children: content,
        }),
      },
    });
  },
);
DialogFooter.displayName = "DialogFooter";

/** Renders the dialog's accessible heading with primitive-owned composition. */
function DialogTitle({className, ...props}: Readonly<DialogTitle.Props>): React.ReactElement {
  return (
    <BaseDialog.Title
      data-slot='dialog-title'
      {...props}
      className={cn(styles.title, className)}
    />
  );
}
DialogTitle.displayName = "DialogTitle";

/** Renders the dialog's accessible description with primitive-owned composition. */
function DialogDescription({className, ...props}: Readonly<DialogDescription.Props>): React.ReactElement {
  return (
    <BaseDialog.Description
      data-slot='dialog-description'
      {...props}
      className={cn(styles.description, className)}
    />
  );
}
DialogDescription.displayName = "DialogDescription";

// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace Dialog {
  export type Props<Payload = unknown> = DialogProps<Payload>;
  export type State = BaseDialog.Root.State;
  export type Actions = BaseDialog.Root.Actions;
  export type ChangeEventDetails = BaseDialog.Root.ChangeEventDetails;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace DialogTrigger {
  export type Props = Readonly<DialogTriggerProps>;
  export type State = BaseDialog.Trigger.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace DialogClose {
  export type Props = Readonly<DialogCloseProps>;
  export type State = BaseDialog.Close.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace DialogOverlay {
  export type Props = Readonly<DialogOverlayProps>;
  export type State = BaseDialog.Backdrop.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace DialogContent {
  export type Props = Readonly<DialogContentProps>;
  export type State = BaseDialog.Popup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace DialogHeader {
  export type Props = Readonly<DialogHeaderProps>;
  export type State = Record<string, never>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace DialogFooter {
  export type Props = Readonly<DialogFooterProps>;
  export type State = Record<string, never>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace DialogTitle {
  export type Props = Readonly<DialogTitleProps>;
  export type State = BaseDialog.Title.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace DialogDescription {
  export type Props = Readonly<DialogDescriptionProps>;
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
