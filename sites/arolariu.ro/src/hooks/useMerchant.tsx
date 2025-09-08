/** @format */

"use client";

import fetchMerchant from "@/lib/actions/invoices/fetchMerchant";
import type {Merchant} from "@/types/invoices";
import {useEffect, useState} from "react";
import {useUserInformation} from "./index";

type HookInputType = Readonly<{
  merchantIdentifier: string;
}>;

type HookOutputType = Readonly<{
  merchant: Merchant | null;
  isLoading: boolean;
  isError: boolean;
}>;

/**
 * This hook fetches the merchant information.
 * @returns The merchant information and loading state.
 */
export function useMerchant({merchantIdentifier}: HookInputType): HookOutputType {
  const {userInformation} = useUserInformation();
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [merchant, setMerchant] = useState<Merchant | null>(null);

  useEffect(() => {
    const fetchMerchantForUser = async (merchantIdentifier: string) => {
      setIsLoading(true);

      try {
        const authToken = userInformation.userJwt;
        const merchant = await fetchMerchant(merchantIdentifier, authToken);
        setMerchant(merchant);
      } catch (error: unknown) {
        console.error(">>> Error fetching merchant in useMerchant hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMerchantForUser(merchantIdentifier);
  }, [userInformation, merchantIdentifier]);

  return {merchant, isLoading, isError} as const;
}
