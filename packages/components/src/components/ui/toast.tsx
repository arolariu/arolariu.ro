"use client";

import {
  Toast as ToastPrimitive,
  type ToastManager as PrimitiveToastManager,
  type ToastManagerAddOptions as PrimitiveToastManagerAddOptions,
  type ToastManagerPromiseOptions as PrimitiveToastManagerPromiseOptions,
  type ToastManagerUpdateOptions as PrimitiveToastManagerUpdateOptions,
  type ToastObject as PrimitiveToastObject,
  type UseToastManagerReturnValue as PrimitiveUseToastManagerReturnValue,
} from "@base-ui/react/toast";
import {CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert, X} from "lucide-react";
import * as React from "react";

import {useMergedRefs} from "@/hooks/useMergedRefs";
import {cn} from "@/lib/utilities";
import {Button} from "./button";
import buttonStyles from "./button.module.css";
import styles from "./toast.module.css";

type DefaultToastMetadata = Readonly<Record<string, unknown>>;
/** Primitive-owned notification data, including ID, content, custom metadata and lifecycle. */
export type ToastData<Data extends object = DefaultToastMetadata> = PrimitiveToastObject<Data>;
/** The six supported viewport placements. Top placements reverse vertical stacking. */
export type ToastPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
/** Primitive-owned notification object, including transition and limitation state. */
export type ToastObject<Data extends object = DefaultToastMetadata> = ToastData<Data>;
/** Options passed to a manager's add method. */
export type ToastManagerAddOptions<Data extends object = DefaultToastMetadata> = Readonly<PrimitiveToastManagerAddOptions<Data>>;
/** Options returned by a manager's update callback. */
export type ToastManagerUpdateOptions<Data extends object = DefaultToastMetadata> = Readonly<PrimitiveToastManagerUpdateOptions<Data>>;
/** Primitive promise states, with rejected values explicitly typed as unknown. */
export type ToastManagerPromiseOptions<Value, Data extends object = DefaultToastMetadata> = Readonly<
  Omit<PrimitiveToastManagerPromiseOptions<Value, Data>, "error"> & {
    error: string | ToastManagerUpdateOptions<Data> | ((error: unknown) => string | ToastManagerUpdateOptions<Data>);
  }
>;
/** A real Base UI manager; it is not a callable compatibility facade. */
export type ToastManager<Data extends object = DefaultToastMetadata> = Omit<PrimitiveToastManager<Data>, "promise"> & {
  promise: <Value, T extends Data = Data>(value: Promise<Value>, options: ToastManagerPromiseOptions<Value, T>) => Promise<Value>;
};
/** Provider-scoped manager state and operations. */
export type UseToastManagerReturnValue<Data extends object = DefaultToastMetadata> = Omit<
  PrimitiveUseToastManagerReturnValue<Data>,
  "promise"
>
  & Pick<ToastManager<Data>, "promise">;

/**
 * Creates an independent, primitive-owned toast manager. Mount its provider before emitting.
 *
 * @remarks
 * - A manager is an emitter, not a store: `add`, `close`, `update` and `promise` reach only the providers currently
 *   subscribed to it, that is every mounted {@link ToastProvider} or {@link Toaster} that received it as
 *   `toastManager`. Providers subscribe in an effect after mounting, so calls made earlier, or while no provider is
 *   mounted, are dropped
 * - Create it once per scope, at module level or with `React.useState(() => createToastManager())`, never on every
 *   render, so its providers stay subscribed
 * - Use the shared {@link toast} manager for one app-wide `Toaster`; create scoped managers for independent regions
 *
 * @typeParam Data - Custom metadata stored on each toast's `data`
 * @returns A new manager whose `add` returns the toast id and whose `promise` returns a promise that settles like the
 *   one it was given; `update` targets a toast id, and `close` closes one toast by id or every toast without one
 *
 * @example
 * ```tsx
 * function UploadRegion(): React.JSX.Element {
 *   const [uploads] = React.useState(() => createToastManager<{fileId: string}>());
 *   return (
 *     <Toaster
 *       toastManager={uploads}
 *       viewportProps={{"aria-label": "Upload notifications"}}>
 *       <Button onClick={() => uploads.add({title: "Upload complete", data: {fileId: "report-42"}})}>Upload</Button>
 *     </Toaster>
 *   );
 * }
 * ```
 */
