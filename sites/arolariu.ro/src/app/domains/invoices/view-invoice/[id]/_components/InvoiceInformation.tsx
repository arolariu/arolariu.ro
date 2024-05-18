/** @format */

"use client";

import {useZustandStore} from "@/hooks/stateStore";

/**
 * This function renders the view invoice additional information.
 * @returns The JSX for the view invoice additional information.
 */
export const InvoiceInformation = () => {
  const invoice = useZustandStore((state) => state.selectedInvoice);
  const {additionalMetadata, userIdentifier, lastUpdatedAt} = invoice;

  return (
    <section>
      <div className='flex border-b border-gray-200 py-2'>
        <span>Invoice Last Analysis</span>
        <span className='ml-auto dark:text-gray-300'>{new Date(lastUpdatedAt).toUTCString()}</span>
      </div>
      <div className='flex border-b border-gray-200 py-2'>
        <span>User Identifier</span>
        <span className='ml-auto dark:text-gray-300'>{userIdentifier}</span>
      </div>
      {additionalMetadata.map((kvPair, index) => (
        <div
          key={index}
          className='flex border-b border-gray-200 py-2'>
          <span>{Object.keys(kvPair)[index]}</span>
          <span className='ml-auto dark:text-gray-300'>{String(Object.values(kvPair)[index])}</span>
        </div>
      ))}
      <div>
        <center className='mx-auto my-4'>
          <em>If you feel that some of the details are not correct, feel free to edit the invoice.</em>
        </center>
      </div>
    </section>
  );
};
