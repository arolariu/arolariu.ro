"use client";

/**
 * @fileoverview Hook for managing invoice deletion (single + bulk) with server action integration.
 * @module app/domains/invoices/_hooks/useInvoiceDelete
 */

import deleteInvoice from "@/lib/actions/invoices/deleteInvoice";
import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";

/**
 * Result of a bulk delete operation.
 */
type BulkDeleteResult = Readonly<{
  successCount: number;
  failureCount: number;
  failedIds: readonly string[];
}>;

/**
 * Hook output type.
 */
type UseInvoiceDeleteOutput = Readonly<{
  isDeleting: boolean;
  isBulkDeleting: boolean;
  performDelete: (invoice: Invoice) => Promise<void>;
  performDeleteBulk: (invoiceIds: readonly string[]) => Promise<BulkDeleteResult>;
}>;

/**
 * Manages invoice deletion (single + bulk) with toast notifications and store sync.
 *
 * @remarks
 * **Behavior contract:**
 * - `performDelete(invoice)`:
 *   1. Sets `isDeleting→true`
 *   2. Calls `deleteInvoice({invoiceId})` (throws on failure)
 *   3. On success: removes entity from store, toasts success, calls `onComplete`
 *   4. On failure: toasts error with the error message; entity NOT removed; `onComplete` NOT called
 *   5. Resets `isDeleting→false` in `finally`
 *
 * - `performDeleteBulk(invoiceIds)`:
 *   1. Sets `isBulkDeleting→true`
 *   2. Iterates sequentially; per-id try/catch so one failure doesn't abort the batch
 *   3. Aggregates `successCount`/`failureCount` and failed invoice IDs
 *   4. Emits ONE summary toast based on outcome (all-success / all-fail / partial)
 *   5. Calls `onComplete` once at the end (regardless of outcome) so consumers can handle cleanup
 *   6. Returns the aggregated counts and failed invoice IDs
 *
 * @param onComplete - Optional callback after a (single or bulk) delete operation completes
 * @returns Object containing deletion state and action callbacks
 *
 * @example
 * ```tsx
 * const {isDeleting, performDelete} = useInvoiceDelete(() => router.push("/domains/invoices/view-invoices"));
 * <button onClick={() => performDelete(invoice)} disabled={isDeleting}>Delete</button>
 * ```
 */
export function useInvoiceDelete(onComplete?: () => void): UseInvoiceDeleteOutput {
  const t = useTranslations("IMS--Hooks.useInvoiceDelete");
  const removeEntity = useInvoicesStore((state) => state.removeEntity);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const performDelete = useCallback(
    async (invoice: Invoice): Promise<void> => {
      setIsDeleting(true);
      try {
        await deleteInvoice({invoiceId: invoice.id});
        removeEntity(invoice.id);
        toast.success(t("deleteSuccess"));
        onComplete?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(t("deleteError", {error: message}));
        console.error("Error deleting invoice:", error);
      } finally {
        setIsDeleting(false);
      }
    },
    [onComplete, removeEntity, t],
  );

  const performDeleteBulk = useCallback(
    async (invoiceIds: readonly string[]): Promise<BulkDeleteResult> => {
      setIsBulkDeleting(true);
      let successCount = 0;
      let failureCount = 0;
      const failedIds: string[] = [];
      try {
        for (const id of invoiceIds) {
          try {
            await deleteInvoice({invoiceId: id});
            removeEntity(id);
            successCount += 1;
          } catch (error) {
            console.error(`Failed to delete invoice ${id}:`, error);
            failureCount += 1;
            failedIds.push(id);
          }
        }

        if (failureCount === 0) {
          toast.success(t("bulkDeleteSuccess", {count: successCount}));
        } else if (successCount === 0) {
          toast.error(t("bulkDeleteError", {count: failureCount}));
        } else {
          toast.info(t("bulkDeletePartial", {successCount, failureCount}));
        }

        onComplete?.();
      } finally {
        setIsBulkDeleting(false);
      }
      return {successCount, failureCount, failedIds};
    },
    [onComplete, removeEntity, t],
  );

  return {isDeleting, isBulkDeleting, performDelete, performDeleteBulk};
}
