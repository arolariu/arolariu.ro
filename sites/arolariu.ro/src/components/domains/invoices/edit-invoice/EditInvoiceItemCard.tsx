import Product, {ItemCategory} from "@/types/invoices/Product";
import {useRef, useState} from "react";

interface Props {
  item: Product;
}

/**
 * This function renders the edit invoice item card.
 * @returns The JSX for the edit invoice item card.
 */
export default function EditInvoiceItemCard({item}: Readonly<Props>) {
  const [itemState, setItemState] = useState<Product>(item);

  const editItemDialogRef = useRef<null | HTMLDialogElement>(null);
  const deleteItemDialogref = useRef<null | HTMLDialogElement>(null);

  const capitalizeFirst15Words = (str: string) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // TODO: Dialogs could be their own JSX components...?
  // TODO: implement logic for both dialogs.

  return (
    <div className='group m-4 flex flex-col rounded-lg border border-gray-200 p-4 shadow-md'>
      <div className='flex flex-row text-gray-50'>
        <div className='ml-2 flex flex-col text-center'>
          <span className='text-sm font-semibold'>Raw Name</span>
          <span className='text-sm font-semibold'>Generic Name</span>
          <span className='text-sm font-semibold'>Category</span>
          <span className='text-sm font-semibold'>Quantity</span>
          <span className='text-sm font-semibold'>Quantity Unit</span>
          <span className='text-sm font-semibold'>Price</span>
          <span className='text-sm font-semibold'>Total Price</span>
          <span className='text-sm font-semibold'>Product Code</span>
        </div>
        <div className='mx-auto flex flex-col text-center'>
          <span
            className='tooltip tooltip-top text-sm font-semibold'
            data-tip={itemState.rawName}>
            {capitalizeFirst15Words(itemState.rawName)}
          </span>
          <span
            className='tooltip tooltip-bottom text-sm font-semibold'
            data-tip={itemState.genericName}>
            {capitalizeFirst15Words(itemState.genericName)}
          </span>
          <span className='text-sm font-semibold'>{ItemCategory[itemState.category]}</span>
          <span className='text-sm font-semibold'>{itemState.quantity}</span>
          <span className='text-sm font-semibold'>{itemState.quantityUnit}</span>
          <span className='text-sm font-semibold'>{itemState.price}</span>
          <span className='text-sm font-semibold'>{itemState.totalPrice}</span>
          <span className='text-sm font-semibold'>{itemState.productCode}</span>
        </div>
      </div>
      <div className='mt-2 hidden gap-2 group-hover:flex group-hover:flex-col group-hover:transition group-hover:delay-1000 group-hover:duration-1000 group-hover:ease-in lg:flex lg:flex-col'>
        <dialog
          className='modal modal-bottom backdrop-blur-sm sm:modal-middle'
          ref={editItemDialogRef}>
          <form
            method='dialog'
            className='form-control modal-box'>
            <center className='mb-4 font-black'>⚙️ Item Editor</center>
            <label htmlFor='rawName'>Raw Name</label>
            <input
              type='text'
              name='rawName'
              id='rawName'
              className='input input-bordered'
              defaultValue={itemState.rawName}
              onChange={(e) => {
                setItemState({...itemState, rawName: e.target.value});
              }}
            />
            <label htmlFor='genericName'>Generic Name</label>
            <input
              type='text'
              name='genericName'
              id='genericName'
              className='input input-bordered'
              defaultValue={itemState.genericName}
              onChange={(e) => {
                setItemState({...itemState, genericName: e.target.value});
              }}
            />
            <label htmlFor='category'>Category</label>
            <select
              name='category'
              id='category'
              className='select select-bordered w-full'>
              {Object.keys(ItemCategory).map((key) => (
                <option
                  key={key}
                  value={key}>
                  {ItemCategory[key as keyof typeof ItemCategory]}
                </option>
              ))}
            </select>
            <label htmlFor='productCode'>Product Code</label>
            <input
              type='text'
              name='productCode'
              id='productCode'
              className='input input-bordered'
              defaultValue={itemState.productCode}
              onChange={(e) => {
                setItemState({...itemState, productCode: e.target.value});
              }}
            />
            <label htmlFor='quantity'>Quantity</label>
            <input
              type='number'
              name='quantity'
              id='quantity'
              className='input input-bordered'
              defaultValue={itemState.quantity}
              onChange={(e) => {
                setItemState({...itemState, quantity: e.target.value as unknown as number});
              }}
            />
            <label htmlFor='quantityUnit'>Quantity Unit</label>
            <input
              type='text'
              name='quantityUnit'
              id='quantityUnit'
              className='input input-bordered'
              defaultValue={itemState.quantityUnit}
              onChange={(e) => {
                setItemState({...itemState, quantityUnit: e.target.value});
              }}
            />
            <label htmlFor='price'>Price</label>
            <input
              type='number'
              name='price'
              id='price'
              className='input input-bordered'
              defaultValue={itemState.price}
              onChange={(e) => {
                setItemState({...itemState, price: e.target.value as unknown as number});
              }}
            />
            <label htmlFor='totalPrice'>Total Price</label>
            <input
              type='number'
              name='totalPrice'
              id='totalPrice'
              className='input input-bordered'
              disabled
              defaultValue={itemState.totalPrice}
              value={(itemState.totalPrice = itemState.price * itemState.quantity)}
            />
            <div className='modal-action flex flex-col gap-4'>
              <button
                type='button'
                className='btn btn-success'>
                💾 Save item changes
              </button>
              <button
                type='button'
                className='btn btn-neutral'>
                🔙 Drop item changes
              </button>
            </div>
          </form>
        </dialog>
        <dialog
          className='modal modal-bottom backdrop-blur-sm sm:modal-middle'
          ref={deleteItemDialogref}>
          <form
            method='dialog'
            className='modal-box'>
            <center className='mb-2 font-black'>⚠️ Delete item: {itemState.rawName} ?</center>
            <center className='mb-2'>
              This action is <strong>irreversible.</strong> <br />
              Deleting this item will remove it completely from the invoice. <br />
              You can, however, manually add it back later.
            </center>
            <div className='modal-action gap-4'>
              <button
                type='button'
                className='btn btn-neutral'>
                🔙 Go back
              </button>
              <button
                type='button'
                className='btn btn-error'>
                🗑️ Delete item
              </button>
            </div>
          </form>
        </dialog>
        <button
          type='button'
          className='btn btn-neutral'
          onClick={() => editItemDialogRef.current?.show()}>
          ✅ Edit Item
        </button>
        <button
          type='button'
          className='btn btn-neutral'
          onClick={() => deleteItemDialogref.current?.show()}>
          ❌ Delete Item
        </button>
      </div>
    </div>
  );
}
