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
export default function AuthCard({title, description, ctaText, cardType}: Readonly<Props>): React.JSX.Element {
  return (
    <article>
      <div className='flex h-64 items-center justify-center overflow-hidden rounded-lg'>
        <Image
          src={`/images/auth/${cardType}.svg`}
          alt=''
          aria-hidden
          width='300'
          height='500'
          className='object-fill object-center'
        />
      </div>
      <span className='mt-6 mb-3 text-2xl font-medium'>{title}</span>
      <p className='text-base leading-relaxed'>{description}</p>
      <Link
        href={`/auth/${cardType}/`}
        className='mt-6 inline-flex w-full items-center justify-center rounded-lg border border-indigo-500 bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none'>
        {ctaText}
      </Link>
    </article>
  );
}