function createToastManager<Data extends object = DefaultToastMetadata>(): ToastManager<Data> {
  return ToastPrimitive.createToastManager<Data>();
}

/**
 * Reads only the nearest ToastProvider's state, never the global manager's state.
 *
 * @remarks
 * - Call it inside a {@link ToastProvider} or {@link Toaster}; Base UI throws outside one
 * - Its operations act on that provider directly, without a manager, and the hook re-renders when the provider's
 *   toast list changes
 * - Use it to emit from inside a provider or to render a custom list with {@link ToastViewport} and the `Toast` parts
 *
 * @typeParam Data - Custom metadata stored on each toast's `data`
 * @returns The nearest provider's current `toasts`, plus its `add`, `close`, `update` and `promise` operations
 *
 * @example
 * ```tsx
 * function SaveDraftButton(): React.JSX.Element {
 *   const {add} = useToastManager();
 *   return <Button onClick={() => add({title: "Draft saved"})}>Save draft</Button>;
 * }
 * ```
 */
function useToastManager<Data extends object = DefaultToastMetadata>(): UseToastManagerReturnValue<Data> {
  return ToastPrimitive.useToastManager<Data>();
}

/**
 * Shared canonical manager used by Toaster unless a scoped manager is supplied.
 *
 * @remarks
 * - Every {@link Toaster} mounted without `toastManager` subscribes to it, so mount exactly one such `Toaster`; with
 *   none mounted, its calls are dropped
 * - A module-level emitter, not React state: call it from event handlers and effects anywhere in the app
 * - Toasts persist until closed unless a `timeout` is set, because the provider default is `0`
 *
 * @example
 * ```tsx
 * <>
 *   <Toaster />
 *   <Button onClick={() => toast.add({title: "Event created", description: "Saved successfully.", type: "success"})}>
 *     Create event
 *   </Button>
 * </>
 * ```
 */
const toast = createToastManager();

/** Provider props preserving typed custom data and the primitive's timeout/limit contract. */
export type ToastProviderProps<Data extends object = DefaultToastMetadata> = Readonly<
  Omit<ToastPrimitive.Provider.Props, "toastManager"> & {
    /**
     * Manager whose calls this provider renders, such as the shared {@link toast} or one from
     * {@link createToastManager}. Without one, only `useToastManager` calls inside the provider add toasts.
     */
    toastManager?: ToastManager<Data>;
    /** Auto-dismiss is off by default. Timed consumers must offer reading/extension access. @default 0 */
    timeout?: number;
  }
>;
/** Primitive-owned provider state. */
export type ToastProviderState = ToastPrimitive.Provider.State;
/**
 * Provides independent toast state; no implicit global manager is attached.
 *
 * @remarks
 * - Renders no element; it owns the toast list that `useToastManager` and the compound parts read
 * - Built on {@link https://base-ui.com/react/components/toast | Base UI Toast}
 * - `timeout` defaults to `0`, unlike Base UI's 5000 ms, so toasts persist until closed. Timed toasts need enough
 *   reading time or a way to extend it, and must not be the only place for critical instructions or errors
 * - Compose it with {@link ToastPortal}, {@link ToastViewport} and the `Toast` parts, or use {@link Toaster} for the
 *   ready-made layout
 *
 * @example
 * ```tsx
 * // NotificationRegion renders the compound list shown in the ToastViewport example.
 * <ToastProvider
 *   toastManager={toast}
 *   limit={5}>
 *   <App />
 *   <NotificationRegion />
 * </ToastProvider>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toast | Base UI Documentation}
 */
function ToastProvider<Data extends object = DefaultToastMetadata>({timeout = 0, ...props}: ToastProviderProps<Data>): React.JSX.Element {
  return (
    <ToastPrimitive.Provider
      timeout={timeout}
      {...props}
    />
  );
}

