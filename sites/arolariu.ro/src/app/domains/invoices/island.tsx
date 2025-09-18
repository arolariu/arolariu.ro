import {RichText} from "@/presentation/Text";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const Steps = () => {
  const t = useTranslations("Domains.services.invoices.service.main-page.steps");

  const steps = [
    {
      title: t("step-1.title"),
      description: t("step-1.description"),
      icon: (
        <svg
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2'
          className='h-5 w-5'
          viewBox='0 0 24 24'>
          <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
        </svg>
      ),
    },
    {
      title: t("step-2.title"),
      description: t("step-2.description"),
      icon: (
        <svg
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2'
          className='h-5 w-5'
          viewBox='0 0 24 24'>
          <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
        </svg>
      ),
    },
    {
      title: t("step-3.title"),
      description: t("step-3.description"),
      icon: (
        <svg
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2'
          className='h-5 w-5'
          viewBox='0 0 24 24'>
          <circle
            cx='12'
            cy='5'
            r='3'
          />
          <path d='M12 22V8M5 12H2a10 10 0 0020 0h-3' />
        </svg>
      ),
    },
    {
      title: t("step-4.title"),
      description: t("step-4.description"),
      icon: (
        <svg
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2'
          className='h-5 w-5'
          viewBox='0 0 24 24'>
          <path
            d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00
          -4 4v2'
          />
          <circle
            cx='12'
            cy='7'
            r='4'
          />
        </svg>
      ),
    },
    {
      title: t("step-5.title"),
      description: t("step-5.description"),
      icon: (
        <svg
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2'
          className='h-5 w-5'
          viewBox='0 0 24 24'>
          <path d='M22 11.08V12a10 10 0 11-5.93-9.14' />
          <path d='M22 4L12 14.01l-3-3' />
        </svg>
      ),
    },
  ];

  return (
    <>
      {steps.map((step) => (
        <div
          className='relative flex pb-12'
          key={step.title}>
          <div className='absolute inset-0 flex h-full w-10 items-center justify-center'>
            {step !== steps.at(-1) && <div className='pointer-events-none h-full w-1 bg-gray-200' />}
          </div>
          <div className='relative z-10 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500'>
            {step.icon}
          </div>
          <div className='grow pl-4'>
            <h2 className='title-font mb-1 text-sm font-medium tracking-wider underline underline-offset-2'>{step.title}</h2>
            <p className='leading-relaxed'>{step.description}</p>
          </div>
        </div>
      ))}
    </>
  );
};

type Props = {
  isAuthenticated: boolean;
};

/**
 * The invoice domain screen, which is the main page for the invoice domain.
 * It contains a description of the invoice domain, a call to action button,
 * and a section to view invoices if the user is authenticated.
 * @returns The invoice domain screen, which is the main page for the invoice domain.
 */
export default function RenderInvoiceDomainScreen({isAuthenticated}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.service.main-page");

  return (
    <main className='px-5 py-24'>
      <section className='flex flex-col items-center justify-center justify-items-center text-center'>
        <Image
          src='/images/domains/invoices/invoice-top.svg'
          alt='Invoice top SVG'
          width='500'
          height='500'
          className='2xsm:pt-4 object-fill object-center md:mx-auto md:h-full lg:h-1/2'
          priority
        />
        <div className='mt-2 w-full lg:w-2/3'>
          <h1 className='mb-4 bg-linear-to-r from-pink-400 to-red-600 bg-clip-text text-3xl font-medium text-transparent sm:text-4xl'>
            {t("title")}
          </h1>
          <article className='mb-8 leading-relaxed'>
            <RichText
              sectionKey='Domains.services.invoices.service.main-page'
              textKey='description'
            />
          </article>
          <div className='flex flex-col items-center justify-center justify-items-center gap-4 md:flex-row'>
            <Link
              href='/domains/invoices/create-invoice'
              className='rounded border-0 bg-indigo-600 px-6 py-2 text-lg text-white hover:bg-indigo-700 focus:outline-hidden'>
              {t("callToAction")}
            </Link>

            {/* If user is authenticated, show the `My Receipts` button too. */}
            {Boolean(isAuthenticated) && (
              <Link
                href='/domains/invoices/view-invoices'
                className='rounded border-0 bg-gray-100 px-6 py-2 text-lg text-gray-700 hover:bg-gray-200 focus:outline-hidden'>
                {t("showInvoices")}
              </Link>
            )}
          </div>
        </div>
      </section>
      <section className='flex flex-col items-center justify-center justify-items-center pt-16 md:flex-row'>
        <div className='md:w-1/2 md:py-6 md:pr-10 lg:w-2/5'>
          <Steps />
        </div>
        <div>
          <Image
            src='/images/domains/invoices/invoice-bottom.svg'
            alt='Invoice bottom SVG'
            width='500'
            height='500'
            className='2xsm:pt-4 w-full object-fill object-center md:mx-auto md:h-full lg:h-1/2'
          />
        </div>
      </section>
    </main>
  );
}
