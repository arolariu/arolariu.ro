"use client";

import Link from "next/link";

interface Props {
	invoiceIdentifier: string;
	// eslint-disable-next-line no-unused-vars
	setCurrentStep: (step: number) => void;
}

export default function AnalyzeInvoiceProcess({invoiceIdentifier, setCurrentStep}: Props) {
	return (
		<section className="flex flex-col items-center mx-auto">
			<div className="w-full px-4 mb-6 sm:p-4">
				<h1 className="mb-2 text-3xl font-medium text-center text-transparent bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text">
					Invoice was sent for analysis! 🪄
				</h1>
				<p className="leading-relaxed text-center">
					Head over to the generated invoice page to view the full details of the analysis. <br />
					Please bear in mind that the analysis may take up to 3 minutes to complete.
				</p>
				<br />
				<p className="leading-relaxed text-center">
					Thank you for using our service! 🎊🎊
					<br />
					<small>
						Identifier: <em>{invoiceIdentifier}</em>
					</small>
				</p>
			</div>
			<div className="flex flex-row items-center justify-center w-full p-4 sm:w-1/2 lg:w-1/4">
				<Link href={`./view-invoice/${invoiceIdentifier}`} className="mr-4 btn btn-primary">
					View analysis
				</Link>
				<Link href="./create-invoice" className="ml-4 btn btn-secondary" onClick={() => setCurrentStep(1)}>
					Upload another invoice
				</Link>
			</div>
		</section>
	);
}
