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
 * - `id` updates an already visible notification in place instead of adding a new one.
 * - `timeout` (milliseconds) overrides the Toaster default; `0` keeps the notification until it is closed.
 */
export type NotifyOptions = Readonly<{
  description?: ReactNode;
  id?: string;
  timeout?: number;
}>;

/**
 * Adds a notification, or updates the one identified by `options.id`.
 *
 * @param type - Notification category, or `undefined` for a neutral message.
 * @param title - Primary notification text.
 * @param options - Optional description, existing id and timeout.
 * @returns The id of the added or updated notification.
 */
function show(type: NotifyType | undefined, title: ReactNode, options?: NotifyOptions): string {
  const {id, ...rest} = options ?? {};
  const content = {title, ...rest, ...(type === undefined ? {} : {type})};

  if (id !== undefined) {
    toast.update(id, content);
    return id;
  }

  return toast.add(content);
}

/**
 * Website notification facade over the `@arolariu/components` v3 toast manager.
 *
 * @remarks
 * - Keeps call sites short (`notify.success(title)`) while emitting canonical `toast.add` / `toast.update` /
 *   `toast.close` calls. Use `toast.promise` directly for promise-tracking notifications.
 * - Notifications reach the global `Toaster` mounted in `providers.tsx`; calls made before it mounts are dropped.
 * - The Toaster keeps the v3 persistent default, so notifications stay until the user closes them unless a
 *   `timeout` is passed.
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
