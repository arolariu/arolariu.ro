import Invoice from "@/types/Invoice";
import {User} from "next-auth";
import {useEffect, useState} from "react";

// eslint-disable-next-line no-unused-vars
export default function useFetchInvoiceWithIdForUser(id: string, user: User) {
	const [invoice, setInvoice] = useState<Invoice>(null!);

	useEffect(() => {
		const fetchSpecificInvoice = async () => {
			const options = {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			};
			const response = await fetch(`https://api.arolariu.ro/rest/invoices/${id}`, options);

			if (response.status == 200) {
				const invoice = await response.json();
				setInvoice(invoice);
			} else {
				console.error("Error fetching invoice: " + response.statusText);
				console.log("Couldn't get invoice information for invoice: " + id);
			}
		};

		fetchSpecificInvoice();
	}, [id]);

	return invoice;
}
