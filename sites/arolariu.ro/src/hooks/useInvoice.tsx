/** @format */

import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
import type Invoice from "@/types/invoices/Invoice";
import {useEffect, useState} from "react";
import useUserInformation from "./useUserInformation";

/**
 * This hook fetches the invoice information.
 * @returns The invoice information and loading state.
 */
export default function useInvoice({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  const {userInformation} = useUserInformation();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchInvoiceInformation = async () => {
      if (userInformation === null) return console.info("User information is not available.");
      const invoiceInformation = await fetchInvoice(invoiceIdentifier, userInformation);
      setInvoice(invoiceInformation);
      setIsLoading(false);
    };

    fetchInvoiceInformation().catch((error: unknown) => console.error("useInvoice", error));
  }, [userInformation]);

  return {invoice, isLoading};
}
