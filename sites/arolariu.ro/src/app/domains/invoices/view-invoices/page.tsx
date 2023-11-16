/** @format */

import {Metadata} from "next";
import RenderForbiddenScreen from "../../../../components/domains/RenderForbiddenScreen";
import RenderViewInvoicesPage from "./island";
import fetchInvoices from "@/lib/invoices/fetchInvoices";
import fetchUser from "@/lib/fetchUser";

export const metadata: Metadata = {
	title: "Invoice Management System - List Invoices",
	description: "List all invoices from the invoice management system.",
};

export default async function ViewInvoicesPage() {
	const {isAuthenticated} = await fetchUser();
	const invoices = await fetchInvoices();

	if (!isAuthenticated) { return <RenderForbiddenScreen />; }

	return (
		<main className="dark:text-gray-300">
			{isAuthenticated && <RenderViewInvoicesPage invoices={invoices!} />}
		</main>
	);
}
