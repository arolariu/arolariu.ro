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
  /**
   * Screen position used for the toast viewport.
   * @default "bottom-right"
   */
  position?: ToastPosition;
  /**
   * Default auto-dismiss duration, in milliseconds, for each toast.
   * @default 5000
   */
  duration?: number;
  /**
   * Maximum number of simultaneously visible toasts.
   * @default 3
   */
  visibleToasts?: number;
  /**
   * Whether to render a close button for each toast by default.
   * @default true
   */
  closeButton?: boolean;
  /**
   * Accessible label announced for the toast viewport container.
   * @default "Notifications"
   */
  containerAriaLabel?: string;
  /**
   * Additional CSS classes merged with the toast viewport.
   * @default undefined
   */
  className?: string;
  /**
   * Inline styles applied to the toast viewport.
   * @default undefined
   */
  style?: React.CSSProperties;
  /**
   * Default options merged into each toast created while this toaster is mounted.
   * @default undefined
   */
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

interface ToastUpdateOptions extends ToastOptions {
  message?: ToastRenderable;
  variant?: ToastVariant;
}

interface ToasterRegistration {
  closeButton: boolean;
  toastOptions: ToastOptions;
}

interface ToastRecord {
  metadata: ToastMetadata;
  options: ToastOptions;
  snapshot: ToastSnapshot;
}

