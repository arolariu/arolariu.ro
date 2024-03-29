interface Props {
	currentStep: number;
	// eslint-disable-next-line no-unused-vars
	setCurrentStep: (step: number) => void;
}

export const ViewInvoiceHeader = ({currentStep, setCurrentStep}: Props) => {
	return (
		<div className="flex mb-4">
			<a
				className={`${
					currentStep == 1 ? "border-indigo-500" : "border-gray-300"
				} " flex-grow cursor-pointer border-b-2 px-1 py-2 text-lg`}
				onClick={() => setCurrentStep(1)}>
				Summary
			</a>
			<a
				className={`${
					currentStep == 2 ? "border-indigo-500" : "border-gray-300"
				} " mx-1 flex-grow cursor-pointer border-b-2 px-1 py-2 text-lg`}
				onClick={() => setCurrentStep(2)}>
				Items
			</a>
			<a
				className={`${
					currentStep == 3 ? "border-indigo-500" : "border-gray-300"
				} " flex-grow cursor-pointer border-b-2 px-1 py-2 text-lg`}
				onClick={() => setCurrentStep(3)}>
				Additional Information
			</a>
		</div>
	);
};
