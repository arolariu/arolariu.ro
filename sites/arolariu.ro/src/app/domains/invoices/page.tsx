/** @format */

import RenderInvoiceBotComponent from "@/components/domains/invoices/RenderInvoiceBotComponent";
import RenderInvoiceTopComponent from "@/components/domains/invoices/RenderInvoiceTopComponent";
import {Metadata} from "next";

export const metadata: Metadata = {
	title: "Invoice Management System",
	description:
		"The invoice management system provides users with detailed insights into their spending habits, according to their uploaded receipts.",
};

export default async function InvoicePage() {
	return (
		<main>
			<RenderInvoiceTopComponent />
			<RenderInvoiceBotComponent />
		</main>
	);
}
