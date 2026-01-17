"use client";

/**
 * @fileoverview Custom React hook for fetching a single merchant by identifier.
 * @module hooks/useMerchant
 *
 * @remarks
 * Client-side data hook that integrates with the merchants Zustand store.
 * Returns cached merchant data after hydration while revalidating in the
 * background when the identifier changes.
 */

import fetchMerchant from "@/lib/actions/invoices/fetchMerchant";
import {useMerchantsStore} from "@/stores";
import type {Merchant} from "@/types/invoices";
import {useEffect, useState} from "react";
import {useShallow} from "zustand/react/shallow";

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
 * - `merchant`: Cached data shown immediately after hydration, updated when fetch completes
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
 * - Stale-while-revalidate pattern: shows cached data while fetching fresh
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
 *       <p>{merchant.address.address}</p>
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

  // Read cached data and hydration state from Zustand store (single subscription)
  const {cachedMerchant, upsertMerchant, hasHydrated} = useMerchantsStore(
    useShallow((state) => ({
      cachedMerchant: state.merchants.find((m) => m.id === merchantIdentifier) ?? null,
      upsertMerchant: state.upsertMerchant,
      hasHydrated: state.hasHydrated,
    })),
  );

  useEffect(() => {
    const fetchMerchantForUser = async () => {
      try {
        const result = await fetchMerchant({merchantId: merchantIdentifier});
        if (result.success) {
          upsertMerchant(result.data);
        } else {
          console.error(">>> Error fetching merchant:", result.error.code, result.error.message);
          setIsError(true);
        }
      } catch (error: unknown) {
        console.error(">>> Error fetching merchant in useMerchant hook:", error as Error);
        setIsError(true);
      }
    };

    fetchMerchantForUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- upsertMerchant is a stable function
  }, [merchantIdentifier]);

  // Loading is true only until hydration completes (shows stale data while fetching fresh)
  const isLoading = !hasHydrated;

  return {merchant: cachedMerchant, isLoading, isError} as const;
}
