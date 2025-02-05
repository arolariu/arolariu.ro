/** @format */

"use client";

import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";
import type {UserInformation} from "@/types";
import type {Invoice} from "@/types/invoices";
import {useCallback, useEffect, useState} from "react";
import {useUserInformation} from "./index";
import {useZustandStore} from "./stateStore";

type HookOutputType = Readonly<{
  invoices: Invoice[];
  isLoading: boolean;
  isError: boolean;
}>;

/**
 * This hook fetches the invoices for the user.
 * @returns The invoices and loading state.
 */
export function useInvoices(): HookOutputType {
  const {userInformation} = useUserInformation();
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const possiblyStaleInvoices = useZustandStore((state) => state.invoices);
  const setPossiblyStaleInvoices = useZustandStore((state) => state.setInvoices);

  const fetchInvoicesForUser = useCallback(
    async (userInformation: UserInformation) => {
      setIsLoading(true);

      try {
        const invoices = await fetchInvoices(userInformation);
        setPossiblyStaleInvoices(invoices);
      } catch (error: unknown) {
        console.error(">>> Error fetching invoices in useInvoices hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [userInformation],
  );

  useEffect(() => {
    if (userInformation) {
      fetchInvoicesForUser(userInformation);
    }
  }, [userInformation]);

  return {invoices: possiblyStaleInvoices, isLoading, isError} as const;
}
