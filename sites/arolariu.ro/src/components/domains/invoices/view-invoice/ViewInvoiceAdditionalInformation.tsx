import {useZustandStore} from "@/hooks/stateStore";

export default function ViewInvoiceAdditionalInformation() {
	const invoice = useZustandStore((state) => state.selectedInvoice);
	const {additionalMetadata, userIdentifier} = invoice;

	return (
		<section>
			<div className="flex py-2 border-b border-gray-200">
				<span>Invoice Last Analysis</span>
				<span className="ml-auto dark:text-gray-300">{new Date(invoice.lastUpdatedAt).toUTCString()}</span>
			</div>
			<div className="flex py-2 border-b border-gray-200">
				<span>User Identifier</span>
				<span className="ml-auto dark:text-gray-300">{userIdentifier}</span>
			</div>
			{additionalMetadata.map((kvPair, index) => (
				<div key={index} className="flex py-2 border-b border-gray-200">
					<span>{kvPair.key}</span>
					<span className="ml-auto dark:text-gray-300">{kvPair.value as any}</span>
				</div>
			))}
			<div>
				<center className="mx-auto my-4">
					<em>If you feel that some of the details are not correct, feel free to edit the invoice.</em>
				</center>
			</div>
		</section>
	);
}