/** Primitive portal props, including its optional container. */
export type ToastPortalProps = Readonly<React.ComponentPropsWithRef<typeof ToastPrimitive.Portal>>;
/** Primitive portal state. */
export type ToastPortalState = ToastPrimitive.Portal.State;
/**
 * Portals notifications without creating another provider or manager.
 *
 * @remarks
 * - Renders Base UI's portal `<div>`, appended to `<body>` unless `container` chooses another element or shadow root
 * - Wrap the {@link ToastViewport} in it; the portal holds no toast state, so the viewport still reads the nearest
 *   {@link ToastProvider}
 *
 * @example
 * ```tsx
 * <ToastPortal container={themeRoot}>
 *   <ToastViewport aria-label='Notifications'>{toastItems}</ToastViewport>
 * </ToastPortal>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toast | Base UI Documentation}
 */
const ToastPortal = ({ref, ...props}: Readonly<ToastPortalProps>): React.JSX.Element => (
  <ToastPrimitive.Portal
    data-slot='toast-portal'
    ref={ref}
    {...props}
  />
);
ToastPortal.displayName = "ToastPortal";

/** Viewport props with primitive-owned className/render callbacks and placement. */
export type ToastViewportProps = Readonly<
  React.ComponentPropsWithRef<typeof ToastPrimitive.Viewport> & {
    /**
     * Screen placement. Top placements reverse vertical stacking.
     *
     * @default "bottom-right"
     */
    position?: ToastPosition;
    /**
     * Accessible name of the notification region landmark. Localize it, and give each mounted viewport a distinct name.
     *
     * @default "Notifications"
     */
    // eslint-disable-next-line sonarjs/no-redundant-optional -- explicit undefined preserves exactOptionalPropertyTypes caller compatibility
    "aria-label"?: string | undefined;
  }
>;
/** Primitive-owned viewport expansion state. */
export type ToastViewportState = ToastPrimitive.Viewport.State;
/**
 * Positioned, keyboard-accessible viewport. The primitive owns expansion and focus.
 *
 * @remarks
 * - Renders a `<div>` with `role="region"`, a polite live region that announces added toasts
 * - Built on {@link https://base-ui.com/react/components/toast | Base UI Toast}
 * - Its accessible name defaults to the English "Notifications"; pass a localized `aria-label`, or
 *   `viewportProps={{"aria-label": …}}` on {@link Toaster}. Each mounted viewport needs a distinct name
 * - While toasts exist, F6 moves focus into the region from anywhere on the page and pauses timers, a keyboard shortcut
 *   to toast actions and close buttons
 * - `className` may be a string or a callback that receives the viewport's live state
 *
 * @example
 * ```tsx
 * function NotificationRegion(): React.JSX.Element {
 *   const {toasts} = useToastManager();
 *   return (
 *     <ToastPortal>
 *       <ToastViewport
 *         position='top-right'
 *         aria-label='Benachrichtigungen'>
 *         {toasts.map((item) => (
 *           <Toast
 *             key={item.id}
 *             toast={item}>
 *             <ToastContent>
 *               <ToastTitle />
 *               <ToastDescription />
 *               <ToastClose aria-label='Benachrichtigung schließen' />
 *             </ToastContent>
 *           </Toast>
 *         ))}
 *       </ToastViewport>
 *     </ToastPortal>
 *   );
 * }
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toast | Base UI Documentation}
 */
const ToastViewport = ({ref, className, position = "bottom-right", ...props}: Readonly<ToastViewportProps>): React.JSX.Element => (
  <ToastPrimitive.Viewport
    data-slot='toast-viewport'
    data-position={position}
    aria-label='Notifications'
    ref={ref}
    className={typeof className === "function" ? (state) => cn(styles.viewport, className(state)) : cn(styles.viewport, className)}
    {...props}
  />
);
ToastViewport.displayName = "ToastViewport";

/** Root props retaining typed toast data and every primitive rendering/state option. */
export type ToastProps<Data extends object = DefaultToastMetadata> = Readonly<
  Omit<React.ComponentPropsWithRef<typeof ToastPrimitive.Root>, "toast"> & {toast: ToastObject<Data>}
