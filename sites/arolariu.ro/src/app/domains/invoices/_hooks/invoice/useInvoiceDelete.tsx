"use client";

/**
 * @fileoverview Hook for deleting invoices individually or in sequential batches.
 * @module app/domains/invoices/_hooks/invoice/useInvoiceDelete
 *
 * @remarks
 * Wraps the invoice deletion server action with client-side loading state,
 * toast feedback, navigation after single deletes, and Zustand store updates.
 * Bulk deletion is intentionally sequential so a partial failure can be
 * reported without overwhelming the backend.
 */

import {useInvoicesStore} from "@/stores";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {deleteInvoice as deleteInvoiceServerSide} from "../../_actions/invoices";

/**
 * Result of a bulk delete operation.
 *
 * @remarks
 * Returned by `performDelete` when called with an array of invoice IDs.
 * Provides detailed breakdown of operation outcome for error handling and UI feedback.
 *
 * **Immutability**: This is a readonly type; consumers cannot modify the result.
 */
type BulkDeleteResult = Readonly<{
  /** Number of invoices successfully deleted from both server and client stores */
  successCount: number;
  /** Number of invoices that failed to delete (server errors, network failures, etc.) */
  failureCount: number;
  /** Array of invoice IDs that failed deletion. Use for retry logic or user notification. */
  failedIds: readonly string[];
}>;

/**
 * Hook output type for invoice deletion operations.
 *
 * @remarks
 * `deleteInvoiceCallback` is overloaded: passing a single invoice ID resolves
 * when the operation completes, while passing an array returns aggregate bulk
 * deletion counts and failed IDs.
 */
type HookOutputType = Readonly<{
  isDeleting: boolean;
  deleteInvoiceCallback: {
    (invoiceId: string): Promise<void>;
    (invoiceIds: readonly string[]): Promise<BulkDeleteResult>;
  };
}>;

/**
 * Manages invoice deletion with toast notifications and invoice store sync.
 *
 * @remarks
 * **Behavior contract:**
 * - `deleteInvoiceCallback(invoiceId: string)`:
 *   1. Sets `isDeleting→true`
 *   2. Calls server mutation and removes entity from Zustand store
 *   3. On success: removes the entity locally, shows a success toast, and navigates to the invoice list
 *   4. On failure: shows an error toast and keeps the entity in local state
 *   5. Resets `isDeleting→false` in `finally`
 *
 * - `deleteInvoiceCallback(invoiceIds: readonly string[])`:
 *   1. Sets `isDeleting→true`
 *   2. Processes deletions recursively via tail-recursive `processBulkRecursive`
 *   3. Aggregates `successCount`/`failureCount` and failed invoice IDs
 *   4. Emits ONE summary toast based on outcome (all-success / all-fail / partial)
 *   5. Returns the aggregated counts and failed invoice IDs
 *   6. Resets `isDeleting→false` in `finally`
 *
 * **Design Rationale:**
 * - Single `deleteInvoiceCallback` function uses method overloading for ergonomic API
 * - Recursive bulk processing ensures sequential execution without blocking
 * - Unified error handling reduces code duplication
 * - Client-side mutations keep the store aligned after each awaited server action
 *
 * **Performance Characteristics:**
 * - Bulk deletions process sequentially (not parallel) to avoid overwhelming the backend
 * - Each deletion is independent; one failure doesn't abort remaining operations
 * - Zustand store updates are synchronous for immediate UI responsiveness
 * - Loading state (`isDeleting`) is shared across single and bulk operations
 *
 * **Error Handling:**
 * - Single deletions: Catches errors, toasts message, does NOT call `onComplete`
 * - Bulk deletions: Per-item try/catch ensures partial success is possible
 *
 * @returns Hook state with deletion progress and the unified delete callback.
 *
 * @example
 * Single deletion:
 * ```tsx
 * const {isDeleting, deleteInvoiceCallback} = useInvoiceDelete();
 * <button onClick={() => deleteInvoiceCallback("inv-123")} disabled={isDeleting}>Delete</button>
 * ```
 *
 * @example
 * Bulk deletion with result handling:
 * ```tsx
 * const {isDeleting, deleteInvoiceCallback} = useInvoiceDelete();
 * const result = await deleteInvoiceCallback(["inv-1", "inv-2", "inv-3"]);
 * if (result.failureCount > 0) {
 *   console.log(`Failed to delete: ${result.failedIds.join(", ")}`);
 * }
 * ```
 *
 * @see {@link performMutation} - Internal helper for atomic server + client mutation
 * @see {@link processBulkRecursive} - Internal recursive bulk processor
 */
