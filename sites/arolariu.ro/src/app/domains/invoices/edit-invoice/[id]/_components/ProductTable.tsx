/** @format */

"use client";

import type Invoice from "@/types/invoices/Invoice";
import ProductCard from "./ProductCard";

/**
 *
 */
export default function ProductTable({invoice}: Readonly<{invoice: Invoice}>) {
  const {items} = invoice;

  return (
    <section>
      <div className='mx-auto flex flex-row gap-10'>
        <h2 className='mt-4 w-4/5 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text indent-8 text-2xl font-extrabold tracking-widest text-transparent'>
          Item List: ({items.length} items)
        </h2>
        <div className='mt-6 justify-end text-sm text-gray-500'>
          Filters:
          <button
            type='button'
            className='tooltip tooltip-top mx-2 rounded-full bg-gray-900 px-2 py-1 text-xs font-bold text-white'
            data-tip='Filter for only edited items.'>
            Edited
          </button>
          <button
            type='button'
            className='tooltip tooltip-bottom mx-2 rounded-full bg-gray-900 px-2 py-1 text-xs font-bold text-white'
            data-tip='Filter for only complete items.'>
            Complete
          </button>
        </div>
      </div>
      <div className='flex flex-row flex-wrap'>
        {items.map((item) => (
          <article
            key={item.rawName}
            className='2xsm:w-full sm:w-1/2 lg:w-1/3 xl:w-1/4'>
            <ProductCard item={item} />
          </article>
        ))}
      </div>
    </section>
  );
}
