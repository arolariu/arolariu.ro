"use client";

/**
 * @fileoverview Custom React hook for fetching a single merchant by identifier.
 * @module hooks/useMerchant
 */

import fetchMerchant from "@/lib/actions/invoices/fetchMerchant";
import {useMerchantsStore} from "@/stores";
import type {Merchant} from "@/types/invoices";
import {useEffect, useState} from "react";

/**
 * Input parameters for the useMerchant hook.
 */
type HookInputType = Readonly<{
  /** The UUID identifier of the merchant to fetch. Must be a valid UUIDv4 string. */
  readonly merchantIdentifier: string;
}>;

/**
 * Return value from the useMerchant hook.
 */
type HookOutputType = Readonly<{
  /** The fetched merchant object, or null if not yet loaded or on error. */
  readonly merchant: Merchant | null;
  /** True while the fetch operation is in progress. */
  readonly isLoading: boolean;
  /** True if the fetch operation failed with an error. */
  readonly isError: boolean;
}>;

/**
 * Fetches a single merchant by identifier from the backend API.
 *
 * @remarks
 * **Rendering Context**: Client Component hook (requires "use client" directive).
 *
 * **Data Fetching:**
 * - Calls server action {@link fetchMerchant} via authenticated API
 * - Automatically refetches when `merchantIdentifier` changes
 * - Does not cache results (refetches on every mount)
 *
 * **State Management:**
 * - `isLoading`: True during fetch, false after completion
 * - `isError`: True if fetch fails (network error, 404, etc.)
 * - `merchant`: Null until successfully fetched
 *
 * **Error Handling:**
 * - Logs errors to console
 * - Sets `isError` flag but does not throw
 * - Returns null merchant on error
 *
 * **Use Cases:**
 * - Displaying merchant details on invoice pages
 * - Merchant profile pages
 * - Enriching invoice displays with merchant information
 *
 * **Performance Considerations:**
 * - No debouncing: Changes to identifier trigger immediate refetch
 * - No caching: Each mount results in new API call
 * - Consider using {@link useMerchants} with client-side filtering for list views
 *
 * @param params - Hook configuration
 * @param params.merchantIdentifier - UUID of merchant to fetch
 * @returns Object containing merchant data, loading state, and error state
 *
 * @example
 * ```tsx
 * function MerchantDetails({merchantId}: {merchantId: string}) {
 *   const {merchant, isLoading, isError} = useMerchant({merchantIdentifier: merchantId});
 *
 *   if (isLoading) return <Spinner />;
 *   if (isError) return <ErrorMessage message="Failed to load merchant" />;
 *   if (!merchant) return <NotFound />;
 *
 *   return (
 *     <div>
 *       <h2>{merchant.name}</h2>
 *       <p>{merchant.address}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @see {@link fetchMerchant} - Server action that performs the API call
 * @see {@link useMerchants} - Hook for fetching all merchants
 */
export function useMerchant({merchantIdentifier}: HookInputType): HookOutputType {
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Read cached data from Zustand store (may be null or stale)
  const cachedMerchant = useMerchantsStore((state) => state.merchants.find((m) => m.id === merchantIdentifier) ?? null);
  const upsertMerchant = useMerchantsStore((state) => state.upsertMerchant);

  useEffect(() => {
    const fetchMerchantForUser = async () => {
      try {
        const merchant = await fetchMerchant({merchantId: merchantIdentifier});
        upsertMerchant(merchant);
      } catch (error: unknown) {
        console.error(">>> Error fetching merchant in useMerchant hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMerchantForUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- upsertMerchant is a stable function
  }, [merchantIdentifier]);

  return {merchant: cachedMerchant, isLoading, isError} as const;
}
