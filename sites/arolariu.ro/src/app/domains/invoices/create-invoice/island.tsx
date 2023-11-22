/** @format */

"use client";

import AnalyzeInvoiceProcess from "@/components/domains/invoices/create-invoice/AnalyzeInvoiceProcess";
import UploadInvoicePhoto from "@/components/domains/invoices/create-invoice/UploadInvoicePhoto";
import {useState} from "react";


export function RenderInvoiceScreen() {
	const [currentStep, setCurrentStep] = useState<number>(1);
	const [invoiceIdentifier, setInvoiceIdentifier] = useState<string>(null!);

	const unstyledStep = " border-b-2 border-gray-200 "; // enclosed in whitespace for CSS guards
	const styledStep = " border-b-2 border-indigo-500 bg-gray-100 text-indigo-500 ";
	const isActiveStyle = (step: number) => (step == currentStep ? styledStep : unstyledStep);

	return (
		<div className="container flex flex-col flex-wrap px-5 py-24 mx-auto">
			<div className="flex flex-wrap mx-auto mb-20">
				<a
					className={`inline-flex w-1/2 items-center rounded-t py-3 font-medium tracking-wider sm:w-auto sm:justify-start sm:px-6
                    ${isActiveStyle(1)}`}>
					<svg
						fill="none"
						stroke="currentColor"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						className="w-5 h-5 mr-3"
						viewBox="0 0 24 24">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
					</svg>
					STEP 1
				</a>
				<a
					className={`inline-flex w-1/2 items-center rounded-t py-3 font-medium tracking-wider sm:w-auto sm:justify-start sm:px-6
                    ${isActiveStyle(2)}`}>
					<svg
						fill="none"
						stroke="currentColor"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						className="w-5 h-5 mr-3"
						viewBox="0 0 24 24">
						<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
					</svg>
					STEP 2
				</a>
			</div>
			{1 === currentStep && (
				<UploadInvoicePhoto
					setCurrentStep={setCurrentStep}
					setInvoiceIdentifier={setInvoiceIdentifier}
				/>
			)}
			{2 === currentStep && (
				<AnalyzeInvoiceProcess
					setCurrentStep={setCurrentStep}
					invoiceIdentifier={invoiceIdentifier}
				/>
			)}
		</div>
	);
}
