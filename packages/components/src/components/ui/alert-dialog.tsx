"use client";

import {AlertDialog as BaseAlertDialog} from "@base-ui/react/alert-dialog";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {Button, buttonVariants, type ButtonProps, type ButtonSize, type ButtonVariant} from "./button";
import styles from "./alert-dialog.module.css";

/** Real modal primitive state, dismissal and imperative actions. */
export type AlertDialogProps<Payload = unknown> = Readonly<BaseAlertDialog.Root.Props<Payload>>;
/** Trigger composition retains primitive render state and slot compatibility. */
export type AlertDialogTriggerProps = Readonly<
  Omit<BaseAlertDialog.Trigger.Props, "ref"> & {ref?: React.Ref<HTMLElement>; asChild?: boolean}
>;
/** Backdrop presentation with primitive composition. */
export type AlertDialogOverlayProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Backdrop>, "className"> & {className?: string}
>;
/** Supported confirmation popup widths and media/action layouts. */
export type AlertDialogSize = "default" | "sm";
/** Confirmation popup props with primitive-owned render, ref and focus contracts. */
export type AlertDialogContentProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Popup>, "className"> & {
    className?: string;
    /** Compact or standard confirmation layout. @default "default" */
    size?: AlertDialogSize;
  }
>;
/** Layout composition uses the actual Base UI polymorphic render contract. */
export type AlertDialogHeaderProps = Readonly<
  Omit<useRender.ComponentProps<"div", Record<string, never>>, "ref"> & {
    ref?: React.Ref<HTMLElement>;
    /** Legacy single-element slot. Prefer `render`. @default false */
    asChild?: boolean;
  }
>;
/** Confirmation action layout. */
export type AlertDialogFooterProps = Readonly<AlertDialogHeaderProps>;
/** Optional visual media. Decorative icons should be `aria-hidden`; meaningful images need alternative text. */
export type AlertDialogMediaProps = Readonly<
  Omit<useRender.ComponentProps<"div", Record<string, never>>, "ref"> & {ref?: React.Ref<HTMLElement>}
>;
/** Accessible confirmation heading. */
export type AlertDialogTitleProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Title>, "className"> & {className?: string}
>;
/** Accessible confirmation description. */
export type AlertDialogDescriptionProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Description>, "className"> & {className?: string}
>;
/** Ordinary Button props: confirmation does not implicitly dismiss the modal. */
export type AlertDialogActionProps = ButtonProps;
/** Explicit dismissal control with the shared Button's visual presets. */
export type AlertDialogCancelProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Close>, "className"> & {
    className?: string;
    /** Shared button variant. @default "outline" */
    variant?: ButtonVariant;
    /** Shared button size. @default "default" */
    size?: ButtonSize;
  }
>;

function legacyChild(children: React.ReactNode, asChild: boolean): React.ReactElement | undefined {
  if (!asChild) return undefined;
  if (!React.isValidElement(children) || children.type === React.Fragment) {
    throw new TypeError("AlertDialog asChild requires a single non-Fragment React element.");
  }
  return children;
}

/** Coordinates a confirmation modal. Base UI owns focus and dismissal; callers own work policy. */
function AlertDialog<Payload = unknown>(props: Readonly<AlertDialog.Props<Payload>>): React.ReactElement {
  return <BaseAlertDialog.Root {...props} />;
}
AlertDialog.displayName = "AlertDialog";

/** Opens a confirmation modal with primitive-owned state and ref merging. */
const AlertDialogTrigger = React.forwardRef<HTMLElement, AlertDialogTrigger.Props>(
  ({asChild = false, children, render, nativeButton, ...props}: Readonly<AlertDialogTrigger.Props>, ref): React.ReactElement => {
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
      <BaseAlertDialog.Trigger
        data-slot='alert-dialog-trigger'
        {...props}
        ref={primitiveRef}
        nativeButton={nativeButton ?? (child && typeof child.type === "string" ? child.type === "button" : true)}
        render={child ?? render}>
        {child ? undefined : children}
      </BaseAlertDialog.Trigger>
    );
  },
);
AlertDialogTrigger.displayName = "AlertDialogTrigger";

/** Portals confirmation parts; retains Base UI's `keepMounted` contract. */
const AlertDialogPortal = BaseAlertDialog.Portal;

/** Renders the styled backdrop below the popup, with real primitive render state. */
function AlertDialogOverlay({className, ...props}: Readonly<AlertDialogOverlay.Props>): React.ReactElement {
  return (
    <BaseAlertDialog.Backdrop
      data-slot='alert-dialog-overlay'
      {...props}
      className={cn(styles.backdrop, className)}
    />
  );
}
AlertDialogOverlay.displayName = "AlertDialogOverlay";

/** Portals the confirmation popup with a standard or compact media/action layout. */
const AlertDialogContent = React.forwardRef<HTMLDivElement, AlertDialogContent.Props>(
  ({className, children, size = "default", ...props}: Readonly<AlertDialogContent.Props>, ref): React.ReactElement => (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <BaseAlertDialog.Popup
        data-slot='alert-dialog-content'
        data-size={size}
        {...props}
        ref={ref}
        className={cn(styles.popup, className)}>
        {children}
      </BaseAlertDialog.Popup>
    </AlertDialogPortal>
  ),
);
AlertDialogContent.displayName = "AlertDialogContent";

