/** @format */

import {type Metadata} from "next";
import DomainServiceCard from "./_components/DomainServiceCard";

export const metadata: Metadata = {
  title: "Domain Space Services",
  description:
    "Domain Space Services are services that are offered to visitors and members of the `arolariu.ro` domain space",
};

/**
 * The domains homepage.
 * @returns The domains homepage.
 */
export default function DomainsHomepage() {
  return (
    <main className='container mx-auto px-5 py-24'>
      <section className='flex flex-col'>
        <div className='h-1 overflow-hidden rounded bg-gray-200'>
          <div className='h-full w-24 bg-indigo-500' />
        </div>
        <div className='mb-12 flex flex-col flex-wrap py-6 sm:flex-row'>
          <h1 className='align-center mb-2 justify-items-center bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-center text-5xl font-bold text-transparent sm:mb-0 sm:w-2/5'>
            Domain Space Services
          </h1>
          <article className='pl-0 leading-relaxed 2xsm:mt-8 sm:w-3/5 sm:pl-10 md:mt-0'>
            The <code className='font-extrabold text-blue-400'>arolariu.ro</code> platform offers a wide range of
            services under it&apos;s umbrella. <br />
            Most of the services require that you have an account created on this platform, so that your data can be
            safely synchronized between all of the domain services.
            <br />
            <br />
            Here you can see a showcase of all domain services that are available for exploration.
          </article>
        </div>
      </section>

      <section className='flex flex-row flex-wrap 2xsm:items-center 2xsm:justify-center 2xsm:justify-items-center md:items-baseline md:justify-normal md:justify-items-start'>
        <DomainServiceCard
          title='Invoice Management System'
          description='This domain space service assists with the digital transformation of physical receipts. It allows users to upload receipts, and get carefully-crafted insights into their spending habits.'
          linkTo='/domains/invoices'
          imageUrl='/images/domains/invoice-management-system.png'
        />
      </section>
    </main>
  );
}
