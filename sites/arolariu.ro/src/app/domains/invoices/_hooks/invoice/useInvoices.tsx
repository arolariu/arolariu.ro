"use client";

/**
 * @fileoverview Custom React hook for fetching all invoices for the current user.
 * @module app/domains/invoices/_hooks/invoice/useInvoices
 *
 * @remarks
 * Client-side data hook that hydrates from persisted Zustand state and then
 * fetches fresh invoices via a server action.
 */

import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {useCallback, useEffect, useRef, useState} from "react";
import {useShallow} from "zustand/react/shallow";
import {fetchInvoices} from "../../_actions/invoices";

/**
 * Input parameters for the useInvoices hook (currently unused).
 */
type HookInputType = Readonly<{}>;

/**
 * Return value from the useInvoices hook.
 */
type HookOutputType = Readonly<{
  /** Cached invoices for the current user. Kept unchanged when a fetch fails. */
  readonly invoices: ReadonlyArray<Invoice>;
  /** True until the persisted store finishes hydrating from IndexedDB. */
  readonly isLoading: boolean;
  /** True when the latest fetch failed; cleared when a later fetch succeeds. */
  readonly isError: boolean;
  /** Fetches the invoices again. Never rejects: failures set `isError` instead. */
  readonly refetch: () => Promise<void>;
}>;

/**
 * Fetches all invoices for the authenticated user with Zustand store integration.
 *
 * @remarks
 * **Rendering Context**: Client Component hook (requires "use client" directive).
 *
 * **Data Fetching Strategy:**
 * - Waits for IndexedDB hydration before rendering content
 * - Fetches fresh data once per mount and again whenever `refetch` is called
 * - Calls server action {@link fetchInvoices} via authenticated API
 * - Stores results in Zustand store for cross-component access
 *
 * **Hydration Behavior:**
 * - `isLoading` remains true only until IndexedDB hydration completes
 * - After hydration, cached/stale data is shown immediately
 * - Fresh data fetch happens in background and updates the UI when complete
 * - Eliminates flash of empty content on initial render
 *
 * **Caching Behavior:**
 * - Integrates with {@link useInvoicesStore} Zustand store
 * - Subsequent components mounting will see cached data
 * - No automatic revalidation beyond the mount fetch; call `refetch` to retry or refresh
 * - Store persists to IndexedDB for offline support
 *
 * **State Management:**
 * - `isLoading`: True only until hydration completes (stale data shown while fetching)
 * - `isError`: True when the latest fetch failed (network error, auth failure, invalid payload, etc.).
 *   It stays true while a retry is in flight and clears only when a fetch succeeds.
 * - `invoices`: Cached data shown immediately after hydration, updated when a fetch succeeds
 *
 * **Error Handling:**
 * - Logs errors to console
 * - Sets `isError` instead of throwing; `refetch` never rejects
 * - Leaves the cached invoices unchanged, so the consumer decides whether to show them
 *
 * **Concurrency:**
 * - The most recently started fetch wins; an older fetch that settles later is ignored
 *
 * **Performance:**
 * - One fetch per mount; a remount shows cached data immediately and revalidates in the background
 * - `refetch` keeps a stable identity across renders
 *
 * @param _void - Reserved parameter for potential future filter or pagination options.
 * @returns Hook state containing cached invoices, hydration loading state, fetch error flag, and a `refetch` callback.
 *
 * @example
 * ```tsx
 * function InvoiceList() {
 *   const {invoices, isLoading, isError, refetch} = useInvoices();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (isError) return <ErrorMessage onRetry={refetch} />;
 *
 *   return (
 *     <ul>
 *       {invoices.map((invoice) => (
 *         <InvoiceCard key={invoice.id} invoice={invoice} />
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Multiple components can access the same cached data
 * function InvoiceCount() {
 *   const {invoices} = useInvoices(); // Cached data now; this mount also revalidates in the background
 *   return <Badge>{invoices.length}</Badge>;
 * }
 * ```
 *
 * @see {@link fetchInvoices} - Server action that performs the API call
 * @see {@link useInvoicesStore} - Zustand store for invoice caching
 * @see {@link useInvoice} - Hook for fetching a single invoice
 */
export function useInvoices(_void?: HookInputType): HookOutputType {
  const [isError, setIsError] = useState<boolean>(false);
  const latestRequestIdRef = useRef<number>(0);

  // Read cached data and hydration state from Zustand store (single subscription)
  const {
    entities: cachedInvoices,
    setEntities: setInvoices,
    hasHydrated,
  } = useInvoicesStore(
    useShallow((state) => ({
      entities: state.entities,
      setEntities: state.setEntities,
      hasHydrated: state.hasHydrated,
    })),
  );

  const refetch = useCallback(async (): Promise<void> => {
    latestRequestIdRef.current += 1;
    const requestId = latestRequestIdRef.current;

    const applyResult = (result: Awaited<ReturnType<typeof fetchInvoices>>): void => {
      if (requestId !== latestRequestIdRef.current) return;

      if (result.success) {
        setInvoices([...result.data]);
        setIsError(false);
      } else {
        console.error(">>> Error fetching invoices:", result.error.code, result.error.message);
        setIsError(true);
      }
    };

    const applyFailure = (error: unknown): void => {
      if (requestId !== latestRequestIdRef.current) return;

      console.error(">>> Error fetching invoices in useInvoices hook:", error);
      setIsError(true);
    };

    // Keep state commits inside these handlers rather than after an `await`: the mount effect calls
    // refetch, and react-hooks/set-state-in-effect only recognizes callbacks as asynchronous.
    await fetchInvoices().then(applyResult).catch(applyFailure);
  }, [setInvoices]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Loading is true only until hydration completes (shows stale data while fetching fresh)
  const isLoading = !hasHydrated;

  return {invoices: cachedInvoices, isLoading, isError, refetch} as const;
}
