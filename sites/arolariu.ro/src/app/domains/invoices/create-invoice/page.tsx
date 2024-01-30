/** @format */

import {Metadata} from "next";
import {RenderInvoiceScreen} from "./island";
import fetchUser from "@/lib/fetchUser";

export const metadata: Metadata = {
	title: "Invoice Management System - Create Invoice",
	description:
		"The invoice management system provides users with detailed insights into their spending habits, according to their uploaded receipts.",
};

export default async function CreateInvoicePage() {
	const {isAuthenticated} = await fetchUser();

	return (
		<main>
			<RenderInvoiceScreen/>
			{!isAuthenticated && <p className="mb-32 text-2xl text-center">In order to save your invoice, please create an account.</p>}
		</main>
	);
}
