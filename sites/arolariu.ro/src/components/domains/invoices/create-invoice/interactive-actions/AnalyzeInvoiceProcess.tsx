/** @format */

"use client";

import Link from "next/link";
import {useEffect, useState} from "react";

const InvoicePreview = ({invoice, setCurrentStep}) => {
	return (
		<section className="mx-auto flex flex-col items-center">
			<div className="mb-6 w-full px-4 sm:p-4">
				<h1 className="mb-2 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-center text-3xl font-medium text-transparent">
					Analysis was completed! 🪄
				</h1>
				<p className="text-center leading-relaxed">
					Head over to the generated invoice page to view the full details of the analysis.
				</p>
				<br />
				<p className="text-center leading-relaxed">
					Thank you for using our service! 🎊🎊
					<br />
					<small>
						Identifier: <em>{invoice.invoiceId}</em>
					</small>
				</p>
			</div>
			<div className="flex w-full flex-row items-center justify-center p-4 sm:w-1/2 lg:w-1/4">
				<Link href={`./view-invoice/${invoice.invoiceId}`} className="btn btn-primary mr-4">
					View analysis
				</Link>
				<Link
					href="./create-invoice"
					className="btn btn-secondary ml-4"
					onClick={() => setCurrentStep(1)}>
					Upload new invoice
				</Link>
			</div>
		</section>
	);
};

export default function AnalyzeInvoiceProcess({invoiceIdentifier, setCurrentStep}) {
	const [invoice, setInvoice] = useState(null);

	// TODO: this should be extracted into a custom hook to improve code readability
	useEffect(() => {
		const getInvoice = async () => {
			const response = await fetch(`https://api.arolariu.ro/api/invoices/${invoiceIdentifier}`);
			const invoice = await response.json();
			setInvoice(invoice);
		};
		getInvoice();
	}, [invoiceIdentifier]);

	return (
		<>{invoice !== null && <InvoicePreview invoice={invoice} setCurrentStep={setCurrentStep} />}</>
	);
}
