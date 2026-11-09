import {toast} from "@arolariu/components";
import type {ReactNode} from "react";

/**
 * Notification categories rendered by the `@arolariu/components` Toaster via `data-type`.
 *
 * @remarks
 * `"loading"` toasts stay open until updated or closed, regardless of the Toaster timeout.
 */
export type NotifyType = "success" | "error" | "info" | "warning" | "loading";

/**
 * Optional per-notification settings.
 *
 * @remarks
 * - `id` updates the notification with this id in place, or shows it again if it was already closed.
 * - `timeout` (milliseconds) overrides {@link DEFAULT_CONFIRMATION_TIMEOUT_MS} for success, info and neutral
 *   notifications and the persistent default for the others; `0` keeps the notification until it is closed.
 */
export type NotifyOptions = Readonly<{
  description?: ReactNode;
  id?: string;
  timeout?: number;
}>;

/**
 * Auto-dismiss delay (milliseconds) for transient confirmations: success, info and neutral notifications.
 *
 * @remarks
 * Errors, warnings and loading notifications stay open until they are closed, so they are never the only
 * timed source of important information. Without a timeout the toasts would accumulate for the whole session.
 */
export const DEFAULT_CONFIRMATION_TIMEOUT_MS = 5000;

/**
 * Adds a notification, or updates or shows again the one identified by `options.id`.
 *
 * @param type - Notification category, or `undefined` for a neutral message.
 * @param title - Primary notification text.
 * @param options - Optional description, id and timeout.
 * @returns The id of the added or updated notification.
 */
function show(type: NotifyType | undefined, title: ReactNode, options?: NotifyOptions): string {
  const {id, timeout, ...rest} = options ?? {};
  const isConfirmation = type === undefined || type === "success" || type === "info";
  // Always explicit: an id update merges into the previous toast and would otherwise inherit its timeout.
  const resolvedTimeout = timeout ?? (isConfirmation ? DEFAULT_CONFIRMATION_TIMEOUT_MS : 0);

  // `toast.add` with an id updates a live toast in place and re-creates one that was closed meanwhile,
  // whereas `toast.update` silently ignores closed toasts and would lose the final result.
  return toast.add({
    title,
    ...rest,
    ...(type === undefined ? {} : {type}),
    timeout: resolvedTimeout,
    ...(id === undefined ? {} : {id}),
  });
}

/**
 * Website notification facade over the `@arolariu/components` v3 toast manager.
 *
 * @remarks
 * - Keeps call sites short (`notify.success(title)`) while emitting canonical `toast.add` / `toast.close` calls.
 *   Use `toast.promise` directly for promise-tracking notifications.
 * - Notifications reach the global `Toaster` mounted in `providers.tsx`; calls made before it mounts are dropped.
 * - Success, info and neutral notifications auto-dismiss after {@link DEFAULT_CONFIRMATION_TIMEOUT_MS}; errors,
 *   warnings and loading notifications stay until closed unless a `timeout` is passed.
 *
 * @example
 * ```ts
 * const id = notify.loading(t((m) => m.export.generating));
 * notify.success(t((m) => m.export.done), {id});
 * notify.error(t((m) => m.export.failed), {description: message});
 * notify.dismiss(id);
 * ```
 */
export const notify = {
  /**
   * Shows a neutral notification without a status type.
   *
   * @param title - Primary notification text.
   * @param options - Optional description, existing id and timeout.
   * @returns The notification id.
   */
  message: (title: ReactNode, options?: NotifyOptions): string => show(undefined, title, options),
  /**
   * Shows a success notification.
   *
   * @param title - Primary notification text.
   * @param options - Optional description, existing id and timeout.
   * @returns The notification id.
   */
  success: (title: ReactNode, options?: NotifyOptions): string => show("success", title, options),
  /**
   * Shows an error notification.
   *
   * @param title - Primary notification text.
   * @param options - Optional description, existing id and timeout.
   * @returns The notification id.
   */
  error: (title: ReactNode, options?: NotifyOptions): string => show("error", title, options),
  /**
   * Shows an informational notification.
   *
   * @param title - Primary notification text.
   * @param options - Optional description, existing id and timeout.
   * @returns The notification id.
   */
  info: (title: ReactNode, options?: NotifyOptions): string => show("info", title, options),
  /**
   * Shows a warning notification.
   *
   * @param title - Primary notification text.
   * @param options - Optional description, existing id and timeout.
   * @returns The notification id.
   */
  warning: (title: ReactNode, options?: NotifyOptions): string => show("warning", title, options),
  /**
   * Shows a loading notification that stays open until it is updated or dismissed.
   *
   * @param title - Primary notification text.
   * @param options - Optional description, existing id and timeout.
   * @returns The notification id, to pass to a later update or {@link notify.dismiss}.
   */
  loading: (title: ReactNode, options?: NotifyOptions): string => show("loading", title, options),
  /**
   * Closes a notification.
   *
   * @param id - The id returned when the notification was shown.
   */
  dismiss: (id: string): void => {
    toast.close(id);
  },
} as const;
