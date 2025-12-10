"use client";

/**
 * @fileoverview Custom React hook for fetching all merchants for the current user.
 * @module hooks/useMerchants
 */

import fetchMerchants from "@/lib/actions/invoices/fetchMerchants";
import {useMerchantsStore} from "@/stores";
import type {Merchant} from "@/types/invoices";
import {useEffect, useState} from "react";
import {useShallow} from "zustand/react/shallow";

/**
 * Input parameters for the useMerchants hook (currently unused).
 */
type HookInputType = Readonly<{}>;

/**
 * Return value from the useMerchants hook.
 */
type HookOutputType = Readonly<{
  /** Array of all merchants associated with the user's invoices. Empty array if none exist or on error. */
  readonly merchants: ReadonlyArray<Merchant>;
  /** True while the initial fetch operation is in progress. */
  readonly isLoading: boolean;
  /** True if the fetch operation failed with an error. */
  readonly isError: boolean;
}>;

/**
 * Fetches all merchants for the authenticated user with Zustand store integration.
 *
 * @remarks
 * **Rendering Context**: Client Component hook (requires "use client" directive).
 *
 * **Data Fetching Strategy:**
 * - Waits for IndexedDB hydration before rendering content
 * - Fetches fresh data on initial mount (empty dependency array)
 * - Calls server action {@link fetchMerchants} via authenticated API
 * - Stores results in Zustand store for cross-component access
 *
 * **Hydration Behavior:**
 * - `isLoading` remains true only until IndexedDB hydration completes
 * - After hydration, cached/stale data is shown immediately
 * - Fresh data fetch happens in background and updates the UI when complete
 * - Eliminates flash of empty content on initial render
 *
 * **Caching Behavior:**
 * - Integrates with {@link useMerchantsStore} Zustand store
 * - Subsequent components mounting will see cached data
 * - No automatic revalidation (manual refetch required)
 * - Store persists to IndexedDB for offline support
 *
 * **State Management:**
 * - `isLoading`: True only until hydration completes (stale data shown while fetching)
 * - `isError`: True if fetch fails (network error, auth failure, etc.)
 * - `merchants`: Cached data shown immediately after hydration, updated when fetch completes
 *
 * **Error Handling:**
 * - Logs errors to console
 * - Sets `isError` flag but does not throw
 * - Returns empty array on error
 *
 * **Use Cases:**
 * - Merchant dropdown/select components
 * - Merchant list pages
 * - Invoice filtering by merchant
 * - Analytics dashboards
 *
 * **Performance:**
 * - Single fetch per session (in dev) or across sessions (in prod)
 * - No refetch on component remount (reads from store)
 * - setMerchants is stable (excluded from deps)
 *
 * @param _void - Unused parameter (for potential future expansion)
 * @returns Object containing merchants array, loading state, and error state
 *
 * @example
 * ```tsx
 * function MerchantFilter() {
 *   const {merchants, isLoading, isError} = useMerchants();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (isError) return <ErrorMessage />;
 *
 *   return (
 *     <Select>
 *       {merchant.map((m) => (
 *         <SelectItem key={m.id} value={m.id}>
 *           {m.name}
 *         </SelectItem>
 *       ))}
 *     </Select>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Multiple components can access the same cached data
 * function MerchantCount() {
 *   const {merchants} = useMerchants(); // Reads from store, no refetch
 *   return <Badge>{merchants.length} merchants</Badge>;
 * }
 * ```
 *
 * @see {@link fetchMerchants} - Server action that performs the API call
 * @see {@link useMerchantsStore} - Zustand store for merchant caching
 * @see {@link useMerchant} - Hook for fetching a single merchant
 */
export function useMerchants(_void?: HookInputType): HookOutputType {
  const [isError, setIsError] = useState<boolean>(false);

  // Read cached data and hydration state from Zustand store (single subscription)
  const {
    merchants: cachedMerchants,
    setMerchants,
    hasHydrated,
  } = useMerchantsStore(
    useShallow((state) => ({
      merchants: state.merchants,
      setMerchants: state.setMerchants,
      hasHydrated: state.hasHydrated,
    })),
  );

  useEffect(() => {
    const fetchMerchantsForUser = async () => {
      try {
        const merchants = await fetchMerchants();
        setMerchants([...merchants]);
      } catch (error: unknown) {
        console.error(">>> Error fetching merchants in useMerchants hook:", error as Error);
        setIsError(true);
      }
    };

    fetchMerchantsForUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setMerchants is a stable function
  }, []);

  // Loading is true only until hydration completes (shows stale data while fetching fresh)
  const isLoading = !hasHydrated;

  return {merchants: cachedMerchants, isLoading, isError} as const;
}
