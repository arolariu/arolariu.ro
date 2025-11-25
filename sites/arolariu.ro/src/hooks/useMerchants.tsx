"use client";

import fetchMerchants from "@/lib/actions/invoices/fetchMerchants";
import {useMerchantsStore} from "@/stores";
import type {Merchant} from "@/types/invoices";
import {useEffect, useState} from "react";

type HookInputType = Readonly<{}>;
type HookOutputType = Readonly<{
  merchant: Merchant[];
  isLoading: boolean;
  isError: boolean;
}>;

/**
 * This hook fetches all merchants information.
 * @returns The merchants and loading state.
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