>;
/** Primitive-owned root transition, expansion, limitation, type, and swipe state. */
export type ToastState = ToastPrimitive.Root.State;
/** Generic root component signature with the primitive's DOM-ref and custom-data contract. */
export type ToastComponent = typeof Toast;
/**
 * Groups one typed notification. Base UI exclusively owns render callback evaluation.
 *
 * @remarks
 * - Renders a `<div>` with `role="dialog"` (`"alertdialog"` for `priority: "high"`), labelled by its
 *   {@link ToastTitle} and described by its {@link ToastDescription}; it is a non-modal tab stop inside the viewport
 * - Built on {@link https://base-ui.com/react/components/toast | Base UI Toast}
 * - Pass each item of `useToastManager().toasts` as `toast`. `swipeDirection` sets the dismissal gestures; a close
 *   control keeps dismissal available without them
 * - `className` may be a string or a callback that receives the toast's live state
 *
 * @example
 * ```tsx
 * {toasts.map((item) => (
 *   <Toast
 *     key={item.id}
 *     toast={item}
 *     swipeDirection={["down", "right"]}>
 *     <ToastContent>
 *       <ToastTitle />
 *       <ToastClose />
 *     </ToastContent>
 *   </Toast>
 * ))}
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toast | Base UI Documentation}
 */
function Toast<Data extends object = DefaultToastMetadata>({ref, className, ...props}: ToastProps<Data>): React.JSX.Element {
  return (
    <ToastPrimitive.Root
      data-slot='toast'
      ref={ref}
      className={typeof className === "function" ? (state) => cn(styles.root, className(state)) : cn(styles.root, className)}
      {...props}
    />
  );
}
Toast.displayName = "Toast";

/** Primitive content props. */
export type ToastContentProps = Readonly<React.ComponentPropsWithRef<typeof ToastPrimitive.Content>>;
/** Primitive content state, including behind and expanded. */
export type ToastContentState = ToastPrimitive.Content.State;
/**
 * Toast content with collapsed-stack visibility managed by primitive data attributes.
 *
 * @remarks
 * - Renders a `<div>` element by default and supports the `render` prop for element composition
 * - Built on {@link https://base-ui.com/react/components/toast | Base UI Toast}
 * - Holds the toast's visible parts; Base UI marks content behind the frontmost toast so the collapsed stack shows
 *   only the front toast until the viewport expands
 * - `className` may be a string or a callback that receives the content's live state
 *
 * @example
 * ```tsx
 * <ToastContent>
 *   <ToastTitle />
 *   <ToastDescription />
 *   <ToastAction />
 *   <ToastClose />
 * </ToastContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toast | Base UI Documentation}
 */
const ToastContent = ({ref, className, ...props}: Readonly<ToastContentProps>): React.JSX.Element => (
  <ToastPrimitive.Content
    data-slot='toast-content'
    ref={ref}
    className={typeof className === "function" ? (state) => cn(styles.content, className(state)) : cn(styles.content, className)}
    {...props}
  />
);
ToastContent.displayName = "ToastContent";

/** Primitive title props. */
export type ToastTitleProps = Readonly<React.ComponentPropsWithRef<typeof ToastPrimitive.Title>>;
/** Primitive title state. */
export type ToastTitleState = ToastPrimitive.Title.State;
/**
 * Labels the toast using children or the manager's title, including numeric zero.
 *
 * @remarks
 * - Renders an `<h2>` element by default and supports the `render` prop for element composition
 * - Built on {@link https://base-ui.com/react/components/toast | Base UI Toast}
 * - Without children it renders the toast's `title`; Base UI references it from the toast's `aria-labelledby`
 *
 * @example
 * ```tsx
 * <ToastTitle />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toast | Base UI Documentation}
 */
const ToastTitle = ({ref, className, ...props}: Readonly<ToastTitleProps>): React.JSX.Element => (
  <ToastPrimitive.Title
    data-slot='toast-title'
    ref={ref}
    className={typeof className === "function" ? (state) => cn(styles.title, className(state)) : cn(styles.title, className)}
    {...props}
  />
);
ToastTitle.displayName = "ToastTitle";

/** Primitive description props. */
export type ToastDescriptionProps = Readonly<React.ComponentPropsWithRef<typeof ToastPrimitive.Description>>;
/** Primitive description state. */
export type ToastDescriptionState = ToastPrimitive.Description.State;
/**
 * Describes a toast without truthiness filtering valid content.
 *
 * @remarks
 * - Renders a `<p>` element by default and supports the `render` prop for element composition
 * - Built on {@link https://base-ui.com/react/components/toast | Base UI Toast}
 * - Without children it renders the toast's `description`; Base UI references it from the toast's `aria-describedby`
 *
 * @example
 * ```tsx
 * <ToastDescription />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toast | Base UI Documentation}
 */
