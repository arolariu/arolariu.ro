/** @format */

import RenderForbiddenScreen from "@/app/domains/RenderForbiddenScreen";
import {authOptions} from "@/lib/authOptions";
import {Metadata} from "next";
import {getServerSession} from "next-auth";
import RenderEditInvoicePage from "./island";

interface Props {
	params: {id: string};
}

export const metadata: Metadata = {
	title: "Invoice Management System - Edit Invoice",
	description: "Edit an invoice from the invoice management system.",
};

export default async function EditInvoicePage({params}: Props) {
	const session = await getServerSession(authOptions);
	return (
		<main>
			{session ? (
				<RenderEditInvoicePage session={session} id={params.id} />
			) : (
				<RenderForbiddenScreen />
			)}
		</main>
	);
}
