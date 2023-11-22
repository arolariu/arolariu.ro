import Invoice from "@/types/invoices/Invoice";
import { API_URL } from "../constants";
import fetchUser from "../fetchUser";
import generateGuestJwt from "../generateGuestJwt";

export default async function fetchInvoice(id:string) : Promise<Invoice | null>{
    const {user, isAuthenticated} = await fetchUser();
    const userIdentifier = isAuthenticated ? user?.id : "00000000-0000-0000-0000-000000000000";
    const userAuthorization = isAuthenticated ? user?.id : await generateGuestJwt(); // TODO: check JWT.

    const response = await fetch(`${API_URL}/users/${userIdentifier}/invoices/${id}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userAuthorization}`,
        }
    });

    if (response.status === 200) {return await response.json();}
    else {return null;} // TODO: perform 403, 401, 500, etc. handling
}
