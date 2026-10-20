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
export type AlertDialogTriggerProps = Readonly<Omit<BaseAlertDialog.Trigger.Props, "ref"> & {ref?: React.Ref<HTMLElement>}>;
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
    /**
     * Props for the internal Portal, for example `keepMounted` (keep the closed confirmation and its form state
     * mounted but hidden) or `container` (portal into a theme-scoped element, shadow root or another document).
     * Content always supplies the portal's children.
     */
    portalProps?: Readonly<Omit<React.ComponentPropsWithRef<typeof BaseAlertDialog.Portal>, "children">>;
  }
>;
/** Layout composition uses the actual Base UI polymorphic render contract. */
export type AlertDialogHeaderProps = Readonly<
  Omit<useRender.ComponentProps<"div", Record<string, never>>, "ref"> & {
    ref?: React.Ref<HTMLElement>;
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

/**
 * Coordinates a confirmation modal. Base UI owns focus and dismissal; callers own work policy.
 *
 * @remarks
 * - Renders no element of its own; built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Always modal: there is no `modal` or `disablePointerDismissal` prop. Base UI traps focus, gives the popup
 *   `role="alertdialog"`, ignores outside presses and reports cancellable Escape requests through `onOpenChange`
 * - {@link AlertDialogAction} never closes the confirmation on its own; close it when the work succeeds through
 *   controlled `open` or `actionsRef.current?.close()`. {@link AlertDialogCancel} is the Close-backed dismissal and
 *   the exit for touch screen-reader users, who cannot press Escape
 * - Reserve it for interruptions that need a decision; use `Dialog` for ordinary tasks
 *
 * @example
 * ```tsx
 * function DeleteProject({onDelete}: Readonly<{onDelete: () => void}>): React.JSX.Element {
 *   const [open, setOpen] = React.useState(false);
 *   return (
 *     <AlertDialog
 *       open={open}
 *       onOpenChange={setOpen}>
 *       <AlertDialogTrigger render={<Button variant='destructive' />}>Delete project</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogHeader>
 *           <AlertDialogTitle>Delete this project?</AlertDialogTitle>
 *           <AlertDialogDescription>This permanently removes the project and its files.</AlertDialogDescription>
 *         </AlertDialogHeader>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction
 *             variant='destructive'
 *             onClick={() => {
 *               onDelete();
 *               setOpen(false);
 *             }}>
 *             Delete
 *           </AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 *   );
 * }
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
 */
function AlertDialog<Payload = unknown>(props: Readonly<AlertDialog.Props<Payload>>): React.ReactElement {
  return <BaseAlertDialog.Root {...props} />;
}
AlertDialog.displayName = "AlertDialog";

/**
 * Opens a confirmation modal with primitive-owned state and ref merging.
 *
 * @remarks
 * - Renders a native `<button>` by default; Base UI sets `aria-haspopup="dialog"` and `aria-expanded` and returns focus
 *   to the trigger when the confirmation closes, unless `AlertDialogContent`'s `finalFocus` chooses another target
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - `render` composes another element, such as the package `Button`. Set `nativeButton={false}` only for a non-button
 *   target that takes button semantics, such as a `<div>`
 * - `className` may be a string or a callback that receives the trigger's live state
 * - An icon-only trigger needs an accessible name, such as `aria-label`
 *
 * @example
 * ```tsx
 * <AlertDialogTrigger render={<Button variant='destructive' />}>Delete project</AlertDialogTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
 */
const AlertDialogTrigger = ({
  ref,
  children,
  render,
  nativeButton,
  className,
  ...props
}: Readonly<AlertDialogTrigger.Props>): React.ReactElement => {
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
      ref={primitiveRef}
      className={(state) => cn(styles.control, typeof className === "function" ? className(state) : className)}
      nativeButton={nativeButton}
      render={render}
      {...props}>
      {children}
    </BaseAlertDialog.Trigger>
  );
};
AlertDialogTrigger.displayName = "AlertDialogTrigger";

