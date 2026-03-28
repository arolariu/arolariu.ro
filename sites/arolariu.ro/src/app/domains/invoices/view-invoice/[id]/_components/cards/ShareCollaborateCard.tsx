/**
 * @fileoverview Share & Collaborate card for the invoice view page.
 * @module domains/invoices/view-invoice/[id]/components/cards/ShareCollaborateCard
 *
 * @remarks
 * Displays invoice sharing status and provides quick actions for collaboration:
 * - Sharing status badge (Private/Shared/Public)
 * - Count of users the invoice is shared with
 * - Quick action buttons: Copy Link, Share via Email
 * - Activity summary (created date, last modified)
 * - "Manage Sharing" button to open the full ShareInvoiceDialog
 *
 * **Rendering Context**: Client Component (requires hooks and interactivity).
 *
 * **Data Sources:**
 * - Invoice context: current invoice data
 * - User information: to determine if user is owner
 *
 * **Sharing Status Logic:**
 * - `sharedWith.length === 0`: Private (TbLock icon)
 * - Last entry is LAST_GUID sentinel: Public (TbWorld icon)
 * - Otherwise: Shared with N people (TbUsers icon)
 *
 * **Performance:**
 * - All handlers are memoized with `useCallback`
 * - Computed status values are memoized with `useMemo`
 */

"use client";

import {LAST_GUID} from "@/lib/utils.generic";
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, toast} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useMemo} from "react";
import {TbClipboard, TbLock, TbMail, TbShare, TbUsers, TbWorld} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./ShareCollaborateCard.module.scss";

/**
 * Type for sharing status computed from invoice.sharedWith array.
 *
 * @remarks
 * - `private`: No sharing enabled
 * - `public`: Public access enabled (LAST_GUID sentinel present)
 * - `shared`: Shared with specific users
 */
type SharingStatus = "private" | "public" | "shared";

/**
 * Share & Collaborate card component.
 *
 * @remarks
 * **Features:**
 * 1. Sharing status badge with appropriate icon and color
 * 2. Count of shared users (if applicable)
 * 3. Quick action buttons:
 *    - Copy Link: Copies invoice URL to clipboard with toast feedback
 *    - Share via Email: Opens ShareInvoiceDialog in email mode
 * 4. Activity summary:
 *    - Created date (relative time)
 *    - Last modified date (relative time)
 * 5. "Manage Sharing" button opens full ShareInvoiceDialog
 *
 * **Sharing Status Logic:**
 * - Empty `sharedWith` array → Private
 * - Last entry equals `LAST_GUID` → Public
 * - Otherwise → Shared with N people
 *
 * **User Experience:**
 * - Toast notifications for clipboard actions
 * - Animated hover effects on action buttons
 * - Clear visual hierarchy with icons and badges
 *
 * @returns The share & collaborate card component
 *
 * @example
 * ```tsx
 * // In island.tsx right sidebar
 * <div className={styles["rightItem"]}>
 *   {Boolean(isOwner && !isLoadingUserInformation) && <ShareCollaborateCard />}
 * </div>
 * ```
 */
