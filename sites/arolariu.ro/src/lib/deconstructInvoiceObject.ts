/** @format */

import Invoice from "@/types/Invoice";

export default function deconstructInvoiceObject(invoice: Invoice) {
	const {
		invoiceId,
		invoiceImageURI,
		invoiceMetadata,
		merchantInformation,
		invoiceTime,
		transactionInformation,
		items,
	} = invoice;

	const {metadataBag} = invoiceMetadata;

	const {merchantName, merchantAddress, merchantPhoneNumber} = merchantInformation;

	const {transactionDescription, transactionTotal, transactionCalories} = transactionInformation;

	const {boughtItems, discountedItems} = items;

	const {invoiceSubmittedDate, invoiceIdentifiedDate} = invoiceTime;

	return {
		invoiceId,
		invoiceImageURI,
		metadataBag,
		merchantName,
		merchantAddress,
		merchantPhoneNumber,
		transactionDescription,
		transactionTotal,
		transactionCalories,
		boughtItems,
		discountedItems,
		invoiceSubmittedDate,
		invoiceIdentifiedDate,
	};
}
