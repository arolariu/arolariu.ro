/** @format */

import {Metadata} from "next";
import {RenderInvoiceScreen} from "./island";

export const metadata: Metadata = {
	title: "Invoice Management System - Create Invoice",
	description:
		"The invoice management system provides users with detailed insights into their spending habits, according to their uploaded receipts.",
};

export default async function CreateInvoicePage() {
	return (
		<section className="dark:text-gray-300">
			<RenderInvoiceScreen/>
		</section>
	);
}
