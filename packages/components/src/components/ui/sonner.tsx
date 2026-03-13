"use client";

/**
 * @fileoverview Base UI-backed toast provider and imperative toast bridge.
 *
 * Replaces the previous `sonner` runtime dependency while preserving the existing public exports:
 * `Toaster` for container rendering and `toast` for imperative notifications used throughout the
 * website and component consumers.
 */

import {Toast} from "@base-ui/react/toast";
import {AlertCircle, BellRing, CheckCircle2, Info, LoaderCircle, TriangleAlert, X} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./sonner.module.css";

const DEFAULT_TOAST_DURATION = 5000;
const DEFAULT_TOAST_LIMIT = 3;
const DEFAULT_TOAST_CLOSE_LABEL = "Close notification";
const DEFAULT_VIEWPORT_ARIA_LABEL = "Notifications";

type ToastPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center";
type ToastVariant = "default" | "success" | "error" | "info" | "warning" | "loading";
type ToastIdentifier = number | string;
type ToastRenderable = React.ReactNode | (() => React.ReactNode);
type ToastPromise<Value> = Promise<Value> | (() => Promise<Value>);
type ResolvedPromiseState = ToastRenderable | ToastPromiseResolvedOptions | undefined;

interface ToastAction {
  label: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

type ToastActionRenderable = React.ReactNode | ToastAction;

interface ToastOptions {
  id?: ToastIdentifier;
  description?: ToastRenderable;
  duration?: number;
  className?: string;
  descriptionClassName?: string;
  closeButton?: boolean;
  closeButtonAriaLabel?: string;
  style?: React.CSSProperties;
  priority?: "high" | "low";
  action?: ToastActionRenderable;
  cancel?: ToastActionRenderable;
  onDismiss?: (toast: ToastSnapshot) => void;
  onAutoClose?: (toast: ToastSnapshot) => void;
}

interface ToastPromiseResolvedOptions extends ToastOptions {
  message: ToastRenderable;
}

type ToastPromiseState<Value> =
  | ToastRenderable
  | ToastPromiseResolvedOptions
  | ((value: Value) => ToastRenderable | ToastPromiseResolvedOptions | Promise<ToastRenderable | ToastPromiseResolvedOptions>);

interface ToastPromiseOptions<Value> extends ToastOptions {
  loading?: ToastRenderable | ToastPromiseResolvedOptions;
  success?: ToastPromiseState<Value>;
  error?: ToastPromiseState<unknown>;
  finally?: () => void | Promise<void>;
}

interface ToasterProps {
  position?: ToastPosition;
  duration?: number;
  visibleToasts?: number;
  closeButton?: boolean;
  containerAriaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  toastOptions?: ToastOptions;
}

interface ToastSnapshot {
  id: string;
  variant: ToastVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
}

interface ToastMetadata {
  variant: ToastVariant;
  className?: string;
  descriptionClassName?: string;
  closeButton: boolean;
  closeButtonAriaLabel: string;
  style?: React.CSSProperties;
  action?: ToastActionRenderable;
  cancel?: ToastActionRenderable;
  customContent?: React.ReactNode;
}

interface ToastApi {
  (message: ToastRenderable, options?: ToastOptions): string;
  success: (message: ToastRenderable, options?: ToastOptions) => string;
  error: (message: ToastRenderable, options?: ToastOptions) => string;
  info: (message: ToastRenderable, options?: ToastOptions) => string;
  warning: (message: ToastRenderable, options?: ToastOptions) => string;
  loading: (message: ToastRenderable, options?: ToastOptions) => string;
  message: (message: ToastRenderable, options?: ToastOptions) => string;
  dismiss: (toastId?: ToastIdentifier) => string | undefined;
  promise: <Value>(promise: ToastPromise<Value>, options?: ToastPromiseOptions<Value>) => Promise<Value>;
  custom: (renderer: (toastId: string) => React.ReactElement, options?: ToastOptions) => string;
  getToasts: () => ReadonlyArray<ToastSnapshot>;
  getHistory: () => ReadonlyArray<ToastSnapshot>;
}

const positionStyles: Record<ToastPosition, string> = {
  "bottom-center": styles.viewportBottomCenter,
  "bottom-left": styles.viewportBottomLeft,
  "bottom-right": styles.viewportBottomRight,
  "top-center": styles.viewportTopCenter,
  "top-left": styles.viewportTopLeft,
  "top-right": styles.viewportTopRight,
};

const variantStyles: Record<ToastVariant, string> = {
  default: styles.default,
  error: styles.error,
  info: styles.info,
  loading: styles.loading,
  success: styles.success,
  warning: styles.warning,
};

const toastManager = Toast.createToastManager<ToastMetadata>();
type ToastAddOptions = Parameters<typeof toastManager.add>[0];
const toastHistory: ToastSnapshot[] = [];
const activeToasts = new Map<string, ToastSnapshot>();

let toastSequence = 0;
let defaultCloseButton = true;
let defaultToastOptions: ToastOptions = {};

function createToastIdentifier(identifier?: ToastIdentifier): string {
  if (identifier !== undefined) {
    return String(identifier);
  }

  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  toastSequence += 1;
  return `toast-${String(toastSequence)}`;
}

function isRenderableFactory(value: ToastRenderable | undefined): value is () => React.ReactNode {
  return typeof value === "function";
}

// eslint-disable-next-line sonarjs/function-return-type -- React renderables intentionally normalize to one public node type.
function resolveRenderable(value?: ToastRenderable): React.ReactNode | undefined {
  const resolvedValue = isRenderableFactory(value) ? value() : value;
  return resolvedValue;
}

function getSnapshot(id: string, variant: ToastVariant, title?: React.ReactNode, description?: React.ReactNode): ToastSnapshot {
  return {
    description,
    id,
    title,
    variant,
  };
}

function registerToast(snapshot: ToastSnapshot): void {
  activeToasts.set(snapshot.id, snapshot);
  toastHistory.push(snapshot);
}

function unregisterToast(toastId?: string): void {
  if (!toastId) {
    activeToasts.clear();
    return;
  }

  activeToasts.delete(toastId);
}

function mergeToastOptions(options?: ToastOptions): ToastOptions {
  return {
    ...defaultToastOptions,
    ...options,
  };
}

function isToastVariant(value: string | undefined): value is ToastVariant {
  return value === "default" || value === "error" || value === "info" || value === "loading" || value === "success" || value === "warning";
}

function buildToastOptions(message: ToastRenderable, variant: ToastVariant, options?: ToastOptions): ToastAddOptions {
  const mergedOptions = mergeToastOptions(options);
  const toastId = createToastIdentifier(mergedOptions.id);
  const title = resolveRenderable(message);
  const description = resolveRenderable(mergedOptions.description);
  const snapshot = getSnapshot(toastId, variant, title, description);

  registerToast(snapshot);

  return {
    description,
    id: toastId,
    onClose: () => {
      mergedOptions.onDismiss?.(snapshot);
    },
    onRemove: () => {
      unregisterToast(toastId);
      mergedOptions.onAutoClose?.(snapshot);
    },
    priority: mergedOptions.priority,
    timeout: mergedOptions.duration,
    title,
    type: variant,
    data: {
      action: mergedOptions.action,
      cancel: mergedOptions.cancel,
      className: mergedOptions.className,
      closeButton: mergedOptions.closeButton ?? defaultCloseButton,
      closeButtonAriaLabel: mergedOptions.closeButtonAriaLabel ?? DEFAULT_TOAST_CLOSE_LABEL,
      descriptionClassName: mergedOptions.descriptionClassName,
      style: mergedOptions.style,
      variant,
    },
  };
}

function showToast(message: ToastRenderable, variant: ToastVariant, options?: ToastOptions): string {
  const payload = buildToastOptions(message, variant, options);
  return toastManager.add(payload);
}

function dismissToast(toastId?: ToastIdentifier): string | undefined {
  if (toastId === undefined) {
    unregisterToast();
    toastManager.close();
    return undefined;
  }

  const normalizedToastId = String(toastId);
  unregisterToast(normalizedToastId);
  toastManager.close(normalizedToastId);
  return normalizedToastId;
}

function resolvePromiseState<Value>(state: ToastPromiseState<Value> | ResolvedPromiseState, value: Value): Promise<ResolvedPromiseState> {
  if (typeof state === "function") {
    return Promise.resolve(state(value));
  }

  return Promise.resolve(state);
}

function isPromiseResolvedOptions(value: ToastRenderable | ToastPromiseResolvedOptions | undefined): value is ToastPromiseResolvedOptions {
  return typeof value === "object" && value !== null && "message" in value;
}

function isToastAction(value: ToastActionRenderable | undefined): value is ToastAction {
  if (React.isValidElement(value)) {
    return false;
  }

  return typeof value === "object" && value !== null && "label" in value && "onClick" in value;
}

// eslint-disable-next-line sonarjs/function-return-type -- Variant selection intentionally maps to React nodes for a single icon slot.
function getVariantIcon(variant: ToastVariant): React.ReactNode {
  const icons: Record<ToastVariant, React.ReactNode> = {
    default: (
      <BellRing
        aria-hidden='true'
        className={styles.icon}
      />
    ),
    error: (
      <AlertCircle
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
    loading: (
      <LoaderCircle
        aria-hidden='true'
        className={cn(styles.icon, styles.iconSpin)}
      />
    ),
    success: (
      <CheckCircle2
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
  };

  return icons[variant];
}

function ToastActions({
  toastId,
  action,
  cancel,
}: Readonly<{toastId: string; action?: ToastActionRenderable; cancel?: ToastActionRenderable}>): React.JSX.Element | null {
  if (!action && !cancel) {
    return null;
  }

  const renderAction = (value: ToastActionRenderable | undefined, className: string): React.ReactElement | null => {
    if (!value) {
      return null;
    }

    if (React.isValidElement(value)) {
      return value;
    }

    if (isToastAction(value)) {
      return (
        <button
          className={className}
          type='button'
          onClick={(event) => {
            value.onClick(event);
            dismissToast(toastId);
          }}>
          {value.label}
        </button>
      );
    }

    return null;
  };

  return (
    <div className={styles.actions}>
      {renderAction(cancel, styles.secondaryAction)}
      {renderAction(action, styles.primaryAction)}
    </div>
  );
}

function ToastViewportContent(): React.JSX.Element {
  const {toasts} = Toast.useToastManager<ToastMetadata>();

  return (
    <>
      {toasts.map((toastItem) => {
        const variant = isToastVariant(toastItem.type) ? toastItem.type : "default";
        const action = toastItem.data?.action;
        const cancel = toastItem.data?.cancel;

        return (
          <Toast.Root
            key={toastItem.id}
            toast={toastItem}
            className={cn(styles.root, variantStyles[variant], toastItem.data?.className)}
            data-variant={variant}
            style={toastItem.data?.style}>
            <Toast.Content className={styles.content}>
              {toastItem.data?.customContent ?? (
                <>
                  <div className={styles.leading}>{getVariantIcon(variant)}</div>
                  <div className={styles.body}>
                    {toastItem.title ? <Toast.Title className={styles.title}>{toastItem.title}</Toast.Title> : null}
                    {toastItem.description ? (
                      <Toast.Description className={cn(styles.description, toastItem.data?.descriptionClassName)}>
                        {toastItem.description}
                      </Toast.Description>
                    ) : null}
                    <ToastActions
                      action={action}
                      cancel={cancel}
                      toastId={toastItem.id}
                    />
                  </div>
                  {toastItem.data?.closeButton ? (
                    <Toast.Close
                      aria-label={toastItem.data.closeButtonAriaLabel}
                      className={styles.close}>
                      <X
                        aria-hidden='true'
                        className={styles.closeIcon}
                      />
                    </Toast.Close>
                  ) : null}
                </>
              )}
            </Toast.Content>
          </Toast.Root>
        );
      })}
    </>
  );
}

/**
 * Toast notification container.
 *
 * @remarks
 * Renders the Base UI provider, portal, and viewport with defaults that preserve the previous
 * shared `Toaster` export behavior used by the website.
 *
 * @param props - Toast container configuration.
 * @returns The toast provider tree and viewport portal.
 */
function Toaster({
  className,
  closeButton = true,
  containerAriaLabel = DEFAULT_VIEWPORT_ARIA_LABEL,
  duration = DEFAULT_TOAST_DURATION,
  position = "bottom-right",
  style,
  toastOptions,
  visibleToasts = DEFAULT_TOAST_LIMIT,
}: Readonly<ToasterProps>): React.JSX.Element {
  React.useEffect(() => {
    defaultCloseButton = closeButton;
    defaultToastOptions = toastOptions ?? {};

    return () => {
      defaultCloseButton = true;
      defaultToastOptions = {};
    };
  }, [closeButton, toastOptions]);

  return (
    <Toast.Provider
      limit={visibleToasts}
      timeout={duration}
      toastManager={toastManager}>
      <Toast.Portal>
        <Toast.Viewport
          aria-label={containerAriaLabel}
          className={cn(styles.viewport, positionStyles[position], className)}
          style={style}>
          <ToastViewportContent />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

const toast = ((message: ToastRenderable, options?: ToastOptions): string => showToast(message, "default", options)) as ToastApi;

toast.success = (message: ToastRenderable, options?: ToastOptions): string => showToast(message, "success", options);
toast.error = (message: ToastRenderable, options?: ToastOptions): string => showToast(message, "error", options);
toast.info = (message: ToastRenderable, options?: ToastOptions): string => showToast(message, "info", options);
toast.warning = (message: ToastRenderable, options?: ToastOptions): string => showToast(message, "warning", options);
toast.loading = (message: ToastRenderable, options?: ToastOptions): string => showToast(message, "loading", options);
toast.message = (message: ToastRenderable, options?: ToastOptions): string => showToast(message, "default", options);
toast.dismiss = (toastId?: ToastIdentifier): string | undefined => dismissToast(toastId);
toast.custom = (renderer: (toastId: string) => React.ReactElement, options?: ToastOptions): string => {
  const mergedOptions = mergeToastOptions(options);
  const toastId = createToastIdentifier(mergedOptions.id);
  const snapshot = getSnapshot(toastId, "default");

  registerToast(snapshot);

  toastManager.add({
    id: toastId,
    onClose: () => {
      mergedOptions.onDismiss?.(snapshot);
    },
    onRemove: () => {
      unregisterToast(toastId);
      mergedOptions.onAutoClose?.(snapshot);
    },
    priority: mergedOptions.priority,
    timeout: mergedOptions.duration,
    data: {
      action: mergedOptions.action,
      cancel: mergedOptions.cancel,
      className: mergedOptions.className,
      closeButton: mergedOptions.closeButton ?? defaultCloseButton,
      closeButtonAriaLabel: mergedOptions.closeButtonAriaLabel ?? DEFAULT_TOAST_CLOSE_LABEL,
      customContent: renderer(toastId),
      descriptionClassName: mergedOptions.descriptionClassName,
      style: mergedOptions.style,
      variant: "default",
    },
  });

  return toastId;
};
function mergePromiseToastOptions(baseOptions: ToastOptions, override?: ToastPromiseResolvedOptions): ToastOptions {
  if (!override) {
    return baseOptions;
  }

  return {
    action: override.action ?? baseOptions.action,
    cancel: override.cancel ?? baseOptions.cancel,
    className: override.className ?? baseOptions.className,
    closeButton: override.closeButton ?? baseOptions.closeButton,
    closeButtonAriaLabel: override.closeButtonAriaLabel ?? baseOptions.closeButtonAriaLabel,
    description: override.description ?? baseOptions.description,
    descriptionClassName: override.descriptionClassName ?? baseOptions.descriptionClassName,
    duration: override.duration ?? baseOptions.duration,
    id: override.id ?? baseOptions.id,
    onAutoClose: override.onAutoClose ?? baseOptions.onAutoClose,
    onDismiss: override.onDismiss ?? baseOptions.onDismiss,
    priority: override.priority ?? baseOptions.priority,
    style: override.style ?? baseOptions.style,
  };
}

function getPromiseBaseOptions<Value>(options?: ToastPromiseOptions<Value>): ToastOptions {
  return {
    action: options?.action,
    cancel: options?.cancel,
    className: options?.className,
    closeButton: options?.closeButton,
    closeButtonAriaLabel: options?.closeButtonAriaLabel,
    description: options?.description,
    descriptionClassName: options?.descriptionClassName,
    duration: options?.duration,
    id: options?.id,
    onAutoClose: options?.onAutoClose,
    onDismiss: options?.onDismiss,
    priority: options?.priority,
    style: options?.style,
  };
}

function showResolvedPromiseToast(
  variant: Exclude<ToastVariant, "default">,
  resolvedState: ToastRenderable | ToastPromiseResolvedOptions | undefined,
  baseOptions: ToastOptions,
): void {
  if (!resolvedState) {
    return;
  }

  const overrideOptions = isPromiseResolvedOptions(resolvedState) ? resolvedState : undefined;
  const message = isPromiseResolvedOptions(resolvedState) ? resolvedState.message : resolvedState;
  showToast(message, variant, mergePromiseToastOptions(baseOptions, overrideOptions));
}

toast.promise = async function promise<Value>(promiseValue: ToastPromise<Value>, options?: ToastPromiseOptions<Value>): Promise<Value> {
  const pendingPromise = typeof promiseValue === "function" ? promiseValue() : promiseValue;
  const baseOptions = getPromiseBaseOptions(options);
  const loadingState = options?.loading;
  const loadingOptions = isPromiseResolvedOptions(loadingState) ? loadingState : undefined;
  const loadingMessage = isPromiseResolvedOptions(loadingState) ? loadingState.message : loadingState;
  const loadingToastId = loadingMessage ? toast.loading(loadingMessage, mergePromiseToastOptions(baseOptions, loadingOptions)) : undefined;

  try {
    const result = await pendingPromise;
    const successState = await resolvePromiseState(options?.success, result);
    if (loadingToastId) {
      dismissToast(loadingToastId);
    }
    showResolvedPromiseToast("success", successState, baseOptions);

    return result;
  } catch (error: unknown) {
    const errorState = await resolvePromiseState(options?.error, error);
    if (loadingToastId) {
      dismissToast(loadingToastId);
    }
    showResolvedPromiseToast("error", errorState, baseOptions);

    throw error;
  } finally {
    const handleFinally = options?.finally;
    if (handleFinally) {
      await handleFinally();
    }
  }
};
toast.getToasts = (): ReadonlyArray<ToastSnapshot> => [...activeToasts.values()];
toast.getHistory = (): ReadonlyArray<ToastSnapshot> => [...toastHistory];

export {toast, Toaster};
