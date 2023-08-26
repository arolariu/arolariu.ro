/** @format */

import {authOptions} from "@/lib/authOptions";
import {Metadata} from "next";
import {getServerSession} from "next-auth";
import RenderForbiddenScreen from "../../RenderForbiddenScreen";
import RenderViewInvoicesPage from "./island";

export const metadata: Metadata = {
	title: "Invoice Management System - List Invoices",
	description: "List all invoices from the invoice management system.",
};

export default async function ViewInvoicesPage() {
	const session = await getServerSession(authOptions);

	return (
		<main className="dark:text-gray-300">
			{session ? <RenderViewInvoicesPage session={session} /> : <RenderForbiddenScreen />}
		</main>
	);
}
