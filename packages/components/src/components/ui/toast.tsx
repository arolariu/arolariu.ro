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

import {cn} from "@/lib/utilities";
import {Button} from "./button";
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

/** Creates an independent, primitive-owned toast manager. Mount its provider before emitting. */
function createToastManager<Data extends object = DefaultToastMetadata>(): ToastManager<Data> {
  return ToastPrimitive.createToastManager<Data>();
}

/** Reads only the nearest ToastProvider's state, never the global manager's state. */
function useToastManager<Data extends object = DefaultToastMetadata>(): UseToastManagerReturnValue<Data> {
  return ToastPrimitive.useToastManager<Data>();
}

/** Shared canonical manager used by Toaster unless a scoped manager is supplied. */
const toast = createToastManager();

/** Provider props preserving typed custom data and the primitive's timeout/limit contract. */
export type ToastProviderProps<Data extends object = DefaultToastMetadata> = Readonly<
  Omit<ToastPrimitive.Provider.Props, "toastManager"> & {toastManager?: ToastManager<Data>}
>;
/** Primitive-owned provider state. */
export type ToastProviderState = ToastPrimitive.Provider.State;
/** Provides independent toast state; no implicit global manager is attached. */
function ToastProvider<Data extends object = DefaultToastMetadata>(props: ToastProviderProps<Data>): React.JSX.Element {
  return <ToastPrimitive.Provider {...props} />;
}

/** Primitive portal props, including its optional container. */
export type ToastPortalProps = Readonly<React.ComponentPropsWithRef<typeof ToastPrimitive.Portal>>;
/** Primitive portal state. */
export type ToastPortalState = ToastPrimitive.Portal.State;
/** Portals notifications without creating another provider or manager. */
const ToastPortal = React.forwardRef<HTMLDivElement, ToastPortalProps>((props, ref) => (
  <ToastPrimitive.Portal
    data-slot='toast-portal'
    {...props}
    ref={ref}
  />
));
ToastPortal.displayName = "ToastPortal";

/** Viewport props with primitive-owned className/render callbacks and placement. */
export type ToastViewportProps = Readonly<React.ComponentPropsWithRef<typeof ToastPrimitive.Viewport> & {position?: ToastPosition}>;
/** Primitive-owned viewport expansion state. */
export type ToastViewportState = ToastPrimitive.Viewport.State;
/** Positioned, keyboard-accessible viewport. The primitive owns expansion and focus. */
const ToastViewport = React.forwardRef<HTMLDivElement, ToastViewportProps>(({className, position = "bottom-right", ...props}, ref) => (
  <ToastPrimitive.Viewport
    data-slot='toast-viewport'
    data-position={position}
    aria-label='Notifications'
    {...props}
    ref={ref}
    className={typeof className === "function" ? (state) => cn(styles.viewport, className(state)) : cn(styles.viewport, className)}
  />
));
ToastViewport.displayName = "ToastViewport";

/** Root props retaining typed toast data and every primitive rendering/state option. */
export type ToastProps<Data extends object = DefaultToastMetadata> = Readonly<
  Omit<React.ComponentPropsWithRef<typeof ToastPrimitive.Root>, "toast"> & {toast: ToastObject<Data>}
>;
/** Primitive-owned root transition, expansion, limitation, type, and swipe state. */
export type ToastState = ToastPrimitive.Root.State;
/** Generic root component signature with the primitive's DOM-ref and custom-data contract. */
export interface ToastComponent {
  <Data extends object = DefaultToastMetadata>(props: ToastProps<Data>): React.ReactNode;
}
const ForwardedToast = React.forwardRef<HTMLDivElement, ToastProps<object>>(({className, ...props}, ref) => (
  <ToastPrimitive.Root
    data-slot='toast'
    {...props}
    ref={ref}
    className={typeof className === "function" ? (state) => cn(styles.root, className(state)) : cn(styles.root, className)}
  />
));
ForwardedToast.displayName = "Toast";
/** Groups one typed notification. Base UI exclusively owns render callback evaluation. */
const Toast: ToastComponent = ForwardedToast;

/** Primitive content props. */
export type ToastContentProps = Readonly<React.ComponentPropsWithRef<typeof ToastPrimitive.Content>>;
/** Primitive content state, including behind and expanded. */
export type ToastContentState = ToastPrimitive.Content.State;
/** Toast content with collapsed-stack visibility managed by primitive data attributes. */
const ToastContent = React.forwardRef<HTMLDivElement, ToastContentProps>(({className, ...props}, ref) => (
  <ToastPrimitive.Content
    data-slot='toast-content'
    {...props}
    ref={ref}
    className={typeof className === "function" ? (state) => cn(styles.content, className(state)) : cn(styles.content, className)}
  />
));
ToastContent.displayName = "ToastContent";