export function ShareCollaborateCard(): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoice.shareCollaborate");
  const {invoice} = useInvoiceContext();
  const {openDialog} = useDialog();

  /**
   * Computes the current sharing status based on invoice.sharedWith array.
   *
   * @remarks
   * **Logic:**
   * 1. Empty array → `private`
   * 2. Last entry is LAST_GUID sentinel → `public`
   * 3. Otherwise → `shared`
   *
   * **Performance:** Memoized to prevent recomputation on unrelated re-renders.
   */
  const sharingStatus = useMemo<SharingStatus>(() => {
    if (invoice.sharedWith.length === 0) {
      return "private";
    }

    const lastEntry = invoice.sharedWith[invoice.sharedWith.length - 1];
    if (lastEntry === LAST_GUID) {
      return "public";
    }

    return "shared";
  }, [invoice.sharedWith]);

  /**
   * Count of users the invoice is shared with (excluding public sentinel).
   *
   * @remarks
   * For public invoices, we don't count the LAST_GUID sentinel.
   * For shared invoices, we count all GUIDs in the array.
   */
  const sharedWithCount = useMemo<number>(() => {
    if (sharingStatus === "public") {
      return invoice.sharedWith.length - 1;
    }
    return invoice.sharedWith.length;
  }, [invoice.sharedWith.length, sharingStatus]);

  /**
   * Returns the appropriate icon component for the current sharing status.
   *
   * @remarks
   * - Private → TbLock
   * - Public → TbWorld
   * - Shared → TbUsers
   */
  const StatusIcon = useMemo(() => {
    switch (sharingStatus) {
      case "private":
        return TbLock;
      case "public":
        return TbWorld;
      case "shared":
        return TbUsers;
    }
  }, [sharingStatus]);

  /**
   * Returns the appropriate badge variant for the current sharing status.
   *
   * @remarks
   * - Private → default (neutral)
   * - Public → destructive (high visibility warning)
   * - Shared → secondary (informational)
   */
  const badgeVariant = useMemo<"default" | "secondary" | "destructive">(() => {
    switch (sharingStatus) {
      case "private":
        return "default";
      case "public":
        return "destructive";
      case "shared":
        return "secondary";
    }
  }, [sharingStatus]);

  /**
   * Computes relative time string for activity dates.
   *
   * @param date - The date to compute relative time for
   * @returns Human-readable relative time string
   *
   * @remarks
   * - Today → "activity.today"
   * - Past days → "activity.daysAgo" with count
   */
  const getRelativeTime = useCallback(
    (date: Date): string => {
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) {
        return t("activity.today");
      }

      return t("activity.daysAgo", {count: diffInDays});
    },
    [t],
  );

  /**
   * Handles copying the invoice link to clipboard.
   *
   * @remarks
   * **Behavior:**
   * 1. Constructs full invoice URL from window.location
   * 2. Uses Clipboard API to copy to clipboard
   * 3. Shows success toast with feedback
   * 4. Falls back to error toast if Clipboard API fails
   *
   * **Performance:** Memoized with useCallback.
   */
  const handleCopyLink = useCallback(async (): Promise<void> => {
    try {
      const invoiceUrl = `${window.location.origin}/domains/invoices/view-invoice/${invoice.id}`;
      await navigator.clipboard.writeText(invoiceUrl);
      toast.success(t("copied"));
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast.error("Failed to copy link");
    }
  }, [invoice.id, t]);

  /**
   * Handles opening the ShareInvoiceDialog for email sharing.
   *
   * @remarks
   * Opens the dialog using the DialogContext. The ShareInvoiceDialog
   * component handles the email/public/private sharing logic internally.
   *
   * **Performance:** Memoized with useCallback.
   */
  const handleShareEmail = useCallback((): void => {
    openDialog("shareInvoice");
  }, [openDialog]);

  /**
   * Handles opening the ShareInvoiceDialog for managing sharing settings.
   *
   * @remarks
   * Same as handleShareEmail - opens the full ShareInvoiceDialog.
   * Separated for semantic clarity and potential future divergence.
   *
   * **Performance:** Memoized with useCallback.
   */
  const handleManageSharing = useCallback((): void => {
    openDialog("shareInvoice");
  }, [openDialog]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className={styles["cardTitle"]}>
          <TbShare className={styles["titleIcon"]} />
          {t("title")}
        </CardTitle>
      </CardHeader>

      <CardContent className={styles["cardContent"]}>
        {/* Sharing Status Section */}
        <div className={styles["statusSection"]}>
          <div className={styles["statusRow"]}>
            <span className={styles["statusLabel"]}>Status:</span>
            <Badge
              variant={badgeVariant}
              className={styles["statusBadge"]}>
              <StatusIcon className={styles["badgeIcon"]} />
              {t(sharingStatus)}
            </Badge>
          </div>

          {sharingStatus !== "private" && (
            <div className={styles["sharedWithRow"]}>
              <span className={styles["sharedWithLabel"]}>{t("sharedWith")}:</span>
              <span className={styles["sharedWithCount"]}>{sharedWithCount} people</span>
            </div>
          )}
        </div>

        {/* Quick Actions Section */}
        <div className={styles["actionsSection"]}>
          <motion.div
            whileHover={{scale: 1.02}}
            whileTap={{scale: 0.98}}>
            <Button
              variant='outline'
              size='sm'
              onClick={handleCopyLink}
              className={styles["actionButton"]}>
              <TbClipboard className={styles["buttonIcon"]} />
              {t("copyLink")}
            </Button>
          </motion.div>

          <motion.div
            whileHover={{scale: 1.02}}
            whileTap={{scale: 0.98}}>
            <Button
              variant='outline'
              size='sm'
              onClick={handleShareEmail}
              className={styles["actionButton"]}>
              <TbMail className={styles["buttonIcon"]} />
              {t("shareEmail")}
            </Button>
          </motion.div>
        </div>

        {/* Activity Summary Section */}
        <div className={styles["activitySection"]}>
          <h4 className={styles["activityTitle"]}>{t("activity.title")}:</h4>
          <ul className={styles["activityList"]}>
            <li className={styles["activityItem"]}>• {t("activity.created", {time: getRelativeTime(invoice.createdAt)})}</li>
            <li className={styles["activityItem"]}>• {t("activity.modified", {time: getRelativeTime(invoice.lastUpdatedAt)})}</li>
          </ul>
        </div>

        {/* Manage Sharing Button */}
        <Button
          variant='default'
          size='sm'
          onClick={handleManageSharing}
          className={styles["manageButton"]}>
          {t("manageSharing")} →
        </Button>
      </CardContent>
    </Card>
  );
}
