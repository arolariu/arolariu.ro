"use client";

import EditInvoiceItemCard from "@/components/domains/invoices/edit-invoice/EditInvoiceItemCard";
import EditInvoicePhotoPreview from "@/components/domains/invoices/edit-invoice/EditInvoicePhotoPreview";
import {EditInvoiceTable} from "@/components/domains/invoices/edit-invoice/EditInvoiceTable";
import useFetchInvoiceWithIdForUser from "@/hooks/useFetchInvoiceWithIdForUser";
import {Session, User} from "next-auth";

interface Props {
	session: Session;
	id: string;
}

export default function RenderEditInvoicePage({session, id}: Props) {
	const invoice = useFetchInvoiceWithIdForUser(id, session.user as User);

	// TODO: invoice item card pagination to avoid slow performance that can be seen after 10 items for e.g.;
	// TODO: filtering, searching, sorting, etc for the invoice items.

	if (invoice) {
		return (
			<section className="container p-2 mx-auto my-8 border-2 rounded-2xl">
				<div className="m-auto 2xsm:block lg:hidden">
					<EditInvoicePhotoPreview invoiceUri={invoice.imageUri} />
				</div>
				<div className="flex flex-row flex-nowrap">
					<div className="flex-initial mx-auto 2xsm:w-full lg:w-1/2">
						<EditInvoiceTable invoice={invoice} />
					</div>
					<div className="p-4 m-auto 2xsm:hidden lg:block">
						<EditInvoicePhotoPreview invoiceUri={invoice.imageUri} />
					</div>
				</div>
				<hr />
				<h2 className="mt-4 text-2xl font-extrabold tracking-widest text-transparent bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text indent-8">
					Item List: ({invoice.items.length} items)
				</h2>
				<div className="flex flex-row flex-wrap">
					{invoice.items.map((item, index) => (
						<div key={index} className="2xsm:w-full sm:w-1/2 lg:w-1/3 xl:w-1/4">
							<EditInvoiceItemCard item={item} />
						</div>
					))}
				</div>
			</section>
		);
	}
}
