import Invoice from "@/types/Invoice";

interface Props {
	invoice: Invoice;
}

export default function ViewInvoiceAdditionalInformation({invoice}: Props) {
	const {additionalMetadata, lastAnalyzedDate, userIdentifier} = invoice;

	return (
		<section>
			<div className="flex py-2 border-b border-gray-200">
				<span>Invoice Last Analysis</span>
				<span className="ml-auto dark:text-gray-300">
					{new Date(lastAnalyzedDate).toUTCString()}
				</span>
			</div>
			<div className="flex py-2 border-b border-gray-200">
				<span>User Identifier</span>
				<span className="ml-auto dark:text-gray-300">{userIdentifier}</span>
			</div>
			{additionalMetadata.map((kvPair, index) => (
				<div key={index} className="flex py-2 border-b border-gray-200">
					<span>{kvPair.key}</span>
					<span className="ml-auto dark:text-gray-300">{kvPair.value}</span>
				</div>
			))}
			<div>
				<center className="mx-auto my-4">
					<em>
						If you feel that some of the details are not correct, feel free to edit the invoice.
					</em>
				</center>
			</div>
		</section>
	);
}
