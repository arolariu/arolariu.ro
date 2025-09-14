"use client";

import fetchMerchants from "@/lib/actions/invoices/fetchMerchants";
import type {Merchant} from "@/types/invoices";
import {useEffect, useState} from "react";
import {useUserInformation} from "./index";
import {useZustandStore} from "./stateStore";

type HookOutputType = Readonly<{
  merchant: Merchant[];
  isLoading: boolean;
  isError: boolean;
}>;

/**
 * This hook fetches all merchants information.
 * @returns The merchants and loading state.
 */
export function useMerchants(): HookOutputType {
  const {userInformation} = useUserInformation();
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const possiblyStaleMerchants = useZustandStore((state) => state.merchants);
  const setPossiblyStaleMerchants = useZustandStore((state) => state.setMerchants);

  useEffect(() => {
    const fetchMerchantsForUser = async () => {
      setIsLoading(true);

      try {
        const authToken = userInformation.userJwt;
        const merchant = await fetchMerchants(authToken);
        setPossiblyStaleMerchants(merchant);
      } catch (error: unknown) {
        console.error(">>> Error fetching merchants in useMerchants hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMerchantsForUser();

    // eslint-disable-next-line react-hooks/exhaustive-deps -- setPossiblyStaleMerchants is a stable function.
  }, [userInformation]);

  return {merchant: possiblyStaleMerchants, isLoading, isError} as const;
}
