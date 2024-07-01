/** @format */

import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";
import Invoice from "@/types/invoices/Invoice";
import {useEffect, useState} from "react";
import useUserInformation from "./useUserInformation";

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

    fetchInvoicesForUser();
  }, [userInformation]);

  return {invoices, isLoading};
}
