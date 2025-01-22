/** @format */

"use client";

import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
import type Invoice from "@/types/invoices/Invoice";
import {useEffect, useState} from "react";
import useUserInformation from "./useUserInformation";

type HookReturnType = Readonly<{
  invoice: Invoice | null;
  isLoading: boolean;
  isError: boolean;
}>;

/**
 * This hook fetches the invoice information.
 * @returns The invoice information and loading state.
 */
export default function useInvoice({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>): HookReturnType {
  const {userInformation} = useUserInformation(); // fetch fresh userInformation
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    const fetchInvoiceInformation = async () => {
      setIsLoading(true);
      if (userInformation === null) {
        return console.info(">>> User information is not available, skipping invoice fetch.");
      }

      try {
        // this will invoke the fetchInvoice action from the server.
        const invoiceInformation = await fetchInvoice(invoiceIdentifier, userInformation);
        setInvoice(invoiceInformation);
      } catch (error: unknown) {
        console.error(">>> Error fetching invoices in useInvoice hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceInformation();
  }, [userInformation, invoiceIdentifier]);

  return {invoice, isLoading, isError} as const;
}
