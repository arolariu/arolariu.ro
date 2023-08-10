/** @format */

import RenderForbiddenScreen from "@/app/domains/RenderForbiddenScreen";
import {Metadata} from "next";
import {getServerSession} from "next-auth";
import {authOptions} from "../../../../lib/authOptions";
import {RenderInvoiceScreen} from "./island";

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
			{isLoggedIn ? <RenderInvoiceScreen /> : <RenderForbiddenScreen />}
		</section>
	);
}
