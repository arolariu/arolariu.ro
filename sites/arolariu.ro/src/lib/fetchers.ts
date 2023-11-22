/* eslint-disable no-undef */

import Invoice from "@/types/Invoice";
import {Fetcher} from "swr";

export const invoiceFetcher: Fetcher<Invoice | Invoice[], [string, string]> = async ([id, token]) => {
	if (token) {
		let endpoint = `https://api.arolariu.ro/rest/invoices/`;
		if (id) endpoint = endpoint.concat(id);

		const options: RequestInit = {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		};

		const response: Response = await fetch(endpoint, options);
		if (response.ok) {
			return response.json();
		} else {
			const error = new Error("An error occurred while fetching the data.");
			error.message = await response.json();
			error.stack = response.statusText;
			error.name = response.status.toString();
			throw error;
		}
	} else {
		throw new Error("No auth token provided.");
	}
};
