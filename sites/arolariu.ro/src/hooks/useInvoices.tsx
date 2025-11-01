"use client";

import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";
import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {useEffect, useState} from "react";
import {useUserInformation} from "./index";

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
  const possiblyStaleInvoices = useInvoicesStore((state) => state.invoices);
  const setPossiblyStaleInvoices = useInvoicesStore((state) => state.setInvoices);

  useEffect(() => {
    const fetchInvoicesForUser = async () => {
      setIsLoading(true);

      try {
        const authToken = userInformation.userJwt;
        const invoices = await fetchInvoices(authToken);
        setPossiblyStaleInvoices(invoices);
      } catch (error: unknown) {
        console.error(">>> Error fetching invoices in useInvoices hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (userInformation) {
      fetchInvoicesForUser();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps -- setPossiblyStaleInvoices is a stable function.
  }, [userInformation]);

  return {invoices: possiblyStaleInvoices, isLoading, isError} as const;
}
