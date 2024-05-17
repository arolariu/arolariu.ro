import fetchInvoice from "@/lib/invoices/fetchInvoice";
import {type Metadata} from "next";
import Image from "next/image";
import RenderViewInvoiceScreen from "./island";

interface Props {
  params: {id: string};
}

export const metadata: Metadata = {
  title: "View Invoice",
  description: "View your uploaded invoice on `arolariu.ro`.",
};

/**
 * The view invoice page.
 * @returns Render the view invoice page.
 */
export default async function ViewInvoicePage({params}: Readonly<Props>) {
  const invoice = await fetchInvoice(params.id);

  if (!invoice) {
    return (
      <Image
        src='/images/domains/invoices/403.svg'
        alt='Forbidden SVG'
        width='500'
        height='500'
      />
    );
  }
  return (
    <main className='overflow-hidden px-5 py-24'>
      <RenderViewInvoiceScreen invoice={invoice} />
    </main>
  );
}
