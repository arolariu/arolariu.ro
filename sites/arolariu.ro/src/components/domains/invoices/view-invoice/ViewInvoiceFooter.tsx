"use client";

import {useZustandStore} from "@/hooks/stateStore";
import Link from "next/link";
import {useState} from "react";

export default function ViewInvoiceFooter() {
	const invoice = useZustandStore((state) => state.selectedInvoice);
	const paymentInformation = invoice.paymentInformation;
	const [isImportant, setIsImportant] = useState<boolean>(false);
	// TODO: set the isImportant value to the invoice too.

	return (
		<div className="flex">
			<span className="text-2xl font-medium title-font dark:text-gray-300">
				Total Cost: {paymentInformation.totalAmount}
				{paymentInformation.currency.symbol}
			</span>
			<Link
				href={`../edit-invoice/${invoice.id}`}
				className="flex px-6 py-2 ml-auto text-white bg-indigo-500 border-0 rounded hover:bg-indigo-600 focus:outline-none">
				Edit this invoice
			</Link>
			<button
				className="inline-flex items-center justify-center w-10 h-10 p-0 ml-4 text-gray-500 bg-gray-200 border-0 rounded-full"
				onClick={() => setIsImportant(!isImportant)}
				title="Bookmark (mark as important) the invoice">
				<svg
					fill="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					className={`${isImportant ? "text-red-600" : ""}  h-5 w-5`}
					viewBox="0 0 24 24">
					<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path>
				</svg>
			</button>
		</div>
	);
}
