/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

import {invoiceFetcher} from "@/lib/fetchers";
import {loggerForSWR} from "@/lib/middlewares";
import Invoice from "@/types/Invoice";
import {User} from "next-auth";
import useSWR from "swr";
import {useStore} from "./stateStore";

export default function useFetchInvoiceForUser(user: User, id: string) {
	const [invoices, setInvoices] = useStore((state) => [state.invoices, state.setInvoices]);
	const [invoice, setInvoice] = useStore((state) => [state.selectedInvoice, state.setSelectedInvoice]);
	const {data, error, isLoading, isValidating} = useSWR([id, "token"], ([id, token]) => invoiceFetcher([id, token]), {
		revalidateOnReconnect: true,
		revalidateOnFocus: true,
		shouldRetryOnError: true,
		errorRetryInterval: 5000,
		dedupingInterval: 5000,
		errorRetryCount: 3,
		use: [loggerForSWR],
	});

	// Check if we are dealing with an invoice object:
	if (data && (data as Invoice)) {
		if (JSON.stringify(invoice) !== JSON.stringify(data)) {
			setInvoice(data as Invoice);
		}
	}

	// Check if we are dealing with an invoice array:
	if (data && (data as Invoice[])) {
		if (JSON.stringify(invoices) !== JSON.stringify(data)) {
			setInvoices(data as Invoice[]);
		}
	}

	return {invoice, invoices, error, isLoading, isValidating};
}
