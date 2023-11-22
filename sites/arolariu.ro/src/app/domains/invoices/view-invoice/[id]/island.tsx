"use client";

import ViewInvoiceAdditionalInformation from "@/components/domains/invoices/view-invoice/ViewInvoiceAdditionalInformation";
import ViewInvoiceFooter from "@/components/domains/invoices/view-invoice/ViewInvoiceFooter";
import {ViewInvoiceHeader} from "@/components/domains/invoices/view-invoice/ViewInvoiceHeader";
import {ViewInvoiceImageModal} from "@/components/domains/invoices/view-invoice/ViewInvoiceImageModal";
import ViewInvoiceItems from "@/components/domains/invoices/view-invoice/ViewInvoiceItems";
import {ViewInvoiceSummary} from "@/components/domains/invoices/view-invoice/ViewInvoiceSummary";
import { useZustandStore } from "@/hooks/stateStore";
import Invoice from "@/types/invoices/Invoice";
import {useState} from "react";

interface Props { invoice: Invoice | null; }

export function RenderViewInvoicePage({invoice}: Readonly<Props>) {
	const [currentStep, setCurrentStep] = useState<number>(1);
	const setSelectedInvoice = useZustandStore((state) => state.setSelectedInvoice);
		setSelectedInvoice(invoice!);
		return (
			<div className="container py-12 mx-auto">
				<div className="flex flex-wrap justify-center mx-auto">
					<div className="w-full mb-6 lg:mb-0 lg:w-1/2 lg:py-6 lg:pr-10">
						<h2 className="text-sm tracking-widest title-font dark:text-gray-500">
							Invoice: <span>{invoice!.id}</span>
						</h2>
						<h1 className="mb-4 text-3xl font-medium text-transparent text-transparenttext-3xl bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text">
							{invoice!.description}
						</h1>
						<ViewInvoiceHeader currentStep={currentStep} setCurrentStep={setCurrentStep} />
						{currentStep === 1 && <ViewInvoiceSummary />}
						{currentStep === 2 && <ViewInvoiceItems />}
						{currentStep === 3 && <ViewInvoiceAdditionalInformation />}
						<ViewInvoiceFooter />
					</div>
				</div>
				<ViewInvoiceImageModal />
			</div>
		);
}
