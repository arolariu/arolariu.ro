"use client";

import animationData from "@/assets/invoiceNotFoundLottie.json";
import ViewInvoiceAdditionalInformation from "@/components/domains/invoices/view-invoice/ViewInvoiceAdditionalInformation";
import ViewInvoiceFooter from "@/components/domains/invoices/view-invoice/ViewInvoiceFooter";
import {ViewInvoiceHeader} from "@/components/domains/invoices/view-invoice/ViewInvoiceHeader";
import {ViewInvoiceImageModal} from "@/components/domains/invoices/view-invoice/ViewInvoiceImageModal";
import ViewInvoiceItems from "@/components/domains/invoices/view-invoice/ViewInvoiceItems";
import {ViewInvoiceSummary} from "@/components/domains/invoices/view-invoice/ViewInvoiceSummary";
import useFetchInvoiceWithIdForUser from "@/hooks/useFetchInvoiceWithIdForUser";
import Invoice from "@/types/Invoice";
import {Player} from "@lottiefiles/react-lottie-player";
import {Session, User} from "next-auth";
import {useState} from "react";

interface IslandProps {
	session: Session;
	id: string;
}

interface ComponentProps {
	invoice: Invoice;
	currentStep: number;
}

const ViewInvoiceInformation = ({invoice, currentStep}: ComponentProps) => {
	switch (currentStep) {
		case 1:
			return <ViewInvoiceSummary invoice={invoice} />;
		case 2:
			return <ViewInvoiceItems invoice={invoice} />;
		case 3:
			return <ViewInvoiceAdditionalInformation invoice={invoice} />;
		default:
			return null; // TODO: we might want to add a default error component here
	}
};

export function RenderViewInvoicePage({session, id}: IslandProps) {
	const invoice = useFetchInvoiceWithIdForUser(id, session.user as User);
	const [currentStep, setCurrentStep] = useState<number>(1);

	if (invoice) {
		return (
			<div className="container py-12 mx-auto">
				<div className="flex flex-wrap justify-center mx-auto">
					<div className="w-full mb-6 lg:mb-0 lg:w-1/2 lg:py-6 lg:pr-10">
						<h2 className="text-sm tracking-widest title-font dark:text-gray-500">
							Invoice: <span>{invoice.id}</span>
						</h2>
						<h1 className="mb-4 text-3xl font-medium text-transparent text-transparenttext-3xl bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text">
							{invoice.description}
						</h1>
						<ViewInvoiceHeader currentStep={currentStep} setCurrentStep={setCurrentStep} />
						<ViewInvoiceInformation currentStep={currentStep} invoice={invoice} />
						<ViewInvoiceFooter invoice={invoice} />
					</div>
				</div>
				<ViewInvoiceImageModal invoice={invoice} />
			</div>
		);
	} else {
		return (
			<div className="container flex flex-col mx-auto">
				<Player
					autoplay
					loop
					src={animationData}
					speed={0.4}
					className="container mx-auto flex w-[45%]"
				/>
				<h1 className="items-center justify-center mx-auto mb-8 text-3xl font-medium text-center text-transparent bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text">
					Trying to find invoice with id:
					<strong className="block">{id}</strong>
				</h1>
			</div>
		);
	}
}
