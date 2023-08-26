import {InvoiceAnalysisOptions} from "@/types/Invoice";
import {useEffect, useState} from "react";

export default function useSendInvoiceToAnalysis(invoiceIdentifier: string) {
	const [sentForAnalysis, setSentForAnalysis] = useState<boolean>(false);

	// send a POST http request to the `api.arolariu.ro/rest/invoices/id/analyze endpoint with the invoice id in the body as well.
	useEffect(() => {
		const sendInvoiceToBackend = async () => {
			const jsonPayload = {
				completeAnalysis: true,
				invoiceOnly: false,
				invoiceItemsOnly: false,
			} as InvoiceAnalysisOptions;

			const response = await fetch(
				`https://api.arolariu.ro/rest/invoices/${invoiceIdentifier}/analyze`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(jsonPayload),
				},
			);

			if (response.status === 200) {
				setSentForAnalysis(true);
			} else {
				console.error("Error sending invoice to analysis");
			}
		};

		sendInvoiceToBackend();
	}, [invoiceIdentifier]);

	return sentForAnalysis;
}
