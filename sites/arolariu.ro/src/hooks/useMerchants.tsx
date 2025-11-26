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
  merchant: Merchant[];
  /** True while the initial fetch operation is in progress. */
  isLoading: boolean;
  /** True if the fetch operation failed with an error. */
  isError: boolean;
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
 *   const {merchant, isLoading, isError} = useMerchants();
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
 *   const {merchant} = useMerchants(); // Reads from store, no refetch
 *   return <Badge>{merchant.length} merchants</Badge>;
 * }
 * ```
 *
 * @see {@link fetchMerchants} - Server action that performs the API call
 * @see {@link useMerchantsStore} - Zustand store for merchant caching
 * @see {@link useMerchant} - Hook for fetching a single merchant
 */
export function useMerchants(_void?: HookInputType): HookOutputType {
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const possiblyStaleMerchants = useMerchantsStore((state) => state.merchants);
  const setPossiblyStaleMerchants = useMerchantsStore((state) => state.setMerchants);

  useEffect(() => {
    const fetchMerchantsForUser = async () => {
      setIsLoading(true);

      try {
        const merchants = await fetchMerchants();
        setPossiblyStaleMerchants(merchants);
      } catch (error: unknown) {
        console.error(">>> Error fetching merchants in useMerchants hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMerchantsForUser();

    // eslint-disable-next-line react-hooks/exhaustive-deps -- setPossiblyStaleMerchants is a stable function.
  }, []);

  return {merchant: possiblyStaleMerchants, isLoading, isError} as const;
}
