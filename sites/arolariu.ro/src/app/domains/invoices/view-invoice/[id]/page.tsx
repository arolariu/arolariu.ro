/** @format */

import fetchInvoice from "@/lib/invoices/fetchInvoice";
import {Metadata} from "next";
import {RenderViewInvoicePage} from "./island";
import Image from "next/image";
import fetchUser from "@/lib/fetchUser";

interface Props { params: {id: string}; }

export const metadata: Metadata = {
	title: "View Invoice",
	description: "View your uploaded invoice on `arolariu.ro`.",
};

export default async function ViewInvoicePage({ params }: Readonly<Props>) {
	const { user } = await fetchUser();
	const invoice = await fetchInvoice(params.id, user);
	
	if (!invoice) { return <Image src="/images/domains/invoices/403.svg" alt="Forbidden SVG" width="500" height="500"/> }
	return (
		<section className="overflow-hidden dark:text-gray-300">
			<RenderViewInvoicePage invoice={invoice} />
		</section>
	);
}
