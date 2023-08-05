/** @format */

"use client";

import AnalyzeInvoiceProcess from "../interactive-actions/AnalyzeInvoiceProcess";
import UploadInvoicePhoto from "../interactive-actions/UploadInvoicePhoto";

export default function RenderInvoiceMenuItemAction({
	currentStep,
	setCurrentStep,
	invoiceIdentifier,
	setInvoiceIdentifier,
}) {
	if (currentStep == 1) {
		return (
			<UploadInvoicePhoto
				setCurrentStep={setCurrentStep}
				setInvoiceIdentifier={setInvoiceIdentifier}
			/>
		);
	} else if (currentStep == 2) {
		return (
			<AnalyzeInvoiceProcess
				setCurrentStep={setCurrentStep}
				invoiceIdentifier={invoiceIdentifier}
			/>
		);
	} else if (currentStep == 3) {
		return <h1>HELLO WORLD from Step 3!</h1>;
	} else if (currentStep == 4) {
		return <h1>HELLO WORLD from Step 4!</h1>;
	} else {
		return null;
	}
}
