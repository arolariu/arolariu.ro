/** @format */

"use client";

import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
import type {UserInformation} from "@/types";
import type {Invoice} from "@/types/invoices";
import {useEffect, useState} from "react";
import {useUserInformation} from "./index";

type HookOutputType = Readonly<{
  invoice: Invoice | null;
  isLoading: boolean;
  isError: boolean;
}>;

/**
 * This hook fetches the invoice information.
 * @returns The invoice information and loading state.
 */
export function useInvoice(invoiceIdentifier: string): HookOutputType {
  const {userInformation} = useUserInformation();
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const fetchInvoiceForUser = async (userInformation: UserInformation, invoiceIdentifier: string) => {
      setIsLoading(true);

      try {
        const authToken = userInformation.userJwt;
        const invoice = await fetchInvoice(invoiceIdentifier, authToken);
        setInvoice(invoice);
      } catch (error: unknown) {
        console.error(">>> Error fetching invoice in useInvoice hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceForUser(userInformation, invoiceIdentifier);
  }, [userInformation, invoiceIdentifier]);

  return {invoice, isLoading, isError} as const;
}
