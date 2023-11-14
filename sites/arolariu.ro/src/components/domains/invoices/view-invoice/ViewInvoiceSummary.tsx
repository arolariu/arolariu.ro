import {useStore} from "@/hooks/stateStore";

export const ViewInvoiceSummary = () => {
	const [invoice] = useStore((state) => [state.selectedInvoice]);
	const {
		possibleAllergens,
		uploadedDate,
		possibleRecipes,
		merchant,
		identifiedDate,
		lastAnalyzedDate,
		estimatedSurvivalDays,
	} = invoice;

	const allergensText =
		possibleAllergens?.length > 0
			? possibleAllergens.join(", ")
			: "no identified allergens... input allergens manually or analyze again.";

	const recipesText =
		possibleRecipes?.length > 0
			? possibleRecipes.join(", ")
			: "no identified recipes... input recipes manually or analyze again.";

	const boughtItems = invoice.items
		.filter((item) => item.totalPrice > 0 && item.quantity > 0)
		.reduce((counter, item) => counter + item.quantity, 0);

	return (
		<section>
			<p className="mb-4 leading-relaxed">
				⚠️ ALLERGENS: <em>{allergensText}</em> <br />
				🍳 RECIPES: <em>{recipesText}</em> <br />
				💚 ESTIMATED SURVIVAL (<strong>1 adult</strong>): <em>{estimatedSurvivalDays} days</em>
			</p>
			<center className="mx-auto mt-4 mb-2">
				<em>If you feel that some of the details are not correct, feel free to edit the invoice.</em>
			</center>
			<div className="flex py-2 border-t border-b border-gray-200">
				<span>Items Purchased</span>
				<span className="ml-auto dark:text-gray-300">
					{boughtItems > 0 ? `${boughtItems} items.` : "No purchase identified."}
				</span>
			</div>
			<div className="flex py-2 border-b border-gray-200">
				<span>Merchant Name</span>
				<span className="ml-auto dark:text-gray-300">{merchant.name}</span>
			</div>
			<div className="flex py-2 border-b border-gray-200">
				<span>Invoice Last Analysis</span>
				<span className="ml-auto dark:text-gray-300">{new Date(lastAnalyzedDate).toUTCString()}</span>
			</div>
			<div className="flex py-2 border-b border-gray-200">
				<span>Invoice Uploaded Date</span>
				<span className="ml-auto dark:text-gray-300">{new Date(uploadedDate).toUTCString()}</span>
			</div>
			<div className="flex py-2 mb-6 border-b border-gray-200">
				<span>Invoice Identified Date</span>
				<span className="ml-auto dark:text-gray-300">{new Date(identifiedDate).toUTCString()}</span>
			</div>
		</section>
	);
};
