/** @format */

import Image from "next/image";
import Link from "next/link";

type Props = {
  title: string;
  description: string;
  imageUrl: string;
  linkTo: string;
  callToAction: string;
};

/**
 * The card component for the domain services section.
 * This card wraps a service and displays its title, description, and a call to action button.
 * @returns The domain service card, with the service title, description, and call to action button.
 */
export default function DomainServiceCard({title, description, imageUrl, linkTo, callToAction}: Readonly<Props>) {
  return (
    <section className='mb-6 max-w-80 rounded-xl border p-4 sm:mb-0'>
      <article className='h-64 overflow-hidden rounded-lg'>
        <Image
          alt='content'
          className='h-full w-full object-cover object-center'
          src={imageUrl}
          width='600'
          height='400'
        />
      </article>
      <article>
        <h2 className='title-font mt-5 text-center text-xl font-medium dark:text-gray-300'>{title}</h2>
        <p className='mt-2 text-base italic leading-relaxed'>{description}</p>
        <Link
          href={linkTo}
          className='mt-3 inline-flex items-center text-indigo-500'>
          {callToAction}
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
  );
}
