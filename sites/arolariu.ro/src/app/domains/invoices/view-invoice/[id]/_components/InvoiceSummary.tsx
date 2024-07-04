/** @format */

"use client";

import Invoice from "@/types/invoices/Invoice";

export const InvoiceSummary = ({invoice}: Readonly<{invoice: Invoice}>) => {
  const {merchant, items, lastUpdatedAt, createdAt, possibleRecipes: recipesList, paymentInformation} = invoice;
  const productsWithAllergens = items?.filter((item) => item.detectedAllergens.length > 0);
  const allergensList = productsWithAllergens?.flatMap((item) => item.detectedAllergens) ?? null;
  const boughtItems =
    items?.filter((item) => item.quantity > 0 && item.price > 0).reduce((acc, item) => acc + item.quantity, 0) ?? 0;

  return (
    <section>
      <article className='mb-4 leading-relaxed'>
        ⚠️ DETECTED ALLERGENS: <br />
        <ol
          className={`${allergensList === null || allergensList.length === 0 ? "list-disc" : "list-decimal"} list-inside`}>
          {(allergensList === null || allergensList.length === 0) && <li>No allergens detected.</li>}
          {allergensList?.map((allergen, index) => <li key={index}>{allergen.name.trim()}</li>)}
        </ol>
        <br />
      </article>
      <article className='mb-4 leading-relaxed'>
        🍳 POSSIBLE RECIPES: <br />
        <ol
          className={`${recipesList === null || recipesList.length === 0 ? "list-disc" : "list-decimal"} list-inside`}>
          {(recipesList === null || recipesList.length === 0) && <li>No recipes detected.</li>}
          {recipesList?.map((recipe, index) => <li key={index}>{recipe.name.trim()}</li>)}
        </ol>
        <br />
      </article>
      <center className='mx-auto mb-2 mt-4'>
        <em>If you feel that some of the details are not correct, feel free to edit the invoice.</em>
      </center>
      <div className='flex border-b border-t border-gray-200 py-2'>
        <span>Items Purchased</span>
        <span className='ml-auto dark:text-gray-300'>
          {boughtItems > 0 ? `${boughtItems.toFixed(0)} items.` : "No purchase identified."}
        </span>
      </div>
      <div className='flex border-b border-gray-200 py-2'>
        <span>Merchant Name</span>
        <span className='ml-auto dark:text-gray-300'>{merchant?.name}</span>
      </div>
      <div className='flex border-b border-gray-200 py-2'>
        <span>Invoice Last Analysis</span>
        <span className='ml-auto dark:text-gray-300'>{new Date(lastUpdatedAt).toUTCString()}</span>
      </div>
      <div className='flex border-b border-gray-200 py-2'>
        <span>Invoice Uploaded Date</span>
        <span className='ml-auto dark:text-gray-300'>{new Date(createdAt).toUTCString()}</span>
      </div>
      <div className='mb-6 flex border-b border-gray-200 py-2'>
        <span>Invoice Identified Date</span>
        <span className='ml-auto dark:text-gray-300'>
          {new Date(paymentInformation?.dateOfPurchase ?? Date.now()).toUTCString()}
        </span>
      </div>
    </section>
  );
};

