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

export default async function EditInvoicePage({params}: Props) {
	const invoice = await fetchInvoice(params.id);
	const {isAuthenticated} = await fetchUser();

	return (
		<main>
			{isAuthenticated && <RenderEditInvoicePage invoice={invoice}/>}
			{!isAuthenticated && <RenderForbiddenScreen/>}
		</main>
	);
}