/**
 * Portals confirmation parts; retains Base UI's `keepMounted` contract.
 *
 * @remarks
 * - Base UI's Alert Dialog Portal, re-exported unchanged: it renders a `<div>` portal element, appended to `<body>` by
 *   default
 * - {@link AlertDialogContent} already renders its own portal and backdrop; configure that portal through
 *   `portalProps`. Compose AlertDialogPortal directly only for manual primitive compositions around Base UI's
 *   `AlertDialog.Popup`
 * - `keepMounted` keeps closed content mounted but hidden; `container` chooses the element or shadow root that
 *   receives the portal
 *
 * @example
 * ```tsx
 * import {AlertDialog as BaseAlertDialog} from "@base-ui/react/alert-dialog";
 *
 * <AlertDialog>
 *   <AlertDialogTrigger>Discard draft</AlertDialogTrigger>
 *   <AlertDialogPortal>
 *     <AlertDialogOverlay />
 *     <BaseAlertDialog.Popup>
 *       <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
 *       <AlertDialogCancel>Keep editing</AlertDialogCancel>
 *     </BaseAlertDialog.Popup>
 *   </AlertDialogPortal>
 * </AlertDialog>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
 */
const AlertDialogPortal = BaseAlertDialog.Portal;

/**
 * Renders the styled backdrop below the popup, with real primitive render state.
 *
 * @remarks
 * - Renders a `<div>` element by default and supports the `render` prop for element composition
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - {@link AlertDialogContent} always renders this backdrop, because alert dialogs are always modal. Compose
 *   AlertDialogOverlay only inside a manual {@link AlertDialogPortal} composition
 * - The backdrop is presentational (`role="presentation"`) and sits outside the popup, so it takes no content or
 *   controls. Pressing it never dismisses the confirmation. Base UI omits it for nested alert dialogs unless
 *   `forceRender` is set
 *
 * @example
 * ```tsx
 * import {AlertDialog as BaseAlertDialog} from "@base-ui/react/alert-dialog";
 *
 * <AlertDialogPortal>
 *   <AlertDialogOverlay className='dimmed-backdrop' />
 *   <BaseAlertDialog.Popup>
 *     <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
 *     <AlertDialogCancel>Keep editing</AlertDialogCancel>
 *   </BaseAlertDialog.Popup>
 * </AlertDialogPortal>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
 */
function AlertDialogOverlay({className, ...props}: Readonly<AlertDialogOverlay.Props>): React.ReactElement {
  return (
    <BaseAlertDialog.Backdrop
      data-slot='alert-dialog-overlay'
      className={cn(styles.backdrop, className)}
      {...props}
    />
  );
}
AlertDialogOverlay.displayName = "AlertDialogOverlay";

/**
 * Portals the confirmation popup above its backdrop with a standard or compact media/action layout.
 *
 * @remarks
 * - Base UI keeps alert dialogs modal: it owns focus, Escape requests and ignores backdrop presses.
 * - `portalProps` configures the internal Portal: `keepMounted` keeps the closed confirmation mounted with
 *   `hidden`, preserving form state, and `container` chooses the element or shadow root that receives the portal.
 *
 * @example
 * ```tsx
 * <AlertDialog>
 *   <AlertDialogTrigger>Delete</AlertDialogTrigger>
 *   <AlertDialogContent portalProps={{keepMounted: true}}>
 *     <AlertDialogTitle>Delete this file?</AlertDialogTitle>
 *     <AlertDialogCancel>Cancel</AlertDialogCancel>
 *   </AlertDialogContent>
 * </AlertDialog>
 * ```
 */
const AlertDialogContent = ({
  ref,
  className,
  children,
  size = "default",
  portalProps,
  ...props
}: Readonly<AlertDialogContent.Props>): React.ReactElement => (
  <AlertDialogPortal {...portalProps}>
    <AlertDialogOverlay />
    <BaseAlertDialog.Popup
      data-slot='alert-dialog-content'
      data-size={size}
      ref={ref}
      className={cn(styles.popup, className)}
      {...props}>
      {children}
    </BaseAlertDialog.Popup>
  </AlertDialogPortal>
);
AlertDialogContent.displayName = "AlertDialogContent";

