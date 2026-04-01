/**
 * @fileoverview Share & Collaborate card for the invoice view page.
 * @module domains/invoices/view-invoice/[id]/components/cards/ShareCollaborateCard
 *
 * @remarks
 * Displays invoice sharing status and provides quick actions for collaboration:
 * - Sharing status badge (Private/Shared/Public)
 * - Count of users the invoice is shared with
 * - Public/Private toggle switch
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

import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import {formatRelativeTime, LAST_GUID} from "@/lib/utils.generic";
import {Badge, Button, Card, CardContent, CardHeader, CardTitle, Label, Switch, toast} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback, useMemo, useTransition} from "react";
import {TbLock, TbShare, TbUsers, TbWorld} from "react-icons/tb";
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
 * 3. Public/Private toggle switch with optimistic updates
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
 * - Toast notifications for state changes
 * - Optimistic UI updates for toggle switch
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
  const {invoice, setInvoice} = useInvoiceContext();
  const {open: openShareDialog} = useDialog("SHARED__INVOICE_SHARE");
  const [isPending, startTransition] = useTransition();

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
   * Handles toggling the public/private status of the invoice.
   *
   * @remarks
   * **Behavior:**
   * - If currently public (has LAST_GUID), removes it to make private
   * - If currently private/shared, adds LAST_GUID to make public
   * - Uses optimistic UI updates with server action
   * - Shows toast feedback for success/failure
   */
  const handleTogglePublic = useCallback(async (): Promise<void> => {
    const isCurrentlyPublic = sharingStatus === "public";
    const newSharedWith = isCurrentlyPublic ? invoice.sharedWith.filter((guid) => guid !== LAST_GUID) : [...invoice.sharedWith, LAST_GUID];

    startTransition(() => {
      // Execute async work inside the transition without async keyword
      patchInvoice({
        invoiceId: invoice.id,
        payload: {sharedWith: newSharedWith},
      })
        .then((result) => {
          if (result.success) {
            setInvoice(result.invoice);
            toast.success(t(isCurrentlyPublic ? "madePrivate" : "madePublic"));
          } else {
            toast.error(t("toggleError"));
          }
        })
        .catch((error) => {
          console.error("Failed to toggle public status:", error);
          toast.error(t("toggleError"));
        });
    });
  }, [sharingStatus, invoice, setInvoice, t]);

  /**
   * Handles opening the ShareInvoiceDialog for managing sharing settings.
   *
   * @remarks
   * Opens the full ShareInvoiceDialog for managing all sharing settings.
   *
   * **Performance:** Memoized with useCallback.
   */
  const handleManageSharing = useCallback((): void => {
    openShareDialog({invoice});
  }, [invoice, openShareDialog]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className={styles["cardTitle"]}>
          <TbShare className={styles["titleIcon"]} />
          {t("title")}
        </CardTitle>
      </CardHeader>

      <CardContent className={styles["cardContent"]}>
        {/* Public Toggle Section */}
        <div className={styles["toggleSection"]}>
          <div className={styles["toggleRow"]}>
            <Label
              htmlFor='public-toggle'
              className={styles["toggleLabel"]}>
              <TbWorld className={styles["toggleIcon"]} />
              {t("publicAccess")}
            </Label>
            <Switch
              id='public-toggle'
              checked={sharingStatus === "public"}
              onCheckedChange={handleTogglePublic}
              disabled={isPending}
            />
          </div>
          <p className={styles["toggleDescription"]}>{t("publicAccessDescription")}</p>
        </div>

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

        {/* Activity Summary Section */}
        <div className={styles["activitySection"]}>
          <h4 className={styles["activityTitle"]}>{t("activity.title")}:</h4>
          <ul className={styles["activityList"]}>
            <li className={styles["activityItem"]}>• {t("activity.created", {time: formatRelativeTime(invoice.createdAt)})}</li>
            <li className={styles["activityItem"]}>• {t("activity.modified", {time: formatRelativeTime(invoice.lastUpdatedAt)})}</li>
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
