/** @format */

import Image from "next/image";
import Link from "next/link";

interface Props {
  title: string;
  description: string;
  ctaText: string;
  cardType: "sign-up" | "sign-in";
}

/**
 * The card component for the authentication pages.
 * @returns The authentication card.
 */
export default function AuthCard({title, description, ctaText, cardType}: Readonly<Props>) {
  return (
    <article>
      <div className='flex h-64 items-center justify-center overflow-hidden rounded-lg'>
        <Image
          src={`/images/auth/${cardType}.svg`}
          alt='Sign up SVG'
          width='300'
          height='500'
          className='object-fill object-center'
        />
      </div>
      <h2 className='title-font mb-3 mt-6 text-2xl font-medium'>{title}</h2>
      <p className='text-base leading-relaxed'>{description}</p>
      <Link
        href={`/auth/${cardType}/`}
        className='btn btn-primary mt-6 rounded border-0 bg-indigo-600 p-4 text-white hover:bg-indigo-700 focus:outline-none'>
        {ctaText}
      </Link>
    </article>
  );
}
