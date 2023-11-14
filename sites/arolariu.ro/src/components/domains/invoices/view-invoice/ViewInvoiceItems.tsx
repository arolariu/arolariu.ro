import {useStore} from "@/hooks/stateStore";
import {Item} from "@/types/Invoice";

export default function ViewInvoiceItems() {
	const [invoice] = useStore((state) => [state.selectedInvoice]);
	const items: Item[] = invoice.items;

	if (items) {
		return (
			<table className="container mx-auto mb-8 border-b border-gray-200">
				<thead>
					<tr>
						<th>Name</th>
						<th>Price</th>
						<th>Quantity</th>
						<th>Total</th>
					</tr>
				</thead>
				<tbody>
					{items.map((item, index) => (
						<tr key={index} className="text-center odd:bg-gray-900">
							<td>{item.rawName}</td>
							<td>{item.price}</td>
							<td>{item.quantity}</td>
							<td>{item.totalPrice}</td>
						</tr>
					))}
				</tbody>
			</table>
		);
	}
}
