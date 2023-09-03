import {capitalizeWords, first15} from "@/lib/stringUtils";
import {Item, ItemCategory} from "@/types/Invoice";
import {useRef, useState} from "react";

interface Props {
	item: Item;
}

export default function EditInvoiceItemCard({item}: Props) {
	const [itemState, setItemState] = useState<Item>(item);

	const editItemDialogRef = useRef<null | HTMLDialogElement>(null);
	const deleteItemDialogref = useRef<null | HTMLDialogElement>(null);

	// TODO: Dialogs could be their own JSX components...?
	// TODO: implement logic for both dialogs.

	return (
		<div className="flex flex-col p-4 m-4 border border-gray-200 rounded-lg shadow-md group">
			<div className="flex flex-row text-gray-50">
				<div className="flex flex-col ml-2 text-center">
					<span className="text-sm font-semibold">Raw Name</span>
					<span className="text-sm font-semibold">Generic Name</span>
					<span className="text-sm font-semibold">Category</span>
					<span className="text-sm font-semibold">Quantity</span>
					<span className="text-sm font-semibold">Quantity Unit</span>
					<span className="text-sm font-semibold">Price</span>
					<span className="text-sm font-semibold">Total Price</span>
					<span className="text-sm font-semibold">Product Code</span>
				</div>
				<div className="flex flex-col mx-auto text-center">
					<span className="text-sm font-semibold tooltip tooltip-top" data-tip={itemState.rawName}>
						{capitalizeWords(first15(itemState.rawName))}
					</span>
					<span className="text-sm font-semibold tooltip tooltip-bottom" data-tip={itemState.genericName}>
						{capitalizeWords(first15(itemState.genericName))}
					</span>
					<span className="text-sm font-semibold">{ItemCategory[itemState.category]}</span>
					<span className="text-sm font-semibold">{itemState.quantity}</span>
					<span className="text-sm font-semibold">{itemState.quantityUnit}</span>
					<span className="text-sm font-semibold">{itemState.price}</span>
					<span className="text-sm font-semibold">{itemState.totalPrice}</span>
					<span className="text-sm font-semibold">{itemState.productCode}</span>
				</div>
			</div>
			<div className="hidden gap-2 mt-2 group-hover:flex group-hover:flex-col group-hover:transition group-hover:delay-1000 group-hover:duration-1000 group-hover:ease-in lg:flex lg:flex-col">
				<dialog className="modal modal-bottom backdrop-blur-sm sm:modal-middle" ref={editItemDialogRef}>
					<form method="dialog" className="form-control modal-box">
						<center className="mb-4 font-black">⚙️ Item Editor</center>
						<label htmlFor="rawName">Raw Name</label>
						<input
							type="text"
							name="rawName"
							id="rawName"
							className="input input-bordered"
							defaultValue={itemState.rawName}
							onChange={(e) => {
								setItemState({...itemState, rawName: e.target.value});
							}}
						/>
						<label htmlFor="genericName">Generic Name</label>
						<input
							type="text"
							name="genericName"
							id="genericName"
							className="input input-bordered"
							defaultValue={itemState.genericName}
							onChange={(e) => {
								setItemState({...itemState, genericName: e.target.value});
							}}
						/>
						<label htmlFor="category">Category</label>
						<select name="category" id="category" className="w-full select select-bordered">
							{Object.keys(ItemCategory).map((key) => (
								<option key={key} value={key}>
									{ItemCategory[key as keyof typeof ItemCategory]}
								</option>
							))}
						</select>
						<label htmlFor="productCode">Product Code</label>
						<input
							type="text"
							name="productCode"
							id="productCode"
							className="input input-bordered"
							defaultValue={itemState.productCode}
							onChange={(e) => {
								setItemState({...itemState, productCode: e.target.value});
							}}
						/>
						<label htmlFor="quantity">Quantity</label>
						<input
							type="number"
							name="quantity"
							id="quantity"
							className="input input-bordered"
							defaultValue={itemState.quantity}
							onChange={(e) => {
								setItemState({...itemState, quantity: e.target.value as unknown as number});
							}}
						/>
						<label htmlFor="quantityUnit">Quantity Unit</label>
						<input
							type="text"
							name="quantityUnit"
							id="quantityUnit"
							className="input input-bordered"
							defaultValue={itemState.quantityUnit}
							onChange={(e) => {
								setItemState({...itemState, quantityUnit: e.target.value});
							}}
						/>
						<label htmlFor="price">Price</label>
						<input
							type="number"
							name="price"
							id="price"
							className="input input-bordered"
							defaultValue={itemState.price}
							onChange={(e) => {
								setItemState({...itemState, price: e.target.value as unknown as number});
							}}
						/>
						<label htmlFor="totalPrice">Total Price</label>
						<input
							type="number"
							name="totalPrice"
							id="totalPrice"
							className="input input-bordered"
							disabled
							defaultValue={itemState.totalPrice}
							value={(itemState.totalPrice = itemState.price * itemState.quantity)}
						/>
						<div className="flex flex-col gap-4 modal-action">
							<button className="btn btn-success">💾 Save item changes</button>
							<button className="btn btn-neutral">🔙 Drop item changes</button>
						</div>
					</form>
				</dialog>
				<dialog className="modal modal-bottom backdrop-blur-sm sm:modal-middle" ref={deleteItemDialogref}>
					<form method="dialog" className="modal-box">
						<center className="mb-2 font-black">⚠️ Delete item: {itemState.rawName} ?</center>
						<center className="mb-2">
							This action is <strong>irreversible.</strong> <br />
							Deleting this item will remove it completely from the invoice. <br />
							You can, however, manually add it back later.
						</center>
						<div className="gap-4 modal-action">
							<button className="btn btn-neutral">🔙 Go back</button>
							<button className="btn btn-error">🗑️ Delete item</button>
						</div>
					</form>
				</dialog>
				<button className="btn btn-neutral" onClick={() => editItemDialogRef.current?.show()}>
					✅ Edit Item
				</button>
				<button className="btn btn-neutral" onClick={() => deleteItemDialogref.current?.show()}>
					❌ Delete Item
				</button>
			</div>
		</div>
	);
}
