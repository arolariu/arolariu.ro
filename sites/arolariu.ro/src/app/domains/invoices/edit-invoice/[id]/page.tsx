/** @format */

import RenderForbiddenScreen from "@/components/domains/RenderForbiddenScreen";
import {Metadata} from "next";
import RenderEditInvoicePage from "./island";
import fetchUser from "@/lib/fetchUser";
import fetchInvoice from "@/lib/invoices/fetchInvoice";

interface Props {
	params: {id: string};
}

export const metadata: Metadata = {
	title: "Invoice Management System - Edit Invoice",
	description: "Edit an invoice from the invoice management system.",
};

export default async function EditInvoicePage({ params }: Readonly<Props>) {
	const { user, isAuthenticated } = await fetchUser();
	const invoice = await fetchInvoice(params.id, user);

	if (!isAuthenticated) { return <RenderForbiddenScreen />; }
	if (!invoice) { return <RenderForbiddenScreen />; }
	
	return (
		<main>
			<RenderEditInvoicePage invoice={invoice}/>
		</main>
	);
}
