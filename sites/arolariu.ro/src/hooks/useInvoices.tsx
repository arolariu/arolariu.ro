/** @format */

import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";
import type Invoice from "@/types/invoices/Invoice";
import {useEffect, useState} from "react";
import useUserInformation from "./useUserInformation";

/**
 * This hook fetches the invoices for the user.
 * @returns The invoices and loading state.
 */
export default function useInvoices() {
  const {userInformation} = useUserInformation();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchInvoicesForUser = async () => {
      if (userInformation === null) return console.info("User information is not available.");
      const invoices = await fetchInvoices(userInformation);
      setInvoices(invoices);
      setIsLoading(false);
    };

    fetchInvoicesForUser().catch((error: unknown) => console.error("useInvoices", error));
  }, [userInformation]);

  return {invoices, isLoading};
}
