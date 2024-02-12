import Invoice from "@/types/invoices/Invoice";
import generateJWT from "../generateJWT";
import { API_URL } from "../../constants";
import { User } from "@clerk/backend";

export default async function fetchInvoices(user : User | null) : Promise<Invoice[] | null> {
    const userAuthorization = await generateJWT(user);

    const response = await fetch(`${API_URL}/rest/invoices/`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userAuthorization}`,
        }
    });

    if (response.status === 200) {return await response.json();}
    else {return null;} // TODO: perform 403, 401, 500, etc. handling
}
