import Invoice from "@/types/Invoice";
import {User} from "next-auth";

export default async function fetchInvoicesForUser(user: User): Promise<Invoice[]> {
	let invoices: Invoice[] = [];
	console.log(user);

	const options = {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	};
	const response = await fetch("https://api.arolariu.ro/rest/invoices", options);

	if (response.ok) {
		const data = await response.json();
		invoices = data;
	} else {
		console.error("Error fetching invoices: " + response.statusText);
	}

	return invoices;
}