const ToastDescription = ({ref, className, ...props}: Readonly<ToastDescriptionProps>): React.JSX.Element => (
  <ToastPrimitive.Description
    data-slot='toast-description'
    ref={ref}
    className={typeof className === "function" ? (state) => cn(styles.description, className(state)) : cn(styles.description, className)}
    {...props}
  />
);
ToastDescription.displayName = "ToastDescription";

/** Primitive action props, preserving manager actionProps and nativeButton semantics. */
export type ToastActionProps = Readonly<React.ComponentPropsWithRef<typeof ToastPrimitive.Action>>;
/** Primitive action state. */
export type ToastActionState = ToastPrimitive.Action.State;
/** Stable immutable markup template; Base UI supplies each action's own props, state and refs. */
const DEFAULT_TOAST_ACTION_RENDER = (
  <Button
    variant='outline'
    size='sm'
  />
);
/**
 * Optional action composed with the reviewed Button; Base UI owns its render callback.
 *
 * @remarks
 * - Renders an outline, small package `Button` by default; `render` replaces that presentation
 * - Built on {@link https://base-ui.com/react/components/toast | Base UI Toast}
 * - Renders nothing unless it has content: the toast's `actionProps.children` from the manager, or its own children.
 *   Give it a specific name, such as "Undo", because the action may be read without the toast's context
 * - Keyboard users can reach it with the viewport's F6 shortcut. A required action must also be available outside a
 *   toast that can time out
 *
 * @example
 * ```tsx
 * toast.add({title: "Message archived", actionProps: {children: "Undo", onClick: restoreMessage}});
 *
 * <ToastAction />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toast | Base UI Documentation}
 */
const ToastAction = ({ref, className, render = DEFAULT_TOAST_ACTION_RENDER, ...props}: Readonly<ToastActionProps>): React.JSX.Element => (
  <ToastPrimitive.Action
    data-slot='toast-action'
    ref={ref}
    render={render}
    className={typeof className === "function" ? (state) => cn(styles.action, className(state)) : cn(styles.action, className)}
    {...props}
  />
);
ToastAction.displayName = "ToastAction";

/** Primitive close props. Custom render targets own their name; icon-only custom targets require an accessible label. */
export type ToastCloseProps = Readonly<React.ComponentPropsWithRef<typeof ToastPrimitive.Close>>;
/** Primitive close state. */
export type ToastCloseState = ToastPrimitive.Close.State;
/**
 * Closes the notification through its own provider's manager.
 *
 * @remarks
 * - Renders a ghost icon `<button>` with an `X` icon by default; `render` and `children` replace that presentation
 * - Built on {@link https://base-ui.com/react/components/toast | Base UI Toast}
 * - The default icon-only close is named "Close toast" (English); localize it with `aria-label`, or with `closeLabel`
 *   on {@link Toaster}. Custom render targets and children own their name, and icon-only ones need an `aria-label`
 * - Base UI hides it from assistive technology while the stack is collapsed, unless the close button itself has focus
 *
 * @example
 * ```tsx
 * <ToastClose aria-label='Fermer la notification' />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toast | Base UI Documentation}
 */
const ToastClose = ({ref, className, children, render, ...props}: Readonly<ToastCloseProps>): React.JSX.Element => (
  <ToastPrimitive.Close
    data-slot='toast-close'
    aria-label={render === undefined && (children === null || children === undefined) ? "Close toast" : undefined}
    ref={ref}
    render={
      render ?? (
        <button
          type='button'
          className={cn(buttonStyles.button, buttonStyles.ghost, buttonStyles.sizeIconSm)}
        />
      )
    }
    className={typeof className === "function" ? (state) => cn(styles.close, className(state)) : cn(styles.close, className)}
    {...props}>
    {children ?? (
      <X
        aria-hidden='true'
        className={styles.icon}
      />
    )}
  </ToastPrimitive.Close>
);
ToastClose.displayName = "ToastClose";