/** Primitive title props. */
export type ToastTitleProps = Readonly<React.ComponentPropsWithRef<typeof ToastPrimitive.Title>>;
/** Primitive title state. */
export type ToastTitleState = ToastPrimitive.Title.State;
/** Labels the toast using children or the manager's title, including numeric zero. */
const ToastTitle = React.forwardRef<HTMLHeadingElement, ToastTitleProps>(({className, ...props}, ref) => (
  <ToastPrimitive.Title
    data-slot='toast-title'
    {...props}
    ref={ref}
    className={typeof className === "function" ? (state) => cn(styles.title, className(state)) : cn(styles.title, className)}
  />
));
ToastTitle.displayName = "ToastTitle";

/** Primitive description props. */
export type ToastDescriptionProps = Readonly<React.ComponentPropsWithRef<typeof ToastPrimitive.Description>>;
/** Primitive description state. */
export type ToastDescriptionState = ToastPrimitive.Description.State;
/** Describes a toast without truthiness filtering valid content. */
const ToastDescription = React.forwardRef<HTMLParagraphElement, ToastDescriptionProps>(({className, ...props}, ref) => (
  <ToastPrimitive.Description
    data-slot='toast-description'
    {...props}
    ref={ref}
    className={typeof className === "function" ? (state) => cn(styles.description, className(state)) : cn(styles.description, className)}
  />
));
ToastDescription.displayName = "ToastDescription";

/** Primitive action props, preserving manager actionProps and nativeButton semantics. */
export type ToastActionProps = Readonly<React.ComponentPropsWithRef<typeof ToastPrimitive.Action>>;
/** Primitive action state. */
export type ToastActionState = ToastPrimitive.Action.State;
/** Optional action composed with the reviewed Button; Base UI owns its render callback. */
const ToastAction = React.forwardRef<HTMLButtonElement, ToastActionProps>(
  (
    {
      className,
      render = (
        <Button
          variant='outline'
          size='sm'
        />
      ),
      ...props
    },
    ref,
  ) => (
    <ToastPrimitive.Action
      data-slot='toast-action'
      {...props}
      ref={ref}
      render={render}
      className={typeof className === "function" ? (state) => cn(styles.action, className(state)) : cn(styles.action, className)}
    />
  ),
);
ToastAction.displayName = "ToastAction";

/** Primitive close props. Consumers can override the default accessible label and children. */
export type ToastCloseProps = Readonly<React.ComponentPropsWithRef<typeof ToastPrimitive.Close>>;
/** Primitive close state. */
export type ToastCloseState = ToastPrimitive.Close.State;
/** Closes the notification through its own provider's manager. */
const ToastClose = React.forwardRef<HTMLButtonElement, ToastCloseProps>(
  (
    {
      className,
      children,
      render = (
        <Button
          variant='ghost'
          size='icon-sm'
        />
      ),
      ...props
    },
    ref,
  ) => (
    <ToastPrimitive.Close
      data-slot='toast-close'
      aria-label='Close toast'
      {...props}
      ref={ref}
      render={render}
      className={typeof className === "function" ? (state) => cn(styles.close, className(state)) : cn(styles.close, className)}>
      {children ?? (
        <X
          aria-hidden='true'
          className={styles.icon}
        />
      )}
    </ToastPrimitive.Close>
  ),
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

function ToastList<Data extends object>({position}: Readonly<{position: ToastPosition}>): React.JSX.Element {
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
            <ToastClose />
          </ToastContent>
        </Toast>
      ))}
    </>
  );
}

/** Provider props plus explicit viewport configuration, children and a viewport ref. */
export type ToasterProps<Data extends object = DefaultToastMetadata> = ToastProviderProps<Data>
  & Readonly<{
    position?: ToastPosition;
    /** Configuration only; use compound primitives for custom notification-list children. */
    viewportProps?: Omit<ToastViewportProps, "children">;
    ref?: React.Ref<HTMLDivElement>;
  }>;
/** Generic composition signature preserving manager metadata and viewport refs. */
export interface ToasterComponent {
  <Data extends object = DefaultToastMetadata>(props: ToasterProps<Data>): React.ReactNode;
}
const ForwardedToaster = React.forwardRef<HTMLDivElement, ToasterProps<object>>(
  ({children, toastManager, position = "bottom-right", viewportProps, ...props}, ref) => {
    const viewportPosition = viewportProps?.position ?? position;
    return (
      <ToastProvider
        {...props}
        toastManager={toastManager ?? toast}>
        {children}
        <ToastPortal>
          <ToastViewport
            {...viewportProps}
            position={viewportPosition}
            ref={ref ?? viewportProps?.ref}>
            <ToastList<object> position={viewportPosition} />
          </ToastViewport>
        </ToastPortal>
      </ToastProvider>
    );
  },
);
ForwardedToaster.displayName = "Toaster";
/** Ready-made typed composition; children share only this provider's manager. */
const Toaster: ToasterComponent = ForwardedToaster;

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
