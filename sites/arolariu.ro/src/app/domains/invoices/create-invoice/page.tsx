/** @format */

import fetchUser from "@/lib/fetchUser";
import {Metadata} from "next";
import RenderInvoiceScreen from "./island";

export const metadata: Metadata = {
	title: "Invoice Management System - Create Invoice",
	description:
		"The invoice management system provides users with detailed insights into their spending habits, according to their uploaded receipts.",
};

export default async function CreateInvoicePage() {
	const {isAuthenticated} = await fetchUser();

	return (
		<main>
			<RenderInvoiceScreen />
			{!isAuthenticated && (
				<div className="flex flex-col mx-auto mb-32">
					<p className="mb-4 text-center 2xsm:text-md md:text-2xl 2xsm:p-8">In order to save your invoice, please create an account or sign in.</p>
				</div>
			)}
		</main>
	);
}
