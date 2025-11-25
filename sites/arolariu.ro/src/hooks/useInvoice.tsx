"use client";

import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
import type {Invoice} from "@/types/invoices";
import {useEffect, useState} from "react";

type HookInputType = Readonly<{
  invoiceIdentifier: string;
}>;

type HookOutputType = Readonly<{
  invoice: Invoice | null;
  isLoading: boolean;
  isError: boolean;
}>;

/**
 * This hook fetches the invoice information.
 * @returns The invoice information and loading state.
 */
export function useInvoice({invoiceIdentifier}: HookInputType): HookOutputType {
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const fetchInvoiceForUser = async () => {
      setIsLoading(true);

      try {
        const invoice = await fetchInvoice({invoiceId: invoiceIdentifier});
        setInvoice(invoice);
      } catch (error: unknown) {
        console.error(">>> Error fetching invoice in useInvoice hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceForUser();
  }, [invoiceIdentifier]);

  return {invoice, isLoading, isError} as const;
}
