import Invoice from "@/types/Invoice";
import {DefaultSession} from "next-auth";
import {useEffect, useState} from "react";

export default function useFetchInvoicesForUser(user: DefaultSession): Invoice[] {
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	console.log("Got the following user:" + JSON.stringify(user));

	useEffect(() => {
		const fetchInvoices = async () => {
			const options = {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			};
			const response = await fetch("https://api.arolariu.ro/rest/invoices", options);

			if (response.ok) {
				const invoices = await response.json();
				setInvoices(invoices);
			} else {
				console.log("Error fetching invoices: " + response.statusText);
			}
		};
		fetchInvoices();
	}, []);

	return invoices;
}
