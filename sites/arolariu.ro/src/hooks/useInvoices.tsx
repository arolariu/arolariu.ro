"use client";

/**
 * @fileoverview Custom React hook for fetching all invoices for the current user.
 * @module hooks/useInvoices
 *
 * @remarks
 * Client-side data hook that hydrates from persisted Zustand state and then
 * fetches fresh invoices via a server action.
 */

import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";
import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {useEffect, useState} from "react";
import {useShallow} from "zustand/react/shallow";

/**
 * Input parameters for the useInvoices hook (currently unused).
 */
type HookInputType = Readonly<{}>;

/**
 * Return value from the useInvoices hook.
 */
type HookOutputType = Readonly<{
  /** Array of all invoices for the current user. Empty array if none exist or on error. */
  readonly invoices: ReadonlyArray<Invoice>;
  /** True while the initial fetch operation is in progress. */
  readonly isLoading: boolean;
  /** True if the fetch operation failed with an error. */
  readonly isError: boolean;
}>;

/**
 * Fetches all invoices for the authenticated user with Zustand store integration.
 *
 * @remarks
 * **Rendering Context**: Client Component hook (requires "use client" directive).
 *
 * **Data Fetching Strategy:**
 * - Waits for IndexedDB hydration before rendering content
 * - Fetches fresh data on initial mount (empty dependency array)
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
 * - No automatic revalidation (manual refetch required)
 * - Store persists to IndexedDB for offline support
 *
 * **State Management:**
 * - `isLoading`: True only until hydration completes (stale data shown while fetching)
 * - `isError`: True if fetch fails (network error, auth failure, etc.)
 * - `invoices`: Cached data shown immediately after hydration, updated when fetch completes
 *
 * **Error Handling:**
 * - Logs errors to console
 * - Sets `isError` flag but does not throw
 * - Returns empty array on error
 *
 * **Performance:**
 * - Single fetch per session (in dev) or across sessions (in prod)
 * - No refetch on component remount (reads from store)
 * - setInvoices is stable (excluded from deps)
 *
 * @param _void - Unused parameter (for potential future expansion)
 * @returns Object containing invoices array, loading state, and error state
 *
 * @example
 * ```tsx
 * function InvoiceList() {
 *   const {invoices, isLoading, isError} = useInvoices();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (isError) return <ErrorMessage />;
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
 *   const {invoices} = useInvoices(); // Reads from store, no refetch
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

  // Read cached data and hydration state from Zustand store (single subscription)
  const {
    invoices: cachedInvoices,
    setInvoices,
    hasHydrated,
  } = useInvoicesStore(
    useShallow((state) => ({
      invoices: state.invoices,
      setInvoices: state.setInvoices,
      hasHydrated: state.hasHydrated,
    })),
  );

  useEffect(() => {
    const fetchInvoicesForUser = async () => {
      try {
        const fetchedInvoices = await fetchInvoices();
        setInvoices([...fetchedInvoices]);
      } catch (error: unknown) {
        console.error(">>> Error fetching invoices in useInvoices hook:", error as Error);
        setIsError(true);
      }
    };

    fetchInvoicesForUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setInvoices is a stable function
  }, []);

  // Loading is true only until hydration completes (shows stale data while fetching fresh)
  const isLoading = !hasHydrated;

  return {invoices: cachedInvoices, isLoading, isError} as const;
}
