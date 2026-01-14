"use client";

/**
 * @fileoverview Custom React hook for fetching a single invoice by identifier.
 * @module hooks/useInvoice
 *
 * @remarks
 * Client-side data hook that integrates with the invoices Zustand store.
 * The exported hook uses a stale-while-revalidate pattern: it returns cached
 * data after hydration while re-fetching in the background.
 */

import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {useEffect, useState} from "react";
import {useShallow} from "zustand/react/shallow";

/**
 * Input parameters for the useInvoice hook.
 */
type HookInputType = Readonly<{
  /** The UUID identifier of the invoice to fetch. Must be a valid UUIDv4 string. */
  readonly invoiceIdentifier: string;
}>;

/**
 * Return value from the useInvoice hook.
 */
type HookOutputType = Readonly<{
  /** The fetched invoice object, or null if not yet loaded or on error. */
  readonly invoice: Invoice | null;
  /** True while the fetch operation is in progress. */
  readonly isLoading: boolean;
  /** True if the fetch operation failed with an error. */
  readonly isError: boolean;
}>;

/**
 * Fetches a single invoice by identifier from the backend API.
 *
 * @remarks
 * **Rendering Context**: Client Component hook (requires "use client" directive).
 *
 * **Data Fetching:**
 * - Calls server action {@link fetchInvoice} via authenticated API
 * - Automatically refetches when `invoiceIdentifier` changes
 * - Cached data shown immediately after hydration while fresh data loads
 *
 * **Hydration Behavior:**
 * - `isLoading` remains true only until IndexedDB hydration completes
 * - After hydration, cached/stale data is shown immediately
 * - Fresh data fetch happens in background and updates the UI when complete
 *
 * **State Management:**
 * - `isLoading`: True only until hydration completes (stale data shown while fetching)
 * - `isError`: True if fetch fails (network error, 404, etc.)
 * - `invoice`: Cached data shown immediately after hydration, updated when fetch completes
 *
 * **Error Handling:**
 * - Logs errors to console
 * - Sets `isError` flag but does not throw
 * - Returns null invoice on error
 *
 * **Performance Considerations:**
 * - No debouncing: Changes to identifier trigger immediate refetch
 * - Stale-while-revalidate pattern: shows cached data while fetching fresh
 * - Consider using {@link useInvoices} with client-side filtering for better performance
 *
 * @param params - Hook configuration
 * @param params.invoiceIdentifier - UUID of invoice to fetch
 * @returns Object containing invoice data, loading state, and error state
 *
 * @example
 * ```tsx
 * function InvoiceDetailPage({invoiceId}: {invoiceId: string}) {
 *   const {invoice, isLoading, isError} = useInvoice({invoiceIdentifier: invoiceId});
 *
 *   if (isLoading) return <Spinner />;
 *   if (isError) return <ErrorMessage />;
 *   if (!invoice) return <NotFound />;
 *
 *   return <InvoiceDetails invoice={invoice} />;
 * }
 * ```
 *
 * @see {@link fetchInvoice} - Server action that performs the API call
 * @see {@link useInvoices} - Hook for fetching all user invoices
 */
export function useInvoice({invoiceIdentifier}: HookInputType): HookOutputType {
  const [isError, setIsError] = useState<boolean>(false);

  // Read cached data and hydration state from Zustand store (single subscription)
  const {cachedInvoice, upsertInvoice, hasHydrated} = useInvoicesStore(
    useShallow((state) => ({
      cachedInvoice: state.invoices.find((inv) => inv.id === invoiceIdentifier) ?? null,
      upsertInvoice: state.upsertInvoice,
      hasHydrated: state.hasHydrated,
    })),
  );

  useEffect(() => {
    const fetchInvoiceForUser = async () => {
      try {
        const result = await fetchInvoice({invoiceId: invoiceIdentifier});
        if (result.success) {
          upsertInvoice(result.data);
        } else {
          console.error(">>> Error fetching invoice:", result.error.code, result.error.message);
          setIsError(true);
        }
      } catch (error: unknown) {
        console.error(">>> Error fetching invoice in useInvoice hook:", error as Error);
        setIsError(true);
      }
    };

    fetchInvoiceForUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- upsertInvoice is a stable function
  }, [invoiceIdentifier]);

  // Loading is true only until hydration completes (shows stale data while fetching fresh)
  const isLoading = !hasHydrated;

  return {invoice: cachedInvoice, isLoading, isError} as const;
}