export function useInvoiceDelete(): Readonly<HookOutputType> {
  const deleteInvoiceClientSide = useInvoicesStore((state) => state.removeEntity);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const t = useTranslations();
  const router = useRouter();

  /**
   * Deletes an invoice on the server and removes it from the client store.
   *
   * @remarks
   * **Atomicity:** This operation is NOT atomic. If server mutation succeeds but client
   * mutation fails, the invoice will be deleted on the server but remain in the UI until
   * page refresh. In practice, client mutations are synchronous and infallible.
   *
   * **Error Propagation:** Failed server action results and exceptions thrown by
   * the server action or store mutation propagate to the caller.
   *
   * @param id - Invoice UUID to delete. Must be a valid identifier in both server and client stores.
   * @returns A promise that resolves after the server action has completed and the local store has been updated.
   *
   * @see {@link deleteInvoiceServerSide} - Server action performing the deletion
   * @see {@link deleteInvoiceClientSide} - Zustand store mutation
   */
  const performMutation = useCallback(
    async (id: string): Promise<void> => {
      const result = await deleteInvoiceServerSide({invoiceId: id});
      if (!result.success) {
        throw new Error(result.error.message);
      }
      deleteInvoiceClientSide(id);
    },
    [deleteInvoiceClientSide],
  );

  /**
   * Recursively processes bulk invoice deletions with failure tracking.
   *
   * @remarks
   * **Tail-Recursive Pattern**: Uses async tail recursion to process deletions sequentially
   * without blocking the event loop. Each iteration returns a Promise, avoiding stack overflow.
   *
   * **Error Isolation**: Each deletion is wrapped in try/catch. One failure does not abort
   * the batch; instead, it's recorded in `failedIds` and processing continues.
   *
   * **Accumulator Immutability**: The `acc` parameter is treated immutably; each recursive
   * call creates a new object with updated counts. This ensures predictable state updates.
   *
   * **Termination Condition**: Base case triggers when `index >= ids.length`, returning
   * the final accumulated result.
   *
   * **Performance**: Processes deletions sequentially to avoid overwhelming the backend.
   * For large batches (>100 items), consider chunking or progress indicators.
   *
   * @param ids - Array of invoice UUIDs to delete sequentially.
   * @param index - Current position in the array (0-based). Start with 0.
   * @param acc - Accumulator object tracking success/failure counts and failed IDs.
   * @returns Aggregated deletion result after every invoice ID has been attempted.
   *
   * @example
   * Internal usage (not called directly by consumers):
   * ```typescript
   * const result = await processBulkRecursive(
   *   ["inv-1", "inv-2", "inv-3"],
   *   0,
   *   {successCount: 0, failureCount: 0, failedIds: []}
   * );
   * // result: {successCount: 2, failureCount: 1, failedIds: ["inv-2"]}
   * ```
   *
   * @see {@link performMutation} - Atomic deletion operation called per iteration
   */
  const processBulkRecursive = useCallback(
    async (
      ids: readonly string[],
      index: number,
      acc: {successCount: number; failureCount: number; failedIds: string[]},
    ): Promise<BulkDeleteResult> => {
      if (index >= ids.length) {
        return acc;
      }
      const id = ids[index]!;
      try {
        await performMutation(id);
        return await processBulkRecursive(ids, index + 1, {
          ...acc,
          successCount: acc.successCount + 1,
        });
      } catch (error) {
        console.error(`Failed to delete invoice ${id}:`, error);
        return await processBulkRecursive(ids, index + 1, {
          ...acc,
          failureCount: acc.failureCount + 1,
          failedIds: [...acc.failedIds, id],
        });
      }
    },
    [performMutation],
  );

  /**
   * Unified delete handler supporting both single and bulk invoice deletion.
   *
   * @remarks
   * **Method Overloading**: TypeScript signature provides two overloads:
   * - `(invoiceId: string): Promise<void>` - Single deletion
   * - `(invoiceIds: readonly string[]): Promise<BulkDeleteResult>` - Bulk deletion
   *
   * **Single Delete Flow**:
   * 1. Calls `deleteAndMutate` (may throw)
   * 2. On success: toasts success, calls `onComplete`
   * 3. On error: toasts error, logs to console, does NOT call `onComplete`
   *
   * **Bulk Delete Flow**:
   * 1. Calls `processBulkRecursive` with initial accumulator
   * 2. Aggregates results and determines toast type (success/error/info)
   * 3. Always calls `onComplete` (even on partial failure)
   * 4. Returns detailed result object
   *
   * **Loading State**: Sets `isDeleting` to true at start, false in finally block.
   * This prevents race conditions and ensures UI state consistency.
   *
   * @param invoiceIdOrIds - Single invoice UUID or array of UUIDs to delete.
   * @returns A promise resolving to void for a single delete, or aggregate counts for a bulk delete.
   *
   * @see {@link BulkDeleteResult} - Return type for bulk operations
   */
  async function deleteInvoiceCallback(invoiceId: string): Promise<void>;
  async function deleteInvoiceCallback(invoiceIds: readonly string[]): Promise<BulkDeleteResult>;
  async function deleteInvoiceCallback(invoiceIdOrIds: string | readonly string[]): Promise<void | BulkDeleteResult> {
    setIsDeleting(true);
    try {
      if (typeof invoiceIdOrIds === "string") {
        await performMutation(invoiceIdOrIds);
        toast.success(t((m) => m.toasts.invoices.useInvoiceDelete.deleteSuccess));
        router.push("/domains/invoices/view-invoices");
      } else {
        const result = await processBulkRecursive(invoiceIdOrIds, 0, {
          successCount: 0,
          failureCount: 0,
          failedIds: [],
        });

        const hasFailure = result.failureCount > 0;
        const hasSuccess = result.successCount > 0;

        if (!hasFailure) {
          toast.success(t((m) => m.toasts.invoices.useInvoiceDelete.bulkDeleteSuccess, {count: String(result.successCount)}));
        } else if (!hasSuccess) {
          toast.error(t((m) => m.toasts.invoices.useInvoiceDelete.bulkDeleteError, {count: String(result.failureCount)}));
        } else {
          toast.info(
            t((m) => m.toasts.invoices.useInvoiceDelete.bulkDeletePartial, {
              successCount: String(result.successCount),
              failureCount: String(result.failureCount),
            }),
          );
        }

        return result;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(t((m) => m.toasts.invoices.useInvoiceDelete.deleteError, {error: message}));
      console.error("Error deleting invoice:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  return {isDeleting, deleteInvoiceCallback};
}
