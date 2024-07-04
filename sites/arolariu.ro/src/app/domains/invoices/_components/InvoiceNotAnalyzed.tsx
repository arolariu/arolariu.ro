/** @format */

"use client";

import {ToastAction} from "@/components/ui/toast";
import {useToast} from "@/components/ui/use-toast";
import useUserInformation from "@/hooks/useUserInformation";
import analyzeInvoice from "@/lib/actions/invoices/analyzeInvoice";
import {useRouter} from "next/navigation";

/**
 * Component that renders the invoice not analyzed view.
 * @returns The JSX for the invoice not analyzed view.
 */
export default function InvoiceNotAnalyzed({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  const {toast} = useToast();
  const router = useRouter();
  const {userInformation} = useUserInformation();
  const handleAnalysis = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    await analyzeInvoice(invoiceIdentifier, userInformation!);
    toast({
      title: "Invoice Analyzed",
      description: `The invoice with the identifier ${invoiceIdentifier} has been analyzed.`,
      duration: 5000,
      action: (
        <ToastAction
          altText='View invoice'
          onClick={() => {
            router.push(`/domains/invoices/view-invoice/${invoiceIdentifier}`);
            router.refresh();
          }}>
          View invoice
        </ToastAction>
      ),
    });
  };

  return (
    <section className='flex flex-col flex-nowrap items-center justify-center justify-items-center'>
      <article className='mx-auto flex-initial 2xsm:w-full lg:w-1/2'>
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
