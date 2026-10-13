"use client";

import {Toast as ToastPrimitive} from "@base-ui/react/toast";
import {BellRing, CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert, X} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {Toast, ToastClose, ToastContent, ToastDescription, ToastPortal, ToastTitle, ToastViewport, type ToastPosition} from "./toast";
import styles from "./legacy-toast.module.css";

/** The legacy facade's six supported placements. */
export type LegacyToastPosition = ToastPosition;
/** Supported compatibility notification variants. */
export type LegacyToastVariant = "default" | "success" | "error" | "info" | "warning" | "loading";
/** Explicit numeric identifiers are normalized to strings. */
export type LegacyToastIdentifier = number | string;
/** Factories are rendered as React components, never invoked before React rendering. */
export type LegacyToastRenderable = React.ReactNode | (() => React.ReactNode);
/** A promise or a lazy source evaluated inside the facade's error/finally lifecycle. */
export type LegacyToastPromise<Value> = Promise<Value> | (() => Promise<Value>);
/** Callback-backed compatibility action. Prevent default to keep the toast open. */
export interface LegacyToastAction {
  readonly label: React.ReactNode;
  readonly onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
/** Actions support both React content and callback descriptors. */
export type LegacyToastActionRenderable = React.ReactNode | LegacyToastAction;
/** Immutable snapshot returned by compatibility history and lifecycle callbacks. */
export interface LegacyToastSnapshot {
  readonly id: string;
  readonly variant: LegacyToastVariant;
  readonly title?: React.ReactNode;
  readonly description?: React.ReactNode;
}
/** Compatibility options. Canonical managers instead use title/timeout/actionProps. */
export interface LegacyToastOptions {
  readonly id?: LegacyToastIdentifier;
  readonly description?: LegacyToastRenderable;
  readonly duration?: number;
  readonly className?: string;
  readonly descriptionClassName?: string;
  readonly closeButton?: boolean;
  readonly closeButtonAriaLabel?: string;
  readonly style?: React.CSSProperties;
  readonly priority?: "high" | "low";
  readonly action?: LegacyToastActionRenderable;
  readonly cancel?: LegacyToastActionRenderable;
  /** Called on every closure, including timeout. No cause is supplied by Base UI. */
  readonly onDismiss?: (toast: LegacyToastSnapshot) => void;
  /** Called after exit completes, for every removal cause. */
  readonly onRemove?: (toast: LegacyToastSnapshot) => void;
  /** @deprecated Alias for onRemove, not a timeout-only callback. onRemove takes precedence. */
  readonly onAutoClose?: (toast: LegacyToastSnapshot) => void;
}
/** Promise state with per-state compatibility options. */
export interface LegacyToastPromiseResolvedOptions extends LegacyToastOptions {
  readonly message: LegacyToastRenderable;
}
/** Promise formatter; asynchronous formatters are awaited before updating or finalizing. */
export type LegacyToastPromiseState<Value> =
  | LegacyToastRenderable
  | LegacyToastPromiseResolvedOptions
  | ((
      value: Value,
    ) => LegacyToastRenderable | LegacyToastPromiseResolvedOptions | Promise<LegacyToastRenderable | LegacyToastPromiseResolvedOptions>);
/** Legacy promise configuration. Rejections, including formatter failures, remain rejected. */
export interface LegacyToastPromiseOptions<Value> extends LegacyToastOptions {
  readonly loading?: LegacyToastRenderable | LegacyToastPromiseResolvedOptions;
  readonly success?: LegacyToastPromiseState<Value>;
  readonly error?: LegacyToastPromiseState<unknown>;
  readonly finally?: () => void | Promise<void>;
}
/** Updates must target an active toast. Unknown or closing IDs throw instead of fabricating history. */
export interface LegacyToastUpdateOptions extends LegacyToastOptions {
  readonly message?: LegacyToastRenderable;
  readonly variant?: LegacyToastVariant;
}
/** Compatibility viewport options; not the canonical Provider/Toaster contract. */
export interface LegacyToasterProps {
  readonly position?: LegacyToastPosition;
  readonly duration?: number;
  readonly visibleToasts?: number;
  readonly closeButton?: boolean;
  readonly containerAriaLabel?: string;
  readonly className?: string;
  readonly style?: React.CSSProperties;
  readonly toastOptions?: LegacyToastOptions;
}
/** Callable facade retained explicitly for consumers of the published compatibility API. */
export interface LegacyToastApi {
  (message: LegacyToastRenderable, options?: LegacyToastOptions): string;
  readonly success: (message: LegacyToastRenderable, options?: LegacyToastOptions) => string;
  readonly error: (message: LegacyToastRenderable, options?: LegacyToastOptions) => string;
  readonly info: (message: LegacyToastRenderable, options?: LegacyToastOptions) => string;
  readonly warning: (message: LegacyToastRenderable, options?: LegacyToastOptions) => string;
  readonly loading: (message: LegacyToastRenderable, options?: LegacyToastOptions) => string;
  readonly message: (message: LegacyToastRenderable, options?: LegacyToastOptions) => string;
  readonly update: (id: LegacyToastIdentifier, options: LegacyToastUpdateOptions) => string;
  readonly dismiss: (id?: LegacyToastIdentifier) => string | undefined;
  readonly promise: <Value>(value: LegacyToastPromise<Value>, options?: LegacyToastPromiseOptions<Value>) => Promise<Value>;
  readonly custom: (renderer: (id: string) => React.ReactElement, options?: LegacyToastOptions) => string;
  readonly getToasts: () => ReadonlyArray<LegacyToastSnapshot>;
  readonly getHistory: () => ReadonlyArray<LegacyToastSnapshot>;
}

interface LegacyToastMetadata {
  readonly variant: LegacyToastVariant;
  readonly options: LegacyToastOptions;
  readonly closeButton: boolean;
  readonly customContent?: React.ReactNode;
}
interface ToastRecord {
  readonly generation: symbol;
  readonly data: LegacyToastMetadata;
  readonly snapshot: LegacyToastSnapshot;
}
interface ToasterRegistration {
  readonly closeButton: boolean;
  readonly toastOptions: LegacyToastOptions;
}

const manager = ToastPrimitive.createToastManager<LegacyToastMetadata>();
const records = new Map<string, ToastRecord>();
const history: LegacyToastSnapshot[] = [];
const registrations = new Map<string, ToasterRegistration>();
const variantStyles: Readonly<Record<LegacyToastVariant, string | undefined>> = {
  default: styles.default,
  error: styles.error,
  info: styles.info,
  loading: styles.loading,
  success: styles.success,
  warning: styles.warning,
};
let sequence = 0;

function isVariant(value: string): value is LegacyToastVariant {
  return value === "default" || value === "error" || value === "info" || value === "loading" || value === "success" || value === "warning";
}

function isAction(value: LegacyToastActionRenderable): value is LegacyToastAction {
  return typeof value === "object" && value !== null && !React.isValidElement(value) && "label" in value && "onClick" in value;
}

function validateOptions(options: LegacyToastOptions): void {
  if (options.duration !== undefined && (!Number.isFinite(options.duration) || options.duration < 0)) {
    throw new RangeError("Legacy toast duration must be a finite, non-negative number.");
  }
  if (
    options.id !== undefined
    && ((typeof options.id !== "string" && typeof options.id !== "number")
      || (typeof options.id === "number" && !Number.isFinite(options.id))
      || String(options.id).length === 0)
  ) {
    throw new TypeError("Legacy toast id must be non-empty and finite.");
  }
  for (const action of [options.action, options.cancel]) {
    if (
      typeof action === "object"
      && action !== null
      && !React.isValidElement(action)
      && ("label" in action || "onClick" in action)
      && (!isAction(action) || typeof action.onClick !== "function")
    ) {
      throw new TypeError("Legacy toast action onClick must be callable.");
    }
  }
}

function registration(): ToasterRegistration {
  const current = [...registrations.values()].at(-1);
  if (!current) {
    throw new Error("Mount LegacyToaster before calling legacyToast.");
  }
  return current;
}

function isOptionsObject(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeOptions(options: LegacyToastOptions = {}): LegacyToastOptions {
  if (!isOptionsObject(options)) {
    throw new TypeError("Legacy toast options must be an object.");
  }
  const merged = {...registration().toastOptions, ...options};
  validateOptions(merged);
  return merged;
}

function identifier(id?: LegacyToastIdentifier): string {
  if (id !== undefined) {
    return String(id);
  }
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  sequence += 1;
  return `toast-${String(sequence)}`;
}

function renderable(value?: LegacyToastRenderable): React.ReactNode {
  return typeof value === "function" ? React.createElement(value) : value;
}

function save(record: ToastRecord, update = false): void {
  records.set(record.snapshot.id, record);
  const index = update ? history.findLastIndex((snapshot) => snapshot.id === record.snapshot.id) : -1;
  if (index === -1) {
    history.push(record.snapshot);
  } else {
    history[index] = record.snapshot;
  }
}

function remove(record: ToastRecord): void {
  if (records.get(record.snapshot.id)?.generation === record.generation) {
    records.delete(record.snapshot.id);
  }
}

function payload(record: ToastRecord): Parameters<typeof manager.add>[0] {
  const {snapshot, data} = record;
  return {
    id: snapshot.id,
    title: snapshot.title,
    description: snapshot.description,
    type: snapshot.variant,
    timeout: data.options.duration,
    priority: data.options.priority,
    data,
    onClose: () => {
      remove(record);
      data.options.onDismiss?.(snapshot);
    },
    onRemove: () => {
      remove(record);
      // eslint-disable-next-line sonarjs/deprecation -- deliberate compatibility alias for real removal, not a fabricated timeout cause.
      (data.options.onRemove ?? data.options.onAutoClose)?.(snapshot);
    },
  };
}

function show(
  message: LegacyToastRenderable,
  variant: LegacyToastVariant,
  options?: LegacyToastOptions,
  customContent?: React.ReactNode,
): string {
  const merged = mergeOptions(options);
  const id = identifier(merged.id);
  const snapshot = Object.freeze({id, variant, title: renderable(message), description: renderable(merged.description)});
  const record: ToastRecord = {
    generation: Symbol(id),
    snapshot,
    data: {variant, options: merged, closeButton: merged.closeButton ?? registration().closeButton, customContent},
  };
  save(record);
  return manager.add(payload(record));
}

function dismiss(id?: LegacyToastIdentifier): string | undefined {
  if (id === undefined) {
    records.clear();
    manager.close();
    return undefined;
  }
  const normalized = String(id);
  records.delete(normalized);
  manager.close(normalized);
  return normalized;
}

function update(id: LegacyToastIdentifier, options: LegacyToastUpdateOptions): string {
  const normalized = String(id);
  const previous = records.get(normalized);
  if (!previous) {
    throw new Error(`Cannot update unknown or inactive legacy toast "${normalized}".`);
  }
  const merged = {...previous.data.options, ...options};
  validateOptions(merged);
  const variant = options.variant ?? previous.snapshot.variant;
  if (!isVariant(variant)) {
    throw new TypeError("Unsupported legacy toast variant.");
  }
  const record: ToastRecord = {
    generation: previous.generation,
    data: {...previous.data, options: merged, variant, closeButton: merged.closeButton ?? previous.data.closeButton},
    snapshot: Object.freeze({
      id: normalized,
      variant,
      title: options.message === undefined ? previous.snapshot.title : renderable(options.message),
      description: options.description === undefined ? previous.snapshot.description : renderable(options.description),
    }),
  };
  save(record, true);
  manager.update(normalized, payload(record));
  return normalized;
}

function LegacyCustomContent({renderer, id}: Readonly<{renderer: (id: string) => React.ReactElement; id: string}>): React.ReactElement {
  return renderer(id);
}

function custom(renderer: (id: string) => React.ReactElement, options?: LegacyToastOptions): string {
  if (typeof renderer !== "function") {
    throw new TypeError("Legacy toast custom renderer must be callable.");
  }
  const merged = mergeOptions(options);
  const id = identifier(merged.id);
  return show(
    undefined,
    "default",
    {...merged, id},
    <LegacyCustomContent
      renderer={renderer}
      id={id}
    />,
  );
}

type ResolvedState = LegacyToastRenderable | LegacyToastPromiseResolvedOptions;
function isResolvedOptions(value: ResolvedState): value is LegacyToastPromiseResolvedOptions {
  return typeof value === "object" && value !== null && "message" in value;
}

function promiseState(
  state: ResolvedState,
  base: LegacyToastOptions,
): Readonly<{message: LegacyToastRenderable; options: LegacyToastOptions}> {
  return isResolvedOptions(state) ? {message: state.message, options: {...base, ...state}} : {message: state, options: base};
}

function settle(
  id: string | undefined,
  generation: symbol | undefined,
  state: ResolvedState,
  variant: LegacyToastVariant,
  base: LegacyToastOptions,
): void {
  if (id !== undefined && records.get(id)?.generation !== generation) {
    return;
  }
  if (state === null || state === undefined) {
    if (id !== undefined) {
      dismiss(id);
    }
    return;
  }
  const resolved = promiseState(state, base);
  if (id !== undefined) {
    update(id, {...resolved.options, message: resolved.message, variant});
  } else {
    show(resolved.message, variant, resolved.options);
  }
}

function isPromiseSource(value: unknown): value is PromiseLike<unknown> {
  return typeof value === "object" && value !== null && "then" in value && typeof value.then === "function";
}

async function promise<Value>(value: LegacyToastPromise<Value>, options: LegacyToastPromiseOptions<Value> = {}): Promise<Value> {
  const {loading, success, error: errorState, finally: onFinally, ...base} = options;
  const pending = promiseState(loading, base);
  const id = pending.message === null || pending.message === undefined ? undefined : show(pending.message, "loading", pending.options);
  const generation = id === undefined ? undefined : records.get(id)?.generation;
  try {
    const source = typeof value === "function" ? value() : value;
    if (!isPromiseSource(source)) {
      throw new TypeError("Legacy toast promise source must return a promise.");
    }
    const result = await source;
    const state = typeof success === "function" ? await success(result) : success;
    settle(id, generation, state, "success", base);
    return result;
  } catch (error: unknown) {
    try {
      const state = typeof errorState === "function" ? await errorState(error) : errorState;
      settle(id, generation, state, "error", base);
    } catch (formatterError: unknown) {
      if (id !== undefined && records.get(id)?.generation === generation) {
        dismiss(id);
      }
      throw formatterError;
    }
    throw error;
  } finally {
    await onFinally?.();
  }
}

/** Explicit callable compatibility API backed by its own Base UI manager and provider. */
const legacyToast: LegacyToastApi = Object.assign(
  (message: LegacyToastRenderable, options?: LegacyToastOptions): string => show(message, "default", options),
  {
    success: (message: LegacyToastRenderable, options?: LegacyToastOptions): string => show(message, "success", options),
    error: (message: LegacyToastRenderable, options?: LegacyToastOptions): string => show(message, "error", options),
    info: (message: LegacyToastRenderable, options?: LegacyToastOptions): string => show(message, "info", options),
    warning: (message: LegacyToastRenderable, options?: LegacyToastOptions): string => show(message, "warning", options),
    loading: (message: LegacyToastRenderable, options?: LegacyToastOptions): string => show(message, "loading", options),
    message: (message: LegacyToastRenderable, options?: LegacyToastOptions): string => show(message, "default", options),
    update,
    dismiss,
    custom,
    promise,
    getToasts: (): ReadonlyArray<LegacyToastSnapshot> => [...records.values()].map((record) => record.snapshot),
    getHistory: (): ReadonlyArray<LegacyToastSnapshot> => [...history],
  },
);

function VariantIcon({variant}: Readonly<{variant: LegacyToastVariant}>): React.JSX.Element {
  const icons = {
    default: (
      <BellRing
        aria-hidden='true'
        className={styles.icon}
      />
    ),
    error: (
      <CircleAlert
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
      <CircleCheck
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
  return <span className={styles.leading}>{icons[variant]}</span>;
}

// eslint-disable-next-line sonarjs/function-return-type -- React content intentionally includes callback buttons and arbitrary valid React nodes.
function Action({value, id, className}: Readonly<{value: LegacyToastActionRenderable; id: string; className?: string}>): React.ReactNode {
  if (value === null || value === undefined) {
    return null;
  }
  if (isAction(value)) {
    return (
      <button
        type='button'
        className={className}
        onClick={(event) => {
          value.onClick(event);
          if (!event.defaultPrevented) {
            dismiss(id);
          }
        }}>
        {value.label}
      </button>
    );
  }
  return value;
}

function ToastList({position}: Readonly<{position: LegacyToastPosition}>): React.JSX.Element {
  const {toasts} = ToastPrimitive.useToastManager<LegacyToastMetadata>();
  return (
    <>
      {toasts.map((item) => {
        const {data} = item;
        if (!data) {
          throw new Error("Missing legacy toast metadata.");
        }
        const {options, variant} = data;
        return (
          <Toast
            key={item.id}
            toast={item}
            swipeDirection={position.startsWith("top") ? ["up", "right"] : ["down", "right"]}
            className={cn(styles.root, variantStyles[variant], options.className)}
            data-variant={variant}
            style={options.style}>
            <ToastContent className={styles.content}>
              {data.customContent ?? (
                <>
                  <VariantIcon variant={variant} />
                  <div className={styles.body}>
                    <ToastTitle className={styles.title} />
                    <ToastDescription className={cn(styles.description, options.descriptionClassName)} />
                    {(options.action !== null && options.action !== undefined)
                    || (options.cancel !== null && options.cancel !== undefined) ? (
                      <div className={styles.actions}>
                        <Action
                          value={options.cancel}
                          id={item.id}
                          className={styles.secondaryAction}
                        />
                        <Action
                          value={options.action}
                          id={item.id}
                          className={styles.primaryAction}
                        />
                      </div>
                    ) : null}
                  </div>
                  {data.closeButton ? (
                    <ToastClose
                      aria-label={options.closeButtonAriaLabel ?? "Close notification"}
                      className={styles.close}
                      render={<button type='button' />}>
                      <X
                        aria-hidden='true'
                        className={styles.closeIcon}
                      />
                    </ToastClose>
                  ) : null}
                </>
              )}
            </ToastContent>
          </Toast>
        );
      })}
    </>
  );
}

/**
 * Explicit compatibility composition. Mount once before calling legacyToast.
 * Its private manager is entirely separate from canonical toast/Toaster.
 */
const LegacyToaster = React.forwardRef<HTMLDivElement, LegacyToasterProps>(
  (
    {
      className,
      closeButton = true,
      containerAriaLabel = "Notifications",
      duration = 5000,
      position = "bottom-right",
      style,
      toastOptions,
      visibleToasts = 3,
    },
    ref,
  ) => {
    const id = React.useId();
    validateOptions({duration});
    validateOptions(toastOptions ?? {});
    if (!Number.isSafeInteger(visibleToasts) || visibleToasts < 1) {
      throw new RangeError("LegacyToaster visibleToasts must be a positive integer.");
    }
    React.useEffect(() => {
      registrations.delete(id);
      registrations.set(id, {closeButton, toastOptions: toastOptions ?? {}});
    }, [closeButton, toastOptions, id]);
    React.useEffect(
      () => () => {
        registrations.delete(id);
        if (registrations.size === 0) {
          records.clear();
        }
      },
      [id],
    );
    return (
      <ToastPrimitive.Provider
        toastManager={manager}
        timeout={duration}
        limit={visibleToasts}>
        <ToastPortal>
          <ToastViewport
            ref={ref}
            position={position}
            aria-label={containerAriaLabel}
            className={cn(styles.viewport, className)}
            style={style}>
            <ToastList position={position} />
          </ToastViewport>
        </ToastPortal>
      </ToastPrimitive.Provider>
    );
  },
);
LegacyToaster.displayName = "LegacyToaster";

export {legacyToast, LegacyToaster};
