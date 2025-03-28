/** @format */

"use client";

import {useTranslations} from "next-intl";
import DomainServiceCard from "./_components/DomainServiceCard";

/**
 * The Domains screen, client side rendered.
 * It displays the services available for the domain.
 * @returns The Domains home screen.
 */
export default function RenderDomainsScreen() {
  const t = useTranslations("Domains");

  return (
    <main className='container mx-auto px-5 py-24'>
      <section className='flex flex-col'>
        <div className='h-1 overflow-hidden rounded bg-gray-200'>
          <div className='h-full w-24 bg-indigo-700' />
        </div>
        <div className='mb-12 flex flex-col flex-wrap py-6 sm:flex-row'>
          <h1 className='align-center mb-2 justify-items-center bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-center text-5xl font-bold text-transparent sm:mb-0 sm:w-2/5'>
            {t("title")}
          </h1>
          <article className='pl-0 leading-relaxed 2xsm:mt-8 sm:w-3/5 sm:pl-10 md:mt-0'>
            {t.rich("subtitle", {
              br: (chunks: React.ReactNode) => (
                <>
                  <br />
                  {chunks}
                </>
              ),
              code: (chunks: React.ReactNode) => <code className='font-extrabold text-blue-400'>{chunks}</code>,
            })}
          </article>
        </div>
      </section>

      <section className='flex flex-row flex-wrap gap-4 2xsm:items-center 2xsm:justify-center 2xsm:justify-items-center md:items-baseline md:justify-normal md:justify-items-start'>
        <DomainServiceCard
          title={t("services.invoices.card.title")}
          description={t("services.invoices.card.description")}
          linkTo='/domains/invoices'
          imageUrl='/images/domains/invoice-management-system.png'
          callToAction={t("services.callToAction")}
        />
      </section>
    </main>
  );
}
