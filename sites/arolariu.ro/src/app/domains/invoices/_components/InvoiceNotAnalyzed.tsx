"use client";

import {useUserInformation} from "@/hooks";
import analyzeInvoice from "@/lib/actions/invoices/analyzeInvoice";
import {toast} from "@arolariu/components";
import {useRouter} from "next/navigation";
import {useCallback} from "react";

/**
 * Component that renders the invoice not analyzed view.
 * @returns The JSX for the invoice not analyzed view.
 */
export default function InvoiceNotAnalyzed({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  const {userInformation} = useUserInformation();
  const router = useRouter();

  const handleAnalysis = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const authToken = userInformation?.userJwt;
      await analyzeInvoice(invoiceIdentifier, authToken!);
      toast("Invoice analyzed", {
        description: `The invoice with the identifier ${invoiceIdentifier} has been analyzed.`,
        duration: 5000,
        action: {
          label: "View Invoice",
          onClick: () => {
            router.push(`/domains/invoices/view-invoice/${invoiceIdentifier}`);
          },
        },
        icon: <span className='text-white'>✔️</span>,
      });
    },
    [invoiceIdentifier, userInformation, router],
  );

  return (
    <section className='flex flex-col flex-nowrap items-center justify-center justify-items-center'>
      <article className='2xsm:w-full mx-auto flex-initial lg:w-1/2'>
        <h1 className='text-center text-2xl font-bold'>Invoice {invoiceIdentifier} has not been analyzed!</h1>
      </article>
      <article>
        <p className='text-center'>The invoice with the identifier {invoiceIdentifier} has not been analyzed yet.</p>
        <div className='mx-auto flex flex-nowrap items-center justify-center'>
          <button
            type='button'
            className='mx-auto rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700'
            onClick={handleAnalysis}>
            Analyze Invoice
          </button>
          <button
            type='button'
            className='mx-auto rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-700'>
            Delete Invoice
          </button>
        </div>
      </article>
    </section>
  );
}
