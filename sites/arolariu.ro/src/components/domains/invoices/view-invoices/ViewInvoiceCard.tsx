import Invoice from "@/types/Invoice";
import Image from "next/image";
import Link from "next/link";

interface Props {
	invoice: Invoice;
}

export const ViewInvoiceCard = ({ invoice }: Props) => {
	const isPdfImage = invoice.imageUri.endsWith(".pdf");

	return (
		<div className="w-full p-4 md:w-1/2 lg:w-1/4">
			<Link
				href={`./view-invoice/${invoice.id}`}
				className="relative block h-48 overflow-hidden rounded">
				{isPdfImage && (
					<div className="flex items-center justify-center w-full h-full bg-gray-100">
						<p className="text-2xl text-gray-500">PDF</p>
					</div>
				)}
				{!isPdfImage && (
					<Image
						alt="ecommerce"
						className="block object-cover object-center w-full h-full"
						src={invoice.imageUri}
						width={420}
						height={260}
					/>
				)}
			</Link>
			<div className="mt-4">
				<h3 className="mb-1 text-xs tracking-widest title-font dark:text-gray-500">
					DATE: {new Date(invoice.identifiedDate).toUTCString()}
				</h3>
				<h2 className="text-base font-medium text-gray-500 title-font">
					MERCHANT: {invoice.merchant.name}
				</h2>
				<p className="mt-1">
					Total: {invoice.totalAmount}
					{invoice.currency}
				</p>
			</div>
		</div>
	);
};
