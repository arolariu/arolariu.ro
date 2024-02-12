/** @format */

import fetchUser from "@/lib/fetchUser";
import {Metadata} from "next";
import Link from "next/link";
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
					<p className="mb-4 text-2xl text-center">In order to save your invoice, please create an account or sign in.</p>
					<div className="flex flex-row gap-4 mx-auto">
					<Link href="/auth">
						<button className="mx-auto btn btn-secondary" type="button">
							Create an account
						</button>
					</Link>
					<Link href="/auth">
						<button className="mx-auto btn btn-primary" type="button">
							Sign in
						</button>
						</Link>
						</div>
				</div>
			)}
		</main>
	);
}
