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
		<section className="dark:text-gray-300">
			<RenderInvoiceScreen/>
			{!isAuthenticated && <p>In order to save your invoice, please create an account.</p>}
		</section>
	);
}
