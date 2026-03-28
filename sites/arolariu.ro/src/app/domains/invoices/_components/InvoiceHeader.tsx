/**
 * @fileoverview Fixed header bar for the invoices domain with notification bell.
 * @module app/domains/invoices/_components/InvoiceHeader
 *
 * @remarks
 * Provides a fixed top header bar visible on desktop and mobile devices.
 * Features the notification bell for in-app activity feed.
 *
 * @see {@link NotificationBell}
 */

"use client";

import styles from "./InvoiceHeader.module.scss";
import NotificationBell from "./NotificationBell";

/**
 * Fixed header bar with notification bell.
 *
 * @remarks
 * **Rendering Context**: Client Component (contains client-only NotificationBell).
 *
 * **Features**:
 * - Fixed at top of viewport
 * - Notification bell positioned on the right
 * - Suitable for use across invoice-related routes
 * - Visible on all other invoice routes
 * - Z-index layering for proper stacking context
 *
 * @returns The invoice header bar with notification bell.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <InvoiceHeader />
 * ```
 */
export default function InvoiceHeader(): React.JSX.Element {
  return (
    <header className={styles["header"]}>
      <div className={styles["container"]}>
        <div className={styles["spacer"]} />
        <NotificationBell className={styles["notificationBell"]} />
      </div>
    </header>
  );
}
