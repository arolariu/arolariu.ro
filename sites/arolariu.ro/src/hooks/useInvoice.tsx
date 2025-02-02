/** @format */

"use client";

import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
import type {UserInformation} from "@/types";
import type {Invoice} from "@/types/invoices";
import {useCallback, useEffect, useState} from "react";
import {useUserInformation} from "./index";

type HookReturnType = Readonly<{
  invoice: Invoice | null;
  isLoading: boolean;
  isError: boolean;
}>;

/**
 * This hook fetches the invoice information.
 * @returns The invoice information and loading state.
 */
export function useInvoice({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>): HookReturnType {
  const {userInformation} = useUserInformation();
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const fetchInvoiceForUser = useCallback(
    async (userInformation: UserInformation) => {
      setIsLoading(true);

      try {
        const invoice = await fetchInvoice(invoiceIdentifier, userInformation);
        setInvoice(invoice);
      } catch (error: unknown) {
        console.error(">>> Error fetching invoices in useInvoice hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [invoiceIdentifier, userInformation],
  );

  useEffect(() => {
    if (userInformation) {
      fetchInvoiceForUser(userInformation);
    }
  }, [userInformation, invoiceIdentifier]);

  return {invoice, isLoading, isError} as const;
}