function ToastIcon({type}: Readonly<{type: string | undefined}>): React.JSX.Element | null {
  const icons: Readonly<Record<string, React.ReactNode>> = {
    success: (
      <CircleCheck
        aria-hidden='true'
        className={styles.icon}
      />
    ),
    info: (
      <Info
        aria-hidden='true'
        className={styles.icon}
      />
    ),
    warning: (
      <TriangleAlert
        aria-hidden='true'
        className={styles.icon}
      />
    ),
    error: (
      <OctagonX
        aria-hidden='true'
        className={styles.icon}
      />
    ),
    loading: (
      <LoaderCircle
        aria-hidden='true'
        className={cn(styles.icon, styles.iconSpin)}
      />
    ),
  };
  const icon = type !== undefined && Object.hasOwn(icons, type) ? icons[type] : null;
  return icon ? (
    <span
      data-slot='toast-icon'
      className={styles.leading}>
      {icon}
    </span>
  ) : null;
}

function ToastList<Data extends object>({
  position,
  closeLabel,
}: Readonly<{position: ToastPosition; closeLabel: string}>): React.JSX.Element {
  const {toasts} = useToastManager<Data>();
  return (
    <>
      {toasts.map((item) => (
        <Toast
          key={item.id}
          toast={item}
          swipeDirection={position.startsWith("top") ? ["up", "right"] : ["down", "right"]}>
          <ToastContent>
            <ToastIcon type={item.type} />
            <div className={styles.body}>
              <ToastTitle />
              <ToastDescription />
            </div>
            <ToastAction />
            <ToastClose aria-label={closeLabel} />
          </ToastContent>
        </Toast>
      ))}
    </>
  );
}

/** Provider props plus explicit viewport configuration, children and a viewport ref. */
export type ToasterProps<Data extends object = DefaultToastMetadata> = ToastProviderProps<Data>
  & Readonly<{
    /**
     * Screen placement of the viewport; `viewportProps.position` takes precedence.
     *
     * @default "bottom-right"
     */
    position?: ToastPosition;
    /** Localized accessible name for the default icon-only close controls. @default "Close toast" */
    closeLabel?: string;
    /** Configuration only; use compound primitives for custom notification-list children. */
    viewportProps?: Omit<ToastViewportProps, "children">;
    ref?: React.Ref<HTMLDivElement>;
  }>;
/** Generic composition signature preserving manager metadata and viewport refs. */
export type ToasterComponent = typeof Toaster;
/**
 * Ready-made typed composition; children share only this provider's manager.
 *
 * @remarks
 * - Renders a {@link ToastProvider} around its children and a portaled {@link ToastViewport} that lists every toast
 *   with a type icon, title, description, optional action and an icon close; `ref` reaches the viewport
 * - Without `toastManager` it renders the shared {@link toast} manager's calls; with one, only that manager's. Every
 *   mounted `Toaster` subscribed to a manager renders its toasts, so mount one per manager
 * - Toasts persist until closed because `timeout` defaults to `0`; timed toasts need enough reading time and must not
 *   be the only place for critical instructions or errors
 * - Localize the region name with `viewportProps={{"aria-label": …}}` (default "Notifications") and the close
 *   buttons' name with `closeLabel` (default "Close toast")
 *
 * @example
 * ```tsx
 * <Toaster
 *   position='top-center'
 *   closeLabel='Fermer la notification'
 *   viewportProps={{"aria-label": "Notifications de l’application"}}>
 *   <App />
 * </Toaster>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toast | Base UI Documentation}
 */
function Toaster<Data extends object = DefaultToastMetadata>({
  ref,
  children,
  toastManager,
  position = "bottom-right",
  closeLabel = "Close toast",
  viewportProps,
  ...props
}: ToasterProps<Data>): React.JSX.Element {
  const {ref: viewportRef, ...nativeViewportProps} = viewportProps ?? {};
  const mergedRef = useMergedRefs(ref, viewportRef);
  const viewportPosition = viewportProps?.position ?? position;
  const content = (
    <>
      {children}
      <ToastPortal>
        <ToastViewport
          position={viewportPosition}
          ref={mergedRef}
          {...nativeViewportProps}>
          <ToastList<Data>
            position={viewportPosition}
            closeLabel={closeLabel}
          />
        </ToastViewport>
      </ToastPortal>
    </>
  );
  return toastManager ? (
    <ToastProvider<Data>
      toastManager={toastManager}
      {...props}>
      {content}
    </ToastProvider>
  ) : (
    <ToastProvider
      toastManager={toast}
      {...props}>
      {content}
    </ToastProvider>
  );
}
Toaster.displayName = "Toaster";

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
};