/**
 * Composes the title, description and optional media without discarding refs or children.
 *
 * @remarks
 * - Renders a `<div>` element by default and supports the `render` prop for element composition
 * - Layout only: it adds no role or accessible name. Place {@link AlertDialogTitle}, {@link AlertDialogDescription}
 *   and optional {@link AlertDialogMedia} inside; Base UI wires the title and description to the popup
 *
 * @example
 * ```tsx
 * <AlertDialogHeader>
 *   <AlertDialogMedia>
 *     <TriangleAlert aria-hidden='true' />
 *   </AlertDialogMedia>
 *   <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
 *   <AlertDialogDescription>Your unsaved changes will be lost.</AlertDialogDescription>
 * </AlertDialogHeader>
 * ```
 */
const AlertDialogHeader = ({ref, children, className, render, ...props}: Readonly<AlertDialogHeader.Props>): React.ReactElement => {
  return useRender({
    defaultTagName: "div",
    ref,
    render,
    props: {
      "data-slot": "alert-dialog-header",
      ...mergeProps<"div">({className: cn(styles.header, className)}, props, {
        children,
      }),
    },
  });
};
AlertDialogHeader.displayName = "AlertDialogHeader";

/**
 * Lays out confirmation and explicit cancellation actions.
 *
 * @remarks
 * - Renders a `<div>` element by default and supports the `render` prop for element composition
 * - Layout only: actions keep their own semantics and the footer adds no role
 * - Pair every {@link AlertDialogAction} with an {@link AlertDialogCancel}, the confirmation's dismissal control
 *
 * @example
 * ```tsx
 * <AlertDialogFooter>
 *   <AlertDialogCancel>Keep editing</AlertDialogCancel>
 *   <AlertDialogAction
 *     variant='destructive'
 *     onClick={discardDraft}>
 *     Discard
 *   </AlertDialogAction>
 * </AlertDialogFooter>
 * ```
 */
const AlertDialogFooter = ({ref, children, className, render, ...props}: Readonly<AlertDialogFooter.Props>): React.ReactElement => {
  return useRender({
    defaultTagName: "div",
    ref,
    render,
    props: {
      "data-slot": "alert-dialog-footer",
      ...mergeProps<"div">({className: cn(styles.footer, className)}, props, {
        children,
      }),
    },
  });
};
AlertDialogFooter.displayName = "AlertDialogFooter";

/**
 * Renders optional visual media in either popup size; no dismissal or business behavior.
 *
 * @remarks
 * - Renders a `<div>` element by default and supports the `render` prop for element composition
 * - Hide decorative icons with `aria-hidden`; give meaningful images alternative text. The title and description,
 *   not the media, must carry the confirmation's meaning
 *
 * @example
 * ```tsx
 * <AlertDialogMedia>
 *   <TriangleAlert aria-hidden='true' />
 * </AlertDialogMedia>
 * ```
 */
const AlertDialogMedia = ({ref, className, render, ...props}: Readonly<AlertDialogMedia.Props>): React.ReactElement =>
  useRender({
    defaultTagName: "div",
    ref,
    render,
    props: {"data-slot": "alert-dialog-media", ...mergeProps<"div">({className: cn(styles.media, className)}, props)},
  });
AlertDialogMedia.displayName = "AlertDialogMedia";

/**
 * Renders the accessible confirmation heading with primitive-owned composition.
 *
 * @remarks
 * - Renders an `<h2>` element by default and supports the `render` prop for element composition
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Base UI references it from the `alertdialog` popup's `aria-labelledby`, so it names the confirmation. Every
 *   confirmation needs a title; phrase it as the decision being requested
 *
 * @example
 * ```tsx
 * <AlertDialogTitle>Delete this project?</AlertDialogTitle>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
 */
