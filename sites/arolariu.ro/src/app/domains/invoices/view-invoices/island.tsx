"use client";

import {ViewInvoiceCard} from "@/components/domains/invoices/view-invoices/ViewInvoiceCard";
import useFetchInvoiceForUser from "@/hooks/useFetchInvoiceForUser";
import {Session} from "next-auth";
import Link from "next/link";

interface Props {
	session: Session;
}

export default function RenderViewInvoicesPage({session}: Props) {
	const {invoices, isLoading} = useFetchInvoiceForUser(session as any, "test");

	if (invoices.length > 0 && !isLoading) {
		const calculateInvoiceTotalCost = (): number => {
			let totalCost = 0;
			invoices.forEach((invoice) => {
				totalCost += invoice?.totalAmount;
			});
			return totalCost;
		};

		const calculateInvoiceTotalSavings = (): number => {
			let totalSavings = 0;
			invoices.forEach((invoice) => {
				invoice.items.forEach((item) => {
					if (item?.price < 0) totalSavings += item?.price;
				});
			});
			return -totalSavings;
		};

		const calculateNumberOfProductsBought = (): number => {
			let totalProducts = 0;
			invoices.forEach((invoice) => {
				invoice.items.forEach((item) => {
					if (item.totalPrice > 0) totalProducts += item.quantity;
				});
			});
			return totalProducts;
		};
		return (
			<div className="container px-5 py-24 mx-auto">
				<div className="flex flex-col w-full mb-20 text-center">
					<h1 className="mb-4 text-2xl font-medium text-transparent bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text sm:text-3xl">
						Welcome, <span>{session.user?.name}</span> !
					</h1>
					<p className="mx-auto text-base leading-relaxed lg:w-2/3">
						This is your digital receipts inventory. <br /> Here you can find the receipts that you&apos;ve uploaded so
						far. <br />
						By clicking on a receipt, you will be redirected to that specific receipt&apos;s page.
					</p>
				</div>
				<section className="dark:text-white">
					<div className="container px-5 pb-6 mx-auto">
						<div className="flex flex-wrap -m-4 text-center">
							<div className="w-1/2 p-4 sm:w-1/4">
								<h2 className="text-3xl font-medium title-font sm:text-4xl">{invoices.length}</h2>
								<p className="leading-relaxed">Invoices</p>
							</div>
							<div className="w-1/2 p-4 sm:w-1/4">
								<h2 className="text-3xl font-medium text-red-400 title-font sm:text-4xl">
									{calculateInvoiceTotalCost()} SEK
								</h2>
								<p className="leading-relaxed">Total Cost</p>
							</div>
							<div className="w-1/2 p-4 sm:w-1/4">
								<h2 className="text-3xl font-medium text-green-400 title-font sm:text-4xl">
									{calculateInvoiceTotalSavings()} SEK
								</h2>
								<p className="leading-relaxed">Total Savings</p>
							</div>
							<div className="w-1/2 p-4 sm:w-1/4">
								<h2 className="text-3xl font-medium title-font sm:text-4xl">{calculateNumberOfProductsBought()}</h2>
								<p className="leading-relaxed">Products bought</p>
							</div>
						</div>
					</div>
				</section>
				<div className="flex flex-wrap -m-4">
					{invoices.map((invoice) => {
						return <ViewInvoiceCard key={invoice.id} invoice={invoice} />;
					})}
				</div>
			</div>
		);
	} else if (!isLoading) {
		return (
			<div className="container px-5 py-24 mx-auto">
				<div className="flex flex-col w-full mb-20 text-center">
					<h1 className="mb-4 text-2xl font-medium text-transparent bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text sm:text-3xl">
						Welcome, <span>{session.user?.name}</span> !
					</h1>
					<p className="mx-auto text-base leading-relaxed lg:w-2/3">
						This is your digital receipts inventory. <br /> Here you can find the receipts that you&apos;ve uploaded so
						far. <br />
						By clicking on a receipt, you will be redirected to that specific receipt&apos;s page.
					</p>
				</div>
				<div className="flex flex-col w-full mb-20 text-center">
					<h1 className="mb-4 text-2xl font-medium sm:text-3xl">Something is missing here... 😰</h1>
					<p className="mx-auto text-base leading-relaxed lg:w-2/3">
						It seems that you do not have any invoices associated with your account... <br />
						Please upload some invoices and come back later. <br /> <br />
					</p>
					<Link
						href="./create-invoice"
						className="inline-flex px-6 py-2 mx-auto mt-8 text-lg text-white bg-indigo-500 border-0 rounded hover:bg-indigo-600 focus:outline-none">
						Upload an invoice here.
					</Link>
				</div>
			</div>
		);
	}
}