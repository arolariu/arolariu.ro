/** @format */

import {Metadata} from "next";
import RenderViewInvoicesPage from "./island";
import fetchInvoices from "@/lib/invoices/fetchInvoices";
import fetchUser from "@/lib/fetchUser";

export const metadata: Metadata = {
	title: "Invoice Management System - List Invoices",
	description: "List all invoices from the invoice management system.",
};

export default async function ViewInvoicesPage() {
	const {user} = await fetchUser();
	const invoices = await fetchInvoices(user);

	return (
		<main className="dark:text-gray-300">
			<div className="container px-5 py-24 mx-auto">
				<div className="flex flex-col w-full mb-20 text-center">
					<h1 className="mb-4 text-2xl font-medium text-transparent bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text sm:text-3xl">
						Welcome, <span>{user?.username || "dear guest"}</span>!
					</h1>
					<p className="mx-auto text-base leading-relaxed lg:w-2/3">
						This is your digital receipts inventory. <br /> Here you can find the receipts that you&apos;ve uploaded so
						far. <br />
						By clicking on a receipt, you will be redirected to that specific receipt&apos;s page.
					</p>
				</div>
				<RenderViewInvoicesPage invoices={invoices!} />
			</div>
		</main>
	);
}
