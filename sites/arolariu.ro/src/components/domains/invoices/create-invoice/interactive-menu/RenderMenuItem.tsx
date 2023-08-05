/** @format */

"use client";

export default function RenderInvoiceMenuItem({children, actualStep, currentStep}) {
	return (
		<a
			className={`${
				actualStep == currentStep
					? "border-b-2 border-indigo-500 bg-gray-100 text-indigo-500"
					: "border-b-2 border-gray-200"
			} title-font inline-flex w-1/2 items-center justify-center rounded-t py-3 font-medium  leading-none tracking-wider sm:w-auto sm:justify-start sm:px-6`}>
			<svg
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				className="mr-3 h-5 w-5"
				viewBox="0 0 24 24">
				{children}
			</svg>
			STEP {actualStep}
		</a>
	);
}
