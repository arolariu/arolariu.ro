/** @format */

import {Metadata} from "next";

interface Props {
	params: {id: string};
}

export const metadata: Metadata = {
	title: "Invoice Management System - Edit Invoice",
	description: "Edit an invoice from the invoice management system.",
};

export default async function EditInvoicePage({params}: Props) {
	return (
		/* TODO: complete this component. */
		<div>
			<h1>HELLO WORLD!!!!</h1>
			<h1>ID: {params.id}</h1>
		</div>
	);
}
