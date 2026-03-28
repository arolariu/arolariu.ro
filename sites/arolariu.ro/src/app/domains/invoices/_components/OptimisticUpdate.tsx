/**
 * @fileoverview Hook for managing optimistic updates with server reconciliation.
 * @module @/app/domains/invoices/_components/OptimisticUpdate
 */

"use client";

import {useCallback, useState} from "react";

/**
 * Return type for the useOptimisticUpdate hook.
 *
 * @template T - The type of data being managed
 */
type OptimisticState<T> = {
  /** Current data (either optimistic or server-reconciled) */
  data: T;
  /** Whether an update is in progress */
  isPending: boolean;
  /** Error message if the update failed */
  error: string | null;
  /** Update data optimistically, then reconcile with server */
  update: (optimisticData: T, serverAction: () => Promise<T>) => Promise<void>;
  /** Reset error state */
  reset: () => void;
};

/**
 * Hook for managing optimistic UI updates with automatic rollback on failure.
 * Updates the UI immediately with optimistic data, then reconciles with server response.
 * On error, automatically rolls back to the previous state.
 *
 * @template T - The type of data being managed
 * @param initialData - Initial data state
 * @returns Object with current state and update functions
 *
 * @example
 * ```tsx
 * const {data, isPending, error, update} = useOptimisticUpdate({status: "pending"});
 *
 * const markAsPaid = async () => {
 *   await update(
 *     {status: "paid"}, // Optimistic
 *     async () => {
 *       return await updateInvoiceStatus(invoiceId, "paid"); // Server
 *     }
 *   );
 * };
 * ```
 */
export function useOptimisticUpdate<T>(initialData: T): OptimisticState<T> {
  const [data, setData] = useState<T>(initialData);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update data optimistically, then reconcile with server.
   *
   * @param optimisticData - The optimistic data to show immediately
   * @param serverAction - Async function that performs the server update
   */
  const update = useCallback(
    async (optimisticData: T, serverAction: () => Promise<T>) => {
      const previousData = data;
      setData(optimisticData); // Optimistic update
      setIsPending(true);
      setError(null);

      try {
        const result = await serverAction();
        setData(result); // Server truth
      } catch (err) {
        setData(previousData); // Rollback on error
        setError(err instanceof Error ? err.message : "Update failed");
      } finally {
        setIsPending(false);
      }
    },
    [data],
  );

  /**
   * Reset error state.
   */
  const reset = useCallback(() => {
    setError(null);
    setIsPending(false);
  }, []);

  return {data, isPending, error, update, reset};
}
