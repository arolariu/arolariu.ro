/** @format */

import RenderForbiddenScreen from "@/app/domains/RenderForbiddenScreen";
import {RenderInvoiceMenu as RenderInvoiceScreen} from "@/components/domains/invoices/create-invoice/interactive-menu/RenderMenu";
import {Metadata} from "next";
import {getServerSession} from "next-auth";
import {authOptions} from "../../../../lib/authOptions";

export const metadata: Metadata = {
	title: "Invoice Management System - Create Invoice",
	description:
		"The invoice management system provides users with detailed insights into their spending habits, according to their uploaded receipts.",
};

export default async function CreateInvoicePage() {
	const session = await getServerSession(authOptions);
	const isLoggedIn = session?.user ?? session?.expires;

	return (
		<section className="dark:text-gray-300">
			<div className="container flex flex-col flex-wrap px-5 py-24 mx-auto">
				{isLoggedIn ? <RenderInvoiceScreen /> : <RenderForbiddenScreen />}
			</div>
		</section>
	);
}