function AlertDialogTitle({className, ...props}: Readonly<AlertDialogTitle.Props>): React.ReactElement {
  return (
    <BaseAlertDialog.Title
      data-slot='alert-dialog-title'
      className={cn(styles.title, className)}
      {...props}
    />
  );
}
AlertDialogTitle.displayName = "AlertDialogTitle";

/**
 * Renders the accessible confirmation description with primitive-owned composition.
 *
 * @remarks
 * - Renders a `<p>` element by default and supports the `render` prop for element composition
 * - Built on {@link https://base-ui.com/react/components/alert-dialog | Base UI Alert Dialog}
 * - Base UI references it from the popup's `aria-describedby`, so screen readers announce it with the title; state
 *   the consequence of confirming briefly
 *
 * @example
 * ```tsx
 * <AlertDialogDescription>This permanently removes the project and its files.</AlertDialogDescription>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
 */
function AlertDialogDescription({className, ...props}: Readonly<AlertDialogDescription.Props>): React.ReactElement {
  return (
    <BaseAlertDialog.Description
      data-slot='alert-dialog-description'
      className={cn(styles.description, className)}
      {...props}
    />
  );
}
AlertDialogDescription.displayName = "AlertDialogDescription";

/**
 * An ordinary Button, not a Close primitive. Pending and rejected work do not close the modal.
 * Close explicitly on success using controlled `open` or the root's `actionsRef`.
 *
 * @remarks
 * - Renders the package `Button` (a native `<button>` by default) with every Button prop, variant and size
 * - Activation runs only the caller's handler: the confirmation stays open while the work is pending and after it
 *   fails, so the caller can report the failure inside the popup
 *
 * @example
 * ```tsx
 * function ArchiveReport({
 *   archive,
 *   onFailure,
 * }: Readonly<{archive: () => Promise<void>; onFailure: (error: unknown) => void}>): React.JSX.Element {
 *   const actionsRef = React.useRef<AlertDialog.Actions>(null);
 *   return (
 *     <AlertDialog actionsRef={actionsRef}>
 *       <AlertDialogTrigger>Archive report</AlertDialogTrigger>
 *       <AlertDialogContent>
 *         <AlertDialogTitle>Archive this report?</AlertDialogTitle>
 *         <AlertDialogFooter>
 *           <AlertDialogCancel>Cancel</AlertDialogCancel>
 *           <AlertDialogAction
 *             onClick={() => {
 *               void archive().then(() => actionsRef.current?.close(), onFailure);
 *             }}>
 *             Archive
 *           </AlertDialogAction>
 *         </AlertDialogFooter>
 *       </AlertDialogContent>
 *     </AlertDialog>
 *   );
 * }
 * ```
 */
const AlertDialogAction = ({ref, ...props}: Readonly<AlertDialogAction.Props>): React.ReactElement => (
  <Button
    data-slot='alert-dialog-action'
    ref={ref}
    {...props}
  />
);
AlertDialogAction.displayName = "AlertDialogAction";

/**
 * An explicit Close-backed cancel control, using the shared Button's size/variant vocabulary.
 *
 * @remarks
 * - Renders a native `<button>` styled with `buttonVariants`; `variant` defaults to `"outline"` and `size` to
 *   `"default"`, and `className` merges after those classes
 * - Built on Base UI's Close: activation closes the confirmation, and Base UI returns focus to the trigger
 * - Include one in every confirmation. It is the dismissal path for touch screen-reader users, who cannot press
 *   Escape, and pressing the backdrop never dismisses an alert dialog
 *
 * @example
 * ```tsx
 * <AlertDialogCancel>Keep editing</AlertDialogCancel>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/alert-dialog | Base UI Documentation}
 */
const AlertDialogCancel = ({
  ref,
  className,
  variant = "outline",
  size = "default",
  ...props
}: Readonly<AlertDialogCancel.Props>): React.ReactElement => (
  <BaseAlertDialog.Close
    data-slot='alert-dialog-cancel'
    data-variant={variant}
    data-size={size}
    ref={ref}
    className={cn(buttonVariants({variant, size}), className)}
    {...props}
  />
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
