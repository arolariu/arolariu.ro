/** @format */

"use client";

import {useZustandStore} from "@/hooks/stateStore";

export const InvoiceSummary = () => {
  const invoice = useZustandStore((state) => state.selectedInvoice);
  const merchant = invoice.merchant;
  const products = invoice.items;
  const productsWithAllergens = products.filter((item) => item.detectedAllergens.length > 0);
  const allergensList = productsWithAllergens.flatMap((item) => item.detectedAllergens);
  const recipesList = invoice.possibleRecipes.flat();

  const allergensText =
    allergensList.length > 0
      ? allergensList.map((allergen) => allergen.name).join(", ")
      : "no identified allergens... input allergens manually or analyze again.";

  const recipesText =
    recipesList.length > 0
      ? recipesList.map((recipe) => recipe.name).join(", ")
      : "no identified recipes... input recipes manually or analyze again.";

  const boughtItems = invoice.items
    .filter((item) => item.totalPrice > 0 && item.quantity > 0)
    .reduce((counter, item) => counter + item.quantity, 0);

  return (
    <section>
      <article className='mb-4 leading-relaxed'>
        ⚠️ ALLERGENS: <em>{allergensText}</em> <br />
        🍳 RECIPES: <em>{recipesText}</em> <br />
        💚 ESTIMATED SURVIVAL (<strong>1 adult</strong>): <em>{invoice.estimatedSurvivalDays} days</em>
      </article>
      <center className='mx-auto mb-2 mt-4'>
        <em>If you feel that some of the details are not correct, feel free to edit the invoice.</em>
      </center>
      <div className='flex border-b border-t border-gray-200 py-2'>
        <span>Items Purchased</span>
        <span className='ml-auto dark:text-gray-300'>
          {boughtItems > 0 ? `${boughtItems.toString()} items.` : "No purchase identified."}
        </span>
      </div>
      <div className='flex border-b border-gray-200 py-2'>
        <span>Merchant Name</span>
        <span className='ml-auto dark:text-gray-300'>{merchant.name}</span>
      </div>
      <div className='flex border-b border-gray-200 py-2'>
        <span>Invoice Last Analysis</span>
        <span className='ml-auto dark:text-gray-300'>{new Date(invoice.lastUpdatedAt).toUTCString()}</span>
      </div>
      <div className='flex border-b border-gray-200 py-2'>
        <span>Invoice Uploaded Date</span>
        <span className='ml-auto dark:text-gray-300'>{new Date(invoice.createdAt).toUTCString()}</span>
      </div>
      <div className='mb-6 flex border-b border-gray-200 py-2'>
        <span>Invoice Identified Date</span>
        <span className='ml-auto dark:text-gray-300'>
          {new Date(invoice.paymentInformation.dateOfPurchase).toUTCString()}
        </span>
      </div>
    </section>
  );
};
