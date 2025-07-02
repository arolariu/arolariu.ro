/** @format */

import {useTranslations} from "next-intl";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";

/**
 * The subtitle for the invoice upload page.
 * @returns The JSX for the invoice upload page subtitle.
 */
export default function InvoiceSubtitle() {
  const t = useTranslations("Domains.services.invoices.service.create-page");
  const {scans} = useInvoiceCreator();

  const scansLength: number = scans.length;
  const titleText: string = scansLength === 0 ? t("title__before") : t("title__after");
  const subtitleText: string = scansLength === 0 ? t("subtitle__before") : t("subtitle__after");

  return (
    <div>
      <h1 className='bg-linear-to-r from-pink-400 to-red-600 bg-clip-text text-xl text-transparent'>{titleText}</h1>
      <p className='mx-auto text-base leading-relaxed lg:w-2/3'>{subtitleText}</p>
    </div>
  );
}
