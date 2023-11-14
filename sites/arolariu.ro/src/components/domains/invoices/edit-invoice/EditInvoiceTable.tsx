"use client";

import {useStore} from "@/hooks/stateStore";

export const EditInvoiceTable = () => {
	// TODO: the state of the below fields needs to be saved.... I recommend going with the object approach. (const state = {...})
	// TODO: the state then needs to be forwarded to the BE for the PUT endpoint....
	// TODO: here we need to add the possibility to add additional metadata on the fly.
	// TODO: the current way of adding new metadata is not giving great UX. We need to have a RED / GREEN popup on the right side of the additional metadata keys.
	// TODO: ^--- this will indicate for the user that he can either remove the additional metadata (by pressing on the red popup) or add a new entry.

	const [invoice] = useStore((state) => [state.selectedInvoice]);
	const {
		additionalMetadata,
		currency,
		description,
		estimatedSurvivalDays,
		identifiedDate,
		isImportant,
		possibleAllergens,
		possibleRecipes,
	} = invoice;
	const merchant = invoice.merchant;

	if (invoice) {
		return (
			<div className="mb-12">
				<table className="table text-center table-auto">
					<thead className="table-header-group mb-4 text-xl text-transparent bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text">
						<tr className="table-row">
							<th>
								Property <br />
								Name
							</th>
							<th>
								Property <br />
								Value
							</th>
						</tr>
					</thead>
					<tbody className="text-center table-row-grup">
						<tr className="table-row">
							<td className="table-cell">Currency</td>
							<td className="table-cell">{currency}</td>
						</tr>
						<tr className="table-row bg-gray-900">
							<td className="table-cell">Description</td>
							<td className="table-cell">{description}</td>
						</tr>
						<tr className="table-row">
							<td className="table-cell">Estimated Survival Days</td>
							<td className="table-cell">{estimatedSurvivalDays}</td>
						</tr>
						<tr className="table-row bg-gray-900">
							<td className="table-cell">Identified Date</td>
							<td className="table-cell">{identifiedDate as any}</td>
						</tr>
						<tr className="table-row">
							<td className="table-cell">Is Important</td>
							<td className="table-cell">{isImportant}</td>
						</tr>
						<tr className="table-row bg-gray-900">
							<td className="table-cell">Possible Allergens</td>
							<td className="table-cell">{possibleAllergens}</td>
						</tr>
						<tr className="table-row">
							<td className="table-cell">Possible Recipes</td>
							<td className="table-cell">{possibleRecipes}</td>
						</tr>
						<tr className="table-row bg-gray-900">
							<td className="table-cell">Merchant Name</td>
							<td className="table-cell">{merchant.name}</td>
						</tr>
						<tr className="table-row">
							<td className="table-cell">Merchant Address</td>
							<td className="table-cell">{merchant.address}</td>
						</tr>
						<tr className="table-row bg-gray-900">
							<td className="table-cell">Merchant Phone Number</td>
							<td className="table-cell">{merchant.phoneNumber}</td>
						</tr>
						<tr className="table-row">
							<td className="table-cell">Merchant Parent Company</td>
							<td className="table-cell">{merchant.parentCompany}</td>
						</tr>
						{additionalMetadata.map((kvPair, index) => (
							<tr key={index} className={`${index % 2 != 1 ? "bg-gray-900" : ""} table-row text-center`}>
								<td className="table-cell">{kvPair.key}</td>
								<td className="table-cell">{kvPair.value}</td>
							</tr>
						))}
					</tbody>
				</table>
				<div className="mt-8">
					<form className="p-4 border-2 rounded-xl">
						<label htmlFor="additionalMetadataKey">Additional Metadata - Key</label>
						<input
							className="block w-full px-4 py-2 mt-2 text-gray-900 bg-gray-100 border-gray-300 rounded-md focus:border-pink-500 focus:ring-pink-500"
							type="text"
							name="additionalMetadataKey"
							id="additionalMetadataKey"
						/>
						<label htmlFor="additionalMetadataValue">Additional Metadata - Value</label>
						<input
							className="block w-full px-4 py-2 mt-2 text-gray-900 bg-gray-100 border-gray-300 rounded-md focus:border-pink-500 focus:ring-pink-500"
							type="text"
							name="additionalMetadataValue"
							id="additionalMetadataValue"
						/>
						<div className="flex flex-col gap-4 mt-4">
							<button type="submit" className="btn btn-primary">
								Add Additional Metadata
							</button>
							<button type="submit" className="btn btn-secondary">
								Save Changes
							</button>
						</div>
					</form>
				</div>
			</div>
		);
	}
};
