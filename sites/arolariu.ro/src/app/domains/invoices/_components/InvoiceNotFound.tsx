"use client";

import {useTranslations} from "next-intl";

/**
 * This component is used to display a message when an invoice is not found.
 * @returns The JSX for the invoice not found view.
 */
export default function InvoiceNotFound({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  const t = useTranslations("Domains.services.invoices.service.states.notFound");

  return (
    <section className='flex flex-row flex-nowrap'>
      <article className='2xsm:w-full mx-auto flex-initial lg:w-1/2'>
        <h1 className='text-center text-2xl font-bold'>{t("title")}</h1>
        <p className='text-center'>{t("description", {invoiceIdentifier})}</p>
      </article>
    </section>
  );
}