/** Composes the title, description and optional media without discarding refs or children. */
const AlertDialogHeader = React.forwardRef<HTMLElement, AlertDialogHeader.Props>(
  (
    {asChild = false, children, className, render, ...props}: Readonly<React.PropsWithoutRef<AlertDialogHeader.Props>>,
    ref,
  ): React.ReactElement => {
    const child = legacyChild(children, asChild);
    return useRender({
      defaultTagName: "div",
      ref,
      render: child ?? render,
      props: {
        "data-slot": "alert-dialog-header",
        ...mergeProps<"div">({className: cn(styles.header, className)}, props, {
          children: child ? undefined : children,
        }),
      },
    });
  },
);
AlertDialogHeader.displayName = "AlertDialogHeader";

/** Lays out confirmation and explicit cancellation actions. */
const AlertDialogFooter = React.forwardRef<HTMLElement, AlertDialogFooter.Props>(
  (
    {asChild = false, children, className, render, ...props}: Readonly<React.PropsWithoutRef<AlertDialogFooter.Props>>,
    ref,
  ): React.ReactElement => {
    const child = legacyChild(children, asChild);
    return useRender({
      defaultTagName: "div",
      ref,
      render: child ?? render,
      props: {
        "data-slot": "alert-dialog-footer",
        ...mergeProps<"div">({className: cn(styles.footer, className)}, props, {
          children: child ? undefined : children,
        }),
      },
    });
  },
);
AlertDialogFooter.displayName = "AlertDialogFooter";

/** Renders optional visual media in either popup size; no dismissal or business behavior. */
const AlertDialogMedia = React.forwardRef<HTMLElement, AlertDialogMedia.Props>(
  ({className, render, ...props}: Readonly<React.PropsWithoutRef<AlertDialogMedia.Props>>, ref): React.ReactElement =>
    useRender({
      defaultTagName: "div",
      ref,
      render,
      props: {"data-slot": "alert-dialog-media", ...mergeProps<"div">({className: cn(styles.media, className)}, props)},
    }),
);
AlertDialogMedia.displayName = "AlertDialogMedia";

/** Renders the accessible confirmation heading with primitive-owned composition. */
function AlertDialogTitle({className, ...props}: Readonly<AlertDialogTitle.Props>): React.ReactElement {
  return (
    <BaseAlertDialog.Title
      data-slot='alert-dialog-title'
      {...props}
      className={cn(styles.title, className)}
    />
  );
}
AlertDialogTitle.displayName = "AlertDialogTitle";

/** Renders the accessible confirmation description with primitive-owned composition. */
function AlertDialogDescription({className, ...props}: Readonly<AlertDialogDescription.Props>): React.ReactElement {
  return (
    <BaseAlertDialog.Description
      data-slot='alert-dialog-description'
      {...props}
      className={cn(styles.description, className)}
    />
  );
}
AlertDialogDescription.displayName = "AlertDialogDescription";

/**
 * An ordinary Button, not a Close primitive. Pending and rejected work do not close the modal.
 * Close explicitly on success using controlled `open` or the root's `actionsRef`.
 */
const AlertDialogAction = React.forwardRef<HTMLElement, AlertDialogAction.Props>(
  (props: Readonly<AlertDialogAction.Props>, ref): React.ReactElement => (
    <Button
      data-slot='alert-dialog-action'
      {...props}
      ref={ref}
    />
  ),
);
AlertDialogAction.displayName = "AlertDialogAction";

/** An explicit Close-backed cancel control, using the shared Button's size/variant vocabulary. */
const AlertDialogCancel = React.forwardRef<HTMLButtonElement, AlertDialogCancel.Props>(
  (
    {className, variant = "outline", size = "default", ...props}: Readonly<React.PropsWithoutRef<AlertDialogCancel.Props>>,
    ref,
  ): React.ReactElement => (
    <BaseAlertDialog.Close
      data-slot='alert-dialog-cancel'
      data-variant={variant}
      data-size={size}
      {...props}
      ref={ref}
      className={cn(buttonVariants({variant, size}), className)}
    />
  ),
);
AlertDialogCancel.displayName = "AlertDialogCancel";

// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace AlertDialog {
  export type Props<Payload = unknown> = AlertDialogProps<Payload>;
  export type State = BaseAlertDialog.Root.State;
  export type Actions = BaseAlertDialog.Root.Actions;
  export type ChangeEventDetails = BaseAlertDialog.Root.ChangeEventDetails;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace AlertDialogTrigger {
  export type Props = Readonly<AlertDialogTriggerProps>;
  export type State = BaseAlertDialog.Trigger.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace AlertDialogOverlay {
  export type Props = Readonly<AlertDialogOverlayProps>;
  export type State = BaseAlertDialog.Backdrop.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace AlertDialogContent {
  export type Props = Readonly<AlertDialogContentProps>;
  export type State = BaseAlertDialog.Popup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace AlertDialogHeader {
  export type Props = Readonly<AlertDialogHeaderProps>;
  export type State = Record<string, never>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace AlertDialogFooter {
  export type Props = Readonly<AlertDialogFooterProps>;
  export type State = Record<string, never>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace AlertDialogMedia {
  export type Props = Readonly<AlertDialogMediaProps>;
  export type State = Record<string, never>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace AlertDialogTitle {
  export type Props = Readonly<AlertDialogTitleProps>;
  export type State = BaseAlertDialog.Title.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace AlertDialogDescription {
  export type Props = Readonly<AlertDialogDescriptionProps>;
  export type State = BaseAlertDialog.Description.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace AlertDialogAction {
  export type Props = Readonly<AlertDialogActionProps>;
  export type State = Button.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace AlertDialogCancel {
  export type Props = Readonly<AlertDialogCancelProps>;
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
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
