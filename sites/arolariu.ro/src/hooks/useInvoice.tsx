"use client";

/**
 * @fileoverview Custom React hook for fetching a single invoice by identifier.
 * @module hooks/useInvoice
 */

import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
import type {Invoice} from "@/types/invoices";
import {useEffect, useState} from "react";

/**
 * Input parameters for the useInvoice hook.
 */
type HookInputType = Readonly<{
  /** The UUID identifier of the invoice to fetch. Must be a valid UUIDv4 string. */
  invoiceIdentifier: string;
}>;

/**
 * Return value from the useInvoice hook.
 */
type HookOutputType = Readonly<{
  /** The fetched invoice object, or null if not yet loaded or on error. */
  invoice: Invoice | null;
  /** True while the fetch operation is in progress. */
  isLoading: boolean;
  /** True if the fetch operation failed with an error. */
  isError: boolean;
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
 * - Does not cache results (refetches on every mount)
 *
 * **State Management:**
 * - `isLoading`: True during fetch, false after completion
 * - `isError`: True if fetch fails (network error, 404, etc.)
 * - `invoice`: Null until successfully fetched
 *
 * **Error Handling:**
 * - Logs errors to console
 * - Sets `isError` flag but does not throw
 * - Returns null invoice on error
 *
 * **Performance Considerations:**
 * - No debouncing: Changes to identifier trigger immediate refetch
 * - No caching: Each mount results in new API call
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const fetchInvoiceForUser = async () => {
      setIsLoading(true);

      try {
        const invoice = await fetchInvoice({invoiceId: invoiceIdentifier});
        setInvoice(invoice);
      } catch (error: unknown) {
        console.error(">>> Error fetching invoice in useInvoice hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceForUser();
  }, [invoiceIdentifier]);

  return {invoice, isLoading, isError} as const;
}
