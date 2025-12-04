"use client";

/**
 * @fileoverview Custom React hook for fetching all invoices for the current user.
 * @module hooks/useInvoices
 */

import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";
import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {useEffect, useState} from "react";

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
 * - Fetches on initial mount only (empty dependency array)
 * - Calls server action {@link fetchInvoices} via authenticated API
 * - Stores results in Zustand store for cross-component access
 * - Returns possibly stale data from store immediately
 *
 * **Caching Behavior:**
 * - Integrates with {@link useInvoicesStore} Zustand store
 * - Subsequent components mounting will see cached data
 * - No automatic revalidation (manual refetch required)
 * - Store persists to localStorage (prod) or sessionStorage (dev)
 *
 * **State Management:**
 * - `isLoading`: True only during initial fetch, not on cached reads
 * - `isError`: True if fetch fails (network error, auth failure, etc.)
 * - `invoices`: Empty array until successfully fetched
 *
 * **Error Handling:**
 * - Logs errors to console
 * - Sets `isError` flag but does not throw
 * - Returns empty array on error
 *
 * **Performance:**
 * - Single fetch per session (in dev) or across sessions (in prod)
 * - No refetch on component remount (reads from store)
 * - setPossiblyStaleInvoices is stable (excluded from deps)
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Read cached data from Zustand store (may be empty or stale)
  const cachedInvoices = useInvoicesStore((state) => state.invoices);
  const setInvoices = useInvoicesStore((state) => state.setInvoices);

  useEffect(() => {
    const fetchInvoicesForUser = async () => {
      try {
        const fetchedInvoices = await fetchInvoices();
        setInvoices([...fetchedInvoices]);
      } catch (error: unknown) {
        console.error(">>> Error fetching invoices in useInvoices hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoicesForUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setInvoices is a stable function
  }, []);

  return {invoices: cachedInvoices, isLoading, isError} as const;
}
