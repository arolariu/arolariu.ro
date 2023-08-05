/** @format */

"use client";

import {useState} from "react";
import RenderInvoiceMenuItem from "./RenderMenuItem";
import RenderInvoiceMenuItemAction from "./RenderMenuItemAction";

const RenderInvoiceMenuStepsContainer = ({currentStep}) => {
	return (
		<div className="mx-auto mb-20 flex flex-wrap">
			<RenderInvoiceMenuItem actualStep={1} currentStep={currentStep}>
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
			</RenderInvoiceMenuItem>
			<RenderInvoiceMenuItem actualStep={2} currentStep={currentStep}>
				<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
			</RenderInvoiceMenuItem>
		</div>
	);
};

export function RenderInvoiceMenu() {
	const [currentStep, setCurrentStep] = useState(1);
	const [invoiceIdentifier, setInvoiceIdentifier] = useState(null);

	return (
		<>
			<RenderInvoiceMenuStepsContainer currentStep={currentStep} />
			<RenderInvoiceMenuItemAction
				currentStep={currentStep}
				setCurrentStep={setCurrentStep}
				invoiceIdentifier={invoiceIdentifier}
				setInvoiceIdentifier={setInvoiceIdentifier}
			/>
		</>
	);
}
