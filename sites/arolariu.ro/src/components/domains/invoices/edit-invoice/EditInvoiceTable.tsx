"use client";

import {useZustandStore} from "@/hooks/stateStore";

export const EditInvoiceTable = () => {
  const [invoice] = useZustandStore((state) => [state.selectedInvoice]);
  const merchant = invoice.merchant;

  const itemsWithAllergens = invoice.items.filter((item) => item.detectedAllergens.length > 0);
  const allergensList = itemsWithAllergens.flatMap((item) => item.detectedAllergens);
  const recipesList = invoice.possibleRecipes;

  return (
    <div className='mb-12'>
      <table className='table table-auto text-center'>
        <thead className='mb-4 table-header-group bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-xl text-transparent'>
          <tr className='table-row'>
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
        <tbody className='table-row-grup text-center'>
          <tr className='table-row'>
            <td className='table-cell'>Currency</td>
            <td className='table-cell'>{invoice.paymentInformation.currency.name}</td>
          </tr>
          <tr className='table-row bg-gray-900'>
            <td className='table-cell'>Description</td>
            <td className='table-cell'>{invoice.description}</td>
          </tr>
          <tr className='table-row'>
            <td className='table-cell'>Estimated Survival Days</td>
            <td className='table-cell'>{invoice.estimatedSurvivalDays}</td>
          </tr>
          <tr className='table-row bg-gray-900'>
            <td className='table-cell'>Identified Date</td>
            <td className='table-cell'>{invoice.paymentInformation.dateOfPurchase.toUTCString()}</td>
          </tr>
          <tr className='table-row'>
            <td className='table-cell'>Is Important</td>
            <td className='table-cell'>{invoice.isImportant}</td>
          </tr>
          <tr className='table-row bg-gray-900'>
            <td className='table-cell'>Possible Allergens</td>
            <td className='table-cell'>{allergensList.map((item) => item.name)}</td>
          </tr>
          <tr className='table-row'>
            <td className='table-cell'>Possible Recipes</td>
            <td className='table-cell'>{recipesList.map((item) => item.name)}</td>
          </tr>
          <tr className='table-row bg-gray-900'>
            <td className='table-cell'>Merchant Name</td>
            <td className='table-cell'>{merchant.name}</td>
          </tr>
          <tr className='table-row'>
            <td className='table-cell'>Merchant Address</td>
            <td className='table-cell'>{merchant.address}</td>
          </tr>
          <tr className='table-row bg-gray-900'>
            <td className='table-cell'>Merchant Phone Number</td>
            <td className='table-cell'>{merchant.phoneNumber}</td>
          </tr>
          {invoice.additionalMetadata.flatMap((metadata, index) => (
            <tr
              key={index}
              className='table-row'>
              <td className='table-cell'>{Object.keys(metadata)[index]}</td>
              <td className='table-cell'>{String(Object.values(metadata)[index])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className='mt-8'>
        <form className='rounded-xl border-2 p-4'>
          <label htmlFor='additionalMetadataKey'>Additional Metadata - Key</label>
          <input
            className='mt-2 block w-full rounded-md border-gray-300 bg-gray-100 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500'
            type='text'
            name='additionalMetadataKey'
            id='additionalMetadataKey'
          />
          <label htmlFor='additionalMetadataValue'>Additional Metadata - Value</label>
          <input
            className='mt-2 block w-full rounded-md border-gray-300 bg-gray-100 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500'
            type='text'
            name='additionalMetadataValue'
            id='additionalMetadataValue'
          />
          <div className='mt-4 flex flex-col gap-4'>
            <button
              type='submit'
              className='btn btn-primary'>
              Add Additional Metadata
            </button>
            <button
              type='submit'
              className='btn btn-secondary'>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
