/** @format */

import Image from "next/image";
import Link from "next/link";

export default function RenderInvoiceDomainScreen({isAuthenticated}: Readonly<{isAuthenticated: boolean}>) {
  return (
    <main className='px-5 py-24'>
      <section className='flex flex-col items-center justify-center justify-items-center text-center'>
        <Image
          src='/images/domains/invoices/invoice-top.svg'
          alt='Invoice top SVG'
          width='500'
          height='500'
          className='w-full object-fill object-center'
          priority
        />
        <div className='mt-2 w-full lg:w-2/3'>
          <h1 className='mb-4 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-3xl font-medium text-transparent sm:text-4xl'>
            Turn your paper receipts into powerful digital knowledge.
          </h1>
          <article className='mb-8 leading-relaxed'>
            Receipts are great for keeping your own accounting. However, what if you could upload these receipts
            somewhere, and get powerful insights into your habits? What if you could automatically get a list of all the
            products you bought in the last year?
            <br />
            <br />
            Unleash the power of our platform!
            <br />
            Throw away the Excel tables and hop on the digital train now!
          </article>
          <div className='flex flex-col items-center justify-center justify-items-center gap-4 md:flex-row'>
            <Link
              href='/domains/invoices/create-invoice'
              className='rounded border-0 bg-indigo-500 px-6 py-2 text-lg text-white hover:bg-indigo-600 focus:outline-none'>
              Upload receipt
            </Link>

            {/* If user is authenticated, show the `My Receipts` button too. */}
            {Boolean(isAuthenticated) && (
              <Link
                href='/domains/invoices/view-invoices'
                className='rounded border-0 bg-gray-100 px-6 py-2 text-lg text-gray-700 hover:bg-gray-200 focus:outline-none'>
                My receipts
              </Link>
            )}
          </div>
        </div>
      </section>
      <section className='flex flex-col items-center justify-center justify-items-center pt-16 md:flex-row'>
        <div className='md:w-1/2 md:py-6 md:pr-10 lg:w-2/5'>
          <div className='relative flex pb-12'>
            <div className='absolute inset-0 flex h-full w-10 items-center justify-center'>
              <div className='pointer-events-none h-full w-1 bg-gray-200' />
            </div>
            <div className='relative z-10 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500'>
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
            </div>
            <div className='flex-grow pl-4'>
              <h2 className='title-font mb-1 text-sm font-medium tracking-wider dark:text-gray-300'>
                STEP 1 - Onboard yourself
              </h2>
              <p className='leading-relaxed'>
                Create an account on our platform, so that you can store and manage your own receipts securely. We
                adhere to the best industry standards in terms of security. Your receipt information is{" "}
                <strong
                  className='tooltip text-red-600 2xsm:tooltip-bottom md:tooltip-right'
                  data-tip='The receipt information is only accessible to you. You can make your invoice public, so that others can see the data on it.'>
                  <span className='2xsm:text-md font-mono text-lg'>safe</span>
                </strong>
                .
              </p>
            </div>
          </div>
          <div className='relative flex pb-12'>
            <div className='absolute inset-0 flex h-full w-10 items-center justify-center'>
              <div className='pointer-events-none h-full w-1 bg-gray-200' />
            </div>
            <div className='relative z-10 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500'>
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
            </div>
            <div className='flex-grow pl-4'>
              <h2 className='title-font mb-1 text-sm font-medium tracking-wider text-gray-300'>
                STEP 2 - Start your journey
              </h2>
              <p className='leading-relaxed'>
                Upload your paper receipt. The system will then perform the full analysis. We try as much as possible to
                have a fully automated process, but sometimes we may need your help.
              </p>
            </div>
          </div>
          <div className='relative flex pb-12'>
            <div className='absolute inset-0 flex h-full w-10 items-center justify-center'>
              <div className='pointer-events-none h-full w-1 bg-gray-200' />
            </div>
            <div className='relative z-10 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500'>
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
            </div>
            <div className='flex-grow pl-4'>
              <h2 className='title-font mb-1 text-sm font-medium tracking-wider text-gray-300'>
                STEP 3 - Explore the digital receipt
              </h2>
              <p className='leading-relaxed'>
                Delve into the analysis provided by us. You can download the full analysis report as a PDF file for your
                own records.
              </p>
            </div>
          </div>
          <div className='relative flex pb-12'>
            <div className='absolute inset-0 flex h-full w-10 items-center justify-center'>
              <div className='pointer-events-none h-full w-1 bg-gray-200' />
            </div>
            <div className='relative z-10 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500'>
              <svg
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className='h-5 w-5'
                viewBox='0 0 24 24'>
                <path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' />
                <circle
                  cx='12'
                  cy='7'
                  r='4'
                />
              </svg>
            </div>
            <div className='flex-grow pl-4'>
              <h2 className='title-font mb-1 text-sm font-medium tracking-wider text-gray-300'>
                STEP 4 - Gather powerful knowledge
              </h2>
              <p className='leading-relaxed'>
                Augment your analysis with our AI-powered insights. Collect knowledge into your purchase habits and
                discover new recipes specifically crafted from your day-to-day shopping list.
              </p>
            </div>
          </div>
          <div className='relative flex pb-12'>
            <div className='relative z-10 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500'>
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
            </div>
            <div className='flex-grow pl-4'>
              <h2 className='title-font mb-1 text-sm font-medium tracking-wider text-gray-300'>
                STEP 5 - Offer your feedback
              </h2>
              <p className='leading-relaxed'>
                We aim to create one of the best, open-source receipt-scanning platform. We would love to hear your
                feedback on how we can improve our platform.
              </p>
            </div>
          </div>
        </div>
        <div>
          <Image
            src='/images/domains/invoices/invoice-bottom.svg'
            alt='Invoice bottom SVG'
            width='500'
            height='500'
            className='w-full object-fill object-center 2xsm:pt-4 md:mx-auto md:h-full lg:h-1/2'
          />
        </div>
      </section>
    </main>
  );
}
