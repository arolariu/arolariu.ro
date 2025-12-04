"use client";

/**
 * @fileoverview Custom React hook for fetching all merchants for the current user.
 * @module hooks/useMerchants
 */

import fetchMerchants from "@/lib/actions/invoices/fetchMerchants";
import {useMerchantsStore} from "@/stores";
import type {Merchant} from "@/types/invoices";
import {useEffect, useState} from "react";

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
 * - Fetches on initial mount only (empty dependency array)
 * - Calls server action {@link fetchMerchants} via authenticated API
 * - Stores results in Zustand store for cross-component access
 * - Returns possibly stale data from store immediately
 *
 * **Caching Behavior:**
 * - Integrates with {@link useMerchantsStore} Zustand store
 * - Subsequent components mounting will see cached data
 * - No automatic revalidation (manual refetch required)
 * - Store persists to localStorage (prod) or sessionStorage (dev)
 *
 * **State Management:**
 * - `isLoading`: True only during initial fetch, not on cached reads
 * - `isError`: True if fetch fails (network error, auth failure, etc.)
 * - `merchant`: Empty array until successfully fetched
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
 * - setPossiblyStaleMerchants is stable (excluded from deps)
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Read cached data from Zustand store (may be empty or stale)
  const cachedMerchants = useMerchantsStore((state) => state.merchants);
  const setMerchants = useMerchantsStore((state) => state.setMerchants);

  useEffect(() => {
    const fetchMerchantsForUser = async () => {
      try {
        const merchants = await fetchMerchants();
        setMerchants([...merchants]);
      } catch (error: unknown) {
        console.error(">>> Error fetching merchants in useMerchants hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMerchantsForUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setMerchants is a stable function
  }, []);

  return {merchants: cachedMerchants, isLoading, isError} as const;
}