interface ToastApi {
  (message: ToastRenderable, options?: ToastOptions): string;
  success: (message: ToastRenderable, options?: ToastOptions) => string;
  error: (message: ToastRenderable, options?: ToastOptions) => string;
  info: (message: ToastRenderable, options?: ToastOptions) => string;
  warning: (message: ToastRenderable, options?: ToastOptions) => string;
  loading: (message: ToastRenderable, options?: ToastOptions) => string;
  message: (message: ToastRenderable, options?: ToastOptions) => string;
  update: (toastId: ToastIdentifier, options: ToastUpdateOptions) => string;
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
type ToastUpdatePayload = Parameters<typeof toastManager.update>[1];
const toastHistory: ToastSnapshot[] = [];
const activeToasts = new Map<string, ToastSnapshot>();
const toastRecords = new Map<string, ToastRecord>();
const toasterRegistrations = new Map<string, ToasterRegistration>();

let toastSequence = 0;

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

function registerToastRecord(record: ToastRecord): void {
  toastRecords.set(record.snapshot.id, record);
  registerToast(record.snapshot);
}

function replaceToastHistorySnapshot(snapshot: ToastSnapshot): void {
  for (let index = toastHistory.length - 1; index >= 0; index -= 1) {
    if (toastHistory[index]?.id === snapshot.id) {
      toastHistory[index] = snapshot;
      return;
    }
  }

  toastHistory.push(snapshot);
}

function replaceToastRecord(record: ToastRecord): void {
  toastRecords.set(record.snapshot.id, record);
  activeToasts.set(record.snapshot.id, record.snapshot);
  replaceToastHistorySnapshot(record.snapshot);
}

function unregisterToast(toastId?: string): void {
  if (!toastId) {
    activeToasts.clear();
    toastRecords.clear();
    return;
  }

  activeToasts.delete(toastId);
  toastRecords.delete(toastId);
}

function getActiveToasterRegistration(): ToasterRegistration {
  const registrations = [...toasterRegistrations.values()];
  return registrations.at(-1) ?? {closeButton: true, toastOptions: {}};
}

function mergeToastOptions(options?: ToastOptions): ToastOptions {
  return {
    ...getActiveToasterRegistration().toastOptions,
    ...options,
  };
}

function isToastVariant(value: string | undefined): value is ToastVariant {
  return value === "default" || value === "error" || value === "info" || value === "loading" || value === "success" || value === "warning";
}

function createToastMetadata(
  variant: ToastVariant,
  options: ToastOptions,
  closeButton: boolean,
  customContent?: React.ReactNode,
): ToastMetadata {
  return {
    action: options.action,
    cancel: options.cancel,
    className: options.className,
    closeButton,
    closeButtonAriaLabel: options.closeButtonAriaLabel ?? DEFAULT_TOAST_CLOSE_LABEL,
    customContent,
    descriptionClassName: options.descriptionClassName,
    style: options.style,
    variant,
  };
}

function createToastRecord({
  id,
  message,
  options,
  variant,
  customContent,
}: Readonly<{
  customContent?: React.ReactNode;
  id: string;
  message?: ToastRenderable;
  options: ToastOptions;
  variant: ToastVariant;
}>): ToastRecord {
  const activeRegistration = getActiveToasterRegistration();
  const closeButton = options.closeButton ?? activeRegistration.closeButton;
  const title = message === undefined ? undefined : resolveRenderable(message);
  const description = resolveRenderable(options.description);
  const snapshot = getSnapshot(id, variant, title, description);

  return {
    metadata: createToastMetadata(variant, options, closeButton, customContent),
    options,
    snapshot,
  };
}

function createToastLifecycleHandlers(toastId: string, record: ToastRecord): Pick<ToastAddOptions, "onClose" | "onRemove"> {
  return {
    onClose: () => {
      record.options.onDismiss?.(activeToasts.get(toastId) ?? record.snapshot);
    },
    onRemove: () => {
      const snapshot = activeToasts.get(toastId) ?? record.snapshot;
      unregisterToast(toastId);
      record.options.onAutoClose?.(snapshot);
    },
  };
}

function createToastAddPayload(record: ToastRecord): ToastAddOptions {
  const lifecycleHandlers = createToastLifecycleHandlers(record.snapshot.id, record);

  return {
    description: record.snapshot.description,
    id: record.snapshot.id,
    priority: record.options.priority,
    timeout: record.options.duration,
    title: record.snapshot.title,
    type: record.snapshot.variant,
    data: record.metadata,
    ...lifecycleHandlers,
  };
}

function buildToastOptions(message: ToastRenderable, variant: ToastVariant, options?: ToastOptions): ToastAddOptions {
  const mergedOptions = mergeToastOptions(options);
  const toastId = createToastIdentifier(mergedOptions.id);
  const record = createToastRecord({
    id: toastId,
    message,
    options: mergedOptions,
    variant,
  });

  registerToastRecord(record);

  return createToastAddPayload(record);
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

function updateToast(toastId: ToastIdentifier, options: ToastUpdateOptions): string {
  const normalizedToastId = String(toastId);
  const existingRecord = toastRecords.get(normalizedToastId);
  const mergedOptions: ToastOptions = {
    ...existingRecord?.options,
    ...options,
  };
  const variant = options.variant ?? existingRecord?.snapshot.variant ?? "default";
  const nextMessage = options.message === undefined ? existingRecord?.snapshot.title : resolveRenderable(options.message);
  const nextDescription = options.description === undefined ? existingRecord?.snapshot.description : resolveRenderable(options.description);
  const metadata = createToastMetadata(
    variant,
    mergedOptions,
    mergedOptions.closeButton ?? existingRecord?.metadata.closeButton ?? getActiveToasterRegistration().closeButton,
    existingRecord?.metadata.customContent,
  );
  const record: ToastRecord = {
    metadata,
    options: mergedOptions,
    snapshot: getSnapshot(normalizedToastId, variant, nextMessage, nextDescription),
  };

  replaceToastRecord(record);

  const payload: ToastUpdatePayload = {
    description: record.snapshot.description,
    priority: record.options.priority,
    timeout: record.options.duration,
    title: record.snapshot.title,
    type: record.snapshot.variant,
    data: record.metadata,
    ...createToastLifecycleHandlers(normalizedToastId, record),
  };

  toastManager.update(normalizedToastId, payload);

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
 * @example
 * ```tsx
 * <Toaster position='top-right' visibleToasts={5} />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toast | Base UI Toast Docs}
 */
/**
 * Toaster is the root viewport container for displaying toast notifications.
 * It should be rendered once at the app root level.
 */
const Toaster = React.forwardRef<HTMLDivElement, ToasterProps>(function Toaster(
  {
    className,
    closeButton = true,
    containerAriaLabel = DEFAULT_VIEWPORT_ARIA_LABEL,
    duration = DEFAULT_TOAST_DURATION,
    position = "bottom-right",
    style,
    toastOptions,
    visibleToasts = DEFAULT_TOAST_LIMIT,
  },
  forwardedRef,
) {
  const toasterId = React.useId();

  React.useEffect(() => {
    toasterRegistrations.set(toasterId, {
      closeButton,
      toastOptions: toastOptions ?? {},
    });

    return () => {
      toasterRegistrations.delete(toasterId);
    };
  }, [closeButton, toastOptions, toasterId]);

  return (
    <Toast.Provider
      limit={visibleToasts}
      timeout={duration}
      toastManager={toastManager}>
      <Toast.Portal>
        <Toast.Viewport
          ref={forwardedRef}
          aria-label={containerAriaLabel}
          className={cn(styles.viewport, positionStyles[position], className)}
          style={style}>
          <ToastViewportContent />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
});

Toaster.displayName = "Toaster";

/**
 * Imperative toast API for creating transient notifications outside React render flows.
 *
 * @remarks
 * Built on Base UI's toast manager and preserved as a drop-in replacement for the previous
 * `sonner` export surface.
 *
 * @example
 * ```tsx
 * toast.success("Profile updated");
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toast | Base UI Toast Docs}
 */
const toast = ((message: ToastRenderable, options?: ToastOptions): string => showToast(message, "default", options)) as ToastApi;

toast.success = (message: ToastRenderable, options?: ToastOptions): string => showToast(message, "success", options);
toast.error = (message: ToastRenderable, options?: ToastOptions): string => showToast(message, "error", options);
toast.info = (message: ToastRenderable, options?: ToastOptions): string => showToast(message, "info", options);
toast.warning = (message: ToastRenderable, options?: ToastOptions): string => showToast(message, "warning", options);
toast.loading = (message: ToastRenderable, options?: ToastOptions): string => showToast(message, "loading", options);
toast.message = (message: ToastRenderable, options?: ToastOptions): string => showToast(message, "default", options);
toast.update = (toastId: ToastIdentifier, options: ToastUpdateOptions): string => updateToast(toastId, options);
toast.dismiss = (toastId?: ToastIdentifier): string | undefined => dismissToast(toastId);
toast.custom = (renderer: (toastId: string) => React.ReactElement, options?: ToastOptions): string => {
  const mergedOptions = mergeToastOptions(options);
  const toastId = createToastIdentifier(mergedOptions.id);
  const record = createToastRecord({
    customContent: renderer(toastId),
    id: toastId,
    options: mergedOptions,
    variant: "default",
  });

  registerToastRecord(record);

  toastManager.add(createToastAddPayload(record));

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
  loadingToastId: string | undefined,
  variant: Exclude<ToastVariant, "default">,
  resolvedState: ToastRenderable | ToastPromiseResolvedOptions | undefined,
  baseOptions: ToastOptions,
): void {
  if (!resolvedState) {
    if (loadingToastId) {
      dismissToast(loadingToastId);
    }

    return;
  }

  const overrideOptions = isPromiseResolvedOptions(resolvedState) ? resolvedState : undefined;
  const message = isPromiseResolvedOptions(resolvedState) ? resolvedState.message : resolvedState;
  const mergedOptions = mergePromiseToastOptions(baseOptions, overrideOptions);

  if (loadingToastId) {
    toast.update(loadingToastId, {
      ...mergedOptions,
      message,
      variant,
    });

    return;
  }

  showToast(message, variant, mergedOptions);
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
    showResolvedPromiseToast(loadingToastId, "success", successState, baseOptions);

    return result;
  } catch (error: unknown) {
    const errorState = await resolvePromiseState(options?.error, error);
    showResolvedPromiseToast(loadingToastId, "error", errorState, baseOptions);

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

export type {Toast} from "@base-ui/react/toast";
export {toast, Toaster};
