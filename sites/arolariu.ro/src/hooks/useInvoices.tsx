/** @format */

"use client";

import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";
import type {Invoice} from "@/types/invoices";
import {useEffect, useState} from "react";
import {useUserInformation} from "./index";

type HookReturnType = Readonly<{
  invoices: Invoice[] | null;
  isLoading: boolean;
  isError: boolean;
}>;

/**
 * This hook fetches the invoices for the user.
 * @returns The invoices and loading state.
 */
export function useInvoices(): HookReturnType {
  const {userInformation} = useUserInformation(); // fetch fresh userInformation
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    const fetchInvoicesForUser = async () => {
      setIsLoading(true);
      if (userInformation === null) {
        return console.info(">>> User information is not available, skipping invoices fetch.");
      }

      try {
        // this will invoke the fetchInvoices action from the server.
        const invoices = await fetchInvoices(userInformation);
        setInvoices(invoices);
      } catch (error: unknown) {
        console.error(">>> Error fetching invoices in useInvoices hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoicesForUser();
  }, [userInformation]);

  return {invoices, isLoading, isError} as const;
}
