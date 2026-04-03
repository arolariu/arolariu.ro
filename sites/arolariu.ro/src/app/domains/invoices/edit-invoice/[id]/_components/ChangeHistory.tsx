"use client";

/**
 * @fileoverview Change history timeline component for invoice modifications.
 * @module app/domains/invoices/edit-invoice/[id]/_components/ChangeHistory
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Purpose**: Displays a timeline of invoice modifications, including:
 * - Pending changes from the EditInvoiceContext
 * - Invoice creation timestamp
 * - Last modified timestamp
 *
 * **Features**:
 * - Timeline visualization with icons
 * - Before/after value display for changes
 * - Relative time formatting
 * - Automatic category name display
 *
 * @returns The ChangeHistory component, CSR'ed.
 */

import {useEditInvoiceContext} from "@/app/domains/invoices/edit-invoice/[id]/_context/EditInvoiceContext";
import {InvoiceCategory} from "@/types/invoices";
import {Badge} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useMemo} from "react";
import {TbCalendar, TbCheck, TbCircleDot, TbClock, TbFileText, TbTag, TbWallet} from "react-icons/tb";
import styles from "./ChangeHistory.module.scss";

/**
 * Represents a single change in the history timeline.
 */
interface ChangeHistoryItem {
  /** Unique identifier for the change */
  readonly id: string;
  /** Type of change */
  readonly type: "created" | "modified" | "pending";
  /** Human-readable change title */
  readonly title: string;
  /** Optional description with before/after values */
  readonly description?: string;
  /** Timestamp of the change */
  readonly timestamp: Date;
  /** Icon to display */
  readonly icon: React.ReactNode;
}

/**
 * Formats a timestamp as relative time (e.g., "Just now", "2 minutes ago").
 */
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Gets the display name for an invoice category.
 */
function getCategoryName(category: InvoiceCategory): string {
  const categoryNames: Partial<Record<InvoiceCategory, string>> = {
    [InvoiceCategory.NOT_DEFINED]: "Uncategorized",
    [InvoiceCategory.GROCERY]: "Grocery",
    [InvoiceCategory.FAST_FOOD]: "Dining",
    [InvoiceCategory.HOME_CLEANING]: "Home",
    [InvoiceCategory.CAR_AUTO]: "Auto",
    [InvoiceCategory.OTHER]: "Other",
  };
  return categoryNames[category] ?? "Unknown";
}

/**
 * Change history timeline component showing invoice modifications.
 *
 * @remarks
 * Displays a chronological timeline of changes including:
 * - Pending unsaved changes from EditInvoiceContext
 * - Last modified timestamp
 * - Invoice creation timestamp
 *
 * @returns The ChangeHistory component
 */
export default function ChangeHistory(): React.JSX.Element {
  const t = useTranslations();
  const {invoice, pendingChanges} = useEditInvoiceContext();

  /**
   * Build the change history timeline from context and invoice data.
   */
  const historyItems = useMemo<ChangeHistoryItem[]>(() => {
    const items: ChangeHistoryItem[] = [];

    // Add pending changes (most recent)
    if (pendingChanges.name) {
      items.push({
        id: "pending-name",
        type: "pending",
        title: t("IMS--Edit.changeHistory.changes.nameChanged"),
        description: `"${invoice.name}" → "${pendingChanges.name}"`,
        timestamp: new Date(), // "Just now"
        icon: <TbFileText className={styles["timelineIcon"]} />,
      });
    }

    if (pendingChanges.category) {
      const oldCategory = getCategoryName(invoice.category);
      const newCategory = getCategoryName(pendingChanges.category);
      items.push({
        id: "pending-category",
        type: "pending",
        title: t("IMS--Edit.changeHistory.changes.categoryUpdated"),
        description: `${oldCategory} → ${newCategory}`,
        timestamp: new Date(),
        icon: <TbTag className={styles["timelineIcon"]} />,
      });
    }

    if (pendingChanges.description) {
      items.push({
        id: "pending-description",
        type: "pending",
        title: t("IMS--Edit.changeHistory.changes.descriptionChanged"),
        description: pendingChanges.description.length > 50 ? `${pendingChanges.description.slice(0, 50)}...` : pendingChanges.description,
        timestamp: new Date(),
        icon: <TbFileText className={styles["timelineIcon"]} />,
      });
    }

    if (pendingChanges.paymentType) {
      items.push({
        id: "pending-payment",
        type: "pending",
        title: t("IMS--Edit.changeHistory.changes.paymentTypeChanged"),
        description: String(pendingChanges.paymentType),
        timestamp: new Date(),
        icon: <TbWallet className={styles["timelineIcon"]} />,
      });
    }

    if (pendingChanges.transactionDate) {
      items.push({
        id: "pending-date",
        type: "pending",
        title: t("IMS--Edit.changeHistory.changes.transactionDateChanged"),
        description: pendingChanges.transactionDate.toLocaleDateString(),
        timestamp: new Date(),
        icon: <TbCalendar className={styles["timelineIcon"]} />,
      });
    }

    if (pendingChanges.isImportant !== undefined) {
      items.push({
        id: "pending-important",
        type: "pending",
        title: t("IMS--Edit.changeHistory.changes.importanceChanged"),
        description: pendingChanges.isImportant
          ? t("IMS--Edit.changeHistory.changes.markedImportant")
          : t("IMS--Edit.changeHistory.changes.unmarkedImportant"),
        timestamp: new Date(),
        icon: <TbCheck className={styles["timelineIcon"]} />,
      });
    }

    // Add last modified (if different from created)
    if (invoice.lastUpdatedAt && invoice.lastUpdatedAt.getTime() !== invoice.createdAt.getTime()) {
      items.push({
        id: "modified",
        type: "modified",
        title: t("IMS--Edit.changeHistory.modified"),
        timestamp: invoice.lastUpdatedAt,
        icon: <TbClock className={styles["timelineIcon"]} />,
      });
    }

    // Add creation timestamp
    items.push({
      id: "created",
      type: "created",
      title: t("IMS--Edit.changeHistory.created"),
      timestamp: invoice.createdAt,
      icon: <TbCircleDot className={styles["timelineIcon"]} />,
    });

    return items;
  }, [invoice, pendingChanges, t]);

  return (
    <div className={styles["container"]}>
      <div className={styles["header"]}>
        <h3 className={styles["title"]}>{t("IMS--Edit.changeHistory.title")}</h3>
        {historyItems.some((item) => item.type === "pending") && (
          <Badge
            variant='secondary'
            className={styles["pendingBadge"]}>
            {t("IMS--Edit.changeHistory.unsavedChanges")}
          </Badge>
        )}
      </div>

      <div className={styles["timeline"]}>
        {historyItems.map((item, index) => (
          <div
            key={item.id}
            className={styles["timelineItem"]}>
            <div className={styles["timelineDot"]}>
              {item.icon}
              {index < historyItems.length - 1 && <div className={styles["timelineLine"]} />}
            </div>
            <div className={styles["timelineContent"]}>
              <div className={styles["changeHeader"]}>
                <p className={styles["changeTitle"]}>{item.title}</p>
                {item.type === "pending" && (
                  <span className={styles["pendingIndicator"]}>{t("IMS--Edit.changeHistory.pending")}</span>
                )}
              </div>
              {item.description && <p className={styles["changeDescription"]}>{item.description}</p>}
              <p className={styles["changeTimestamp"]}>{formatRelativeTime(item.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

