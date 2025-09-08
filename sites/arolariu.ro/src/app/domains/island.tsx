/** @format */

"use client";

import {RichText} from "@/presentation/Text";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";

/**
 * The Domains screen, client side rendered.
 * It displays the services available for the domain.
 * @returns The Domains home screen.
 */
export default function RenderDomainsScreen(): React.JSX.Element {
  const t = useTranslations("Domains");

  return (
    <main className='container mx-auto px-5 py-24'>
      <section className='flex flex-col'>
        <div className='h-1 overflow-hidden rounded bg-gray-200'>
          <div className='h-full w-24 bg-indigo-700' />
        </div>
        <div className='mb-12 flex flex-col flex-wrap py-6 sm:flex-row'>
          <h1 className='align-center mb-2 justify-items-center bg-linear-to-r from-pink-400 to-red-600 bg-clip-text text-center text-5xl font-bold text-transparent sm:mb-0 sm:w-2/5'>
            {t("title")}
          </h1>
          <article className='2xsm:mt-8 pl-0 leading-relaxed sm:w-3/5 sm:pl-10 md:mt-0'>
            <RichText
              sectionKey='Domains'
              textKey='subtitle'
            />
          </article>
        </div>
      </section>

      <section className='2xsm:items-center 2xsm:justify-center 2xsm:justify-items-center flex flex-row flex-wrap gap-4 md:items-baseline md:justify-normal md:justify-items-start'>
        {/* Service Card for IMS. */}
        <section className='mb-6 max-w-80 rounded-xl border p-4 sm:mb-0'>
          <article className='h-64 overflow-hidden rounded-lg'>
            <Image
              alt='content'
              className='h-full w-full object-cover object-center'
              src='/images/domains/invoice-management-system.png'
              width='600'
              height='400'
            />
          </article>
          <article>
            <h2 className='title-font mt-5 text-center text-xl font-medium dark:text-gray-300'>{t("services.invoices.card.title")}</h2>
            <p className='mt-2 text-base leading-relaxed italic'>{t("services.invoices.card.description")}</p>
            <Link
              href='/domains/invoices'
              className='mt-3 inline-flex items-center text-indigo-500'>
              {t("services.callToAction")}
              <svg
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className='ml-2 h-4 w-4'
                viewBox='0 0 24 24'>
                <path d='M5 12h14M12 5l7 7-7 7' />
              </svg>
            </Link>
          </article>
        </section>
      </section>
    </main>
  );
}
