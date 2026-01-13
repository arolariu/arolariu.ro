"use client";

import {useTranslations} from "next-intl";

/**
 * This component is used to display a message when the invoice is loading.
 * @returns The JSX for the loading invoice view.
 */
export default function LoadingInvoice({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  const t = useTranslations("Domains.services.invoices.service.states.loading");

  return (
    <section className='flex flex-row flex-nowrap'>
      <article className='2xsm:w-full mx-auto flex-initial lg:w-1/2'>
        <h1 className='text-center text-2xl font-bold'>{t("title")}</h1>
        <p className='text-center'>{t("description", {invoiceIdentifier})}</p>
      </article>
    </section>
  );
}
