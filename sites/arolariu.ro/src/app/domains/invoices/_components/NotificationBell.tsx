/**
 * @fileoverview Notification bell component with in-app activity feed.
 * @module app/domains/invoices/_components/NotificationBell
 *
 * @remarks
 * Displays a bell icon with an unread count badge that opens a popover
 * dropdown showing recent invoice-related notifications. Notifications
 * are persisted in localStorage for client-side state management.
 *
 * Notification types include:
 * - Invoice created successfully
 * - AI analysis completed
 * - Monthly report ready
 *
 * @see {@link useLocalStorage} - For persistence
 */

"use client";

import {Badge, Button, Popover, PopoverContent, PopoverTrigger, useLocalStorage} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useMemo} from "react";
import {TbBell, TbChartBar, TbCheck, TbFileInvoice, TbSparkles} from "react-icons/tb";
import styles from "./NotificationBell.module.scss";

/**
 * Represents a single notification in the activity feed.
 */
export type Notification = {
  /**
   * Unique identifier for the notification.
   */
  id: string;

  /**
   * The type of notification event.
   */
  type: "invoice_created" | "analysis_complete" | "monthly_report";

  /**
   * Short title for the notification.
   */
  title: string;

  /**
   * Detailed description of the notification.
   */
  description: string;

  /**
   * When the notification was created.
   */
  timestamp: Date;

  /**
   * Whether the notification has been read.
   */
  read: boolean;

  /**
   * Optional invoice ID for linking to specific invoice.
   */
  invoiceId?: string;
};

/**
 * Props for the NotificationBell component.
 */
type Props = {
  /**
   * Optional CSS class name for the component.
   */
  className?: string;
};

/**
 * Icon component mapping for notification types.
 */
const NotificationIcon = {
  invoice_created: TbFileInvoice,
  analysis_complete: TbSparkles,
  monthly_report: TbChartBar,
} as const;

/**
 * Calculates relative time from a timestamp.
 *
 * @param timestamp - The timestamp to calculate relative time from
 * @param t - Translation function for i18n
 * @returns A string representing relative time (e.g., "2 minutes ago")
 */
function getRelativeTime(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(timestamp).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * NotificationBell - Bell icon with dropdown activity feed.
 *
 * @remarks
 * **Rendering Context**: Client Component (uses localStorage, state, and interactions).
 *
 * **Features**:
 * - Bell icon with unread count badge
 * - Popover dropdown on click
 * - Relative timestamps ("2 minutes ago")
 * - Mark all as read functionality
 * - Motion animations for dropdown
 * - Persisted in localStorage via useLocalStorage hook
 *
 * **Future Enhancement**: Backend notification system with WebSocket support.
 *
 * @example
 * ```tsx
 * <NotificationBell />
 * ```
 *
 * @param props - Component properties
 * @returns A React element displaying the notification bell
 */
export default function NotificationBell({className}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Invoices.Shared.notifications");

  // Persist notifications in localStorage
  const [notifications, setNotifications] = useLocalStorage<Notification[]>("invoice-notifications", []);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  /**
   * Marks all notifications as read.
   */
  const handleMarkAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({...n, read: true})));
  }, [setNotifications]);

  /**
   * Marks a single notification as read.
   */
  const handleMarkAsRead = useCallback(
    (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? {...n, read: true} : n)));
    },
    [setNotifications],
  );

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className={styles["bellButton"]}
            aria-label={t("title")}>
            <TbBell className={styles["bellIcon"]} />
            {unreadCount > 0 && (
              <Badge
                variant='destructive'
                className={styles["badge"]}>
                {unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className={styles["popoverContent"]}
          align='end'
          sideOffset={8}>
          <motion.div
            initial={{opacity: 0, y: -10}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -10}}
            transition={{duration: 0.2}}>
            <div className={styles["header"]}>
              <h3 className={styles["title"]}>{t("title")}</h3>
              {unreadCount > 0 && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleMarkAllAsRead}
                  className={styles["markAllButton"]}>
                  <TbCheck />
                  {t("markAllRead")}
                </Button>
              )}
            </div>

            <div className={styles["notificationList"]}>
              <AnimatePresence mode='popLayout'>
                {notifications.length === 0 ? (
                  <motion.div
                    key='empty'
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    className={styles["emptyState"]}>
                    <TbBell className={styles["emptyIcon"]} />
                    <p className={styles["emptyText"]}>{t("noNotifications")}</p>
                  </motion.div>
                ) : (
                  notifications.map((notification) => {
                    const Icon = NotificationIcon[notification.type];
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{opacity: 0, x: -20}}
                        animate={{opacity: 1, x: 0}}
                        exit={{opacity: 0, x: 20}}
                        transition={{duration: 0.2}}
                        className={`${styles["notificationItem"]} ${!notification.read ? styles["unread"] : ""}`}
                        onClick={() => handleMarkAsRead(notification.id)}>
                        <div className={styles["iconWrapper"]}>
                          <Icon className={styles["notificationIcon"]} />
                        </div>
                        <div className={styles["content"]}>
                          <div className={styles["titleRow"]}>
                            <span className={styles["notificationTitle"]}>{notification.title}</span>
                            {!notification.read && <span className={styles["unreadDot"]} />}
                          </div>
                          <p className={styles["description"]}>{notification.description}</p>
                          <span className={styles["timestamp"]}>{getRelativeTime(notification.timestamp)}</span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
