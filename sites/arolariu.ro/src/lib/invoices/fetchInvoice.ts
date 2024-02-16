import Invoice from "@/types/invoices/Invoice";
import {User} from "@clerk/backend";
import {API_URL} from "../../constants";
import generateJWT from "../generateJWT";

export default async function fetchInvoice(id: string, user: User | null): Promise<Invoice | null> {
	const authorizationHeader = await generateJWT(user);
	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${authorizationHeader}`,
	};

	// To understand if the invoice was shared with the user, we will hit the API on both the user's behalf and the guest's behalf.
	// If the invoice is found on the user's behalf, we will return it. Otherwise, we will check if we get a good response from the guest.
	// If neither of the requests return a success, we will return null.

	const userResponse = await fetch(`${API_URL}/rest/user/${user?.id}/invoices/${id}`, {
		method: "GET",
		headers: headers,
    });
    if (userResponse.status === 200) { return await userResponse.json(); }


	const guestResponse = await fetch(`${API_URL}/rest/invoices/${id}`, {
		method: "GET",
		headers: headers,
	});
    if (guestResponse.status === 200) { return await guestResponse.json(); }


    else { return null; } // TODO: perform 403, 401, 500, etc. handling
}
