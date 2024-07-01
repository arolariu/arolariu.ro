/** @format */

import {useEffect, useState} from "react";
import useUserInformation from "./useUserInformation";
import Invoice from "@/types/invoices/Invoice";
import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";

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

    fetchInvoiceInformation();
  }, [userInformation]);

  return {invoice, isLoading};
}
