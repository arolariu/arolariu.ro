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
    /** Caller-localizable accessible name for the automatic icon close. @default "Close" */
    closeLabel?: string;
  }
>;
/** Layout composition uses Base UI's polymorphic callback props, not div-specific refs. */
export type DialogHeaderProps = Readonly<
  Omit<useRender.ComponentProps<"div", Record<string, never>>, "ref"> & {
    ref?: React.Ref<HTMLElement>;
  }
>;
/** Dialog action layout with an optional explicit dismissal button. */
export type DialogFooterProps = Readonly<
  DialogHeaderProps & {
    /** Append an outline Close button after the supplied actions. @default false */
    showCloseButton?: boolean;
    /** Caller-localizable text for the optional footer close. @default "Close" */
    closeLabel?: string;
  }
>;
/** Accessible dialog heading, wired by Base UI. */
export type DialogTitleProps = Readonly<Omit<React.ComponentPropsWithRef<typeof BaseDialog.Title>, "className"> & {className?: string}>;
/** Accessible dialog description, wired by Base UI. */
export type DialogDescriptionProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseDialog.Description>, "className"> & {className?: string}
>;

type PrimitiveRenderCallback = Exclude<BaseDialog.Popup.Props["render"], React.ReactElement | undefined>;

function normalizedElement(render: React.ReactNode): React.ReactElement<{children?: React.ReactNode}> {
  // eslint-disable-next-line react-x/no-children-to-array -- public React normalization supports Flight/lazy slots without reading private lazy fields.
  const elements = React.Children.toArray(render);
  const [element] = elements;
  if (elements.length !== 1 || !React.isValidElement<{children?: React.ReactNode}>(element) || element.type === React.Fragment) {
    throw new TypeError("Dialog composition requires a single non-Fragment React element.");
  }
  return element;
}

function DecoratedDialogElement({
  render,
  elementProps,
  closeControl,
}: Readonly<{
  render: React.ReactElement;
  elementProps: Parameters<PrimitiveRenderCallback>[0];
  closeControl: React.ReactNode;
}>): React.ReactElement {
  const element = normalizedElement(render);
  const children = Object.hasOwn(element.props, "children") ? element.props.children : elementProps.children;
  // eslint-disable-next-line react-x/no-clone-element -- preserve Base UI's top-level element-child precedence before appending the close.
  const decorated = React.cloneElement(element, {
    children: (
      <>
        {children}
        {closeControl}
      </>
    ),
  });
  return useRender({render: decorated, props: {...elementProps}});
}

/** Coordinates a modal dialog without adding a DOM wrapper. */
function Dialog<Payload = unknown>(props: Readonly<Dialog.Props<Payload>>): React.ReactElement {
  return <BaseDialog.Root {...props} />;
}
Dialog.displayName = "Dialog";

/** Opens a dialog. Canonical `render` callers specify `nativeButton={false}` for non-buttons. */
const DialogTrigger = ({ref, children, render, nativeButton, className, ...props}: Readonly<DialogTrigger.Props>): React.ReactElement => {
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
      className={(state) => cn(styles.control, typeof className === "function" ? className(state) : className)}
      nativeButton={nativeButton}
      render={render}>
      {children}
    </BaseDialog.Trigger>
  );
};
DialogTrigger.displayName = "DialogTrigger";

/** Mounts dialog parts outside their local DOM hierarchy; supports `keepMounted`. */
const DialogPortal = BaseDialog.Portal;

/** Closes a dialog without imposing the automatic icon's positioning or styling. */
function DialogClose({className, ...props}: Readonly<DialogClose.Props>): React.ReactElement {
  return (
    <BaseDialog.Close
      data-slot='dialog-close'
      {...props}
      className={(state) => cn(styles.control, typeof className === "function" ? className(state) : className)}
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
const DialogContent = ({
  ref,
  className,
  children,
  render,
  showCloseButton = true,
  closeLabel = "Close",
  ...props
}: Readonly<DialogContent.Props>): React.ReactElement => {
  const closeControl = showCloseButton ? (
    <DialogClose
      aria-label={closeLabel}
      render={
        <Button
          aria-label={closeLabel}
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
  ) : null;
  const decorateElement = showCloseButton && render !== undefined && typeof render !== "function";
  return (
    <DialogPortal>
      <DialogOverlay />
      <BaseDialog.Popup
        data-slot='dialog-content'
        {...props}
        ref={ref}
        render={
          decorateElement
            ? (elementProps) => (
                <DecoratedDialogElement
                  render={render}
                  elementProps={elementProps}
                  closeControl={closeControl}
                />
              )
            : render
        }
        className={cn(styles.popup, className)}>
        {decorateElement ? (
          children
        ) : (
          <>
            {children}
            {closeControl}
          </>
        )}
      </BaseDialog.Popup>
    </DialogPortal>
  );
};
DialogContent.displayName = "DialogContent";

/** Composes the dialog heading layout without discarding children, events or refs. */
const DialogHeader = ({ref, children, className, render, ...props}: Readonly<DialogHeader.Props>): React.ReactElement => {
  return useRender({
    defaultTagName: "div",
    ref,
    render,
    props: {
      "data-slot": "dialog-header",
      ...mergeProps<"div">({className: cn(styles.header, className)}, props, {
        children,
      }),
    },
  });
};
DialogHeader.displayName = "DialogHeader";

/** Composes footer actions; `showCloseButton` adds a separate outline dismissal control. */
const DialogFooter = ({
  ref,
  children,
  className,
  render: renderElement,
  showCloseButton = false,
  closeLabel = "Close",
  ...props
}: Readonly<DialogFooter.Props>): React.ReactElement => {
  const closeControl = showCloseButton ? <DialogClose render={<Button variant='outline' />}>{closeLabel}</DialogClose> : null;
  const decorateElement = showCloseButton && renderElement !== undefined && typeof renderElement !== "function";
  const suppliedChildren = children;
  return useRender({
    defaultTagName: "div",
    ref,
    render: decorateElement
      ? (elementProps) => (
          <DecoratedDialogElement
            render={renderElement}
            elementProps={elementProps}
            closeControl={closeControl}
          />
        )
      : renderElement,
    props: {
      "data-slot": "dialog-footer",
      ...mergeProps<"div">({className: cn(styles.footer, className)}, props, {
        children: decorateElement ? (
          suppliedChildren
        ) : (
          <>
            {suppliedChildren}
            {closeControl}
          </>
        ),
      }),
    },
  });
};
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
