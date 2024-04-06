import Link from "next/link";
import {ReactNode} from "react";

interface Props {
  link: string;
  title: string;
  children: ReactNode;
  description: string;
}

/**
 * The feature component
 * @returns The feature component
 */
export default function Feature({link, title, children, description}: Readonly<Props>) {
  return (
    <Link
      className='block rounded-xl border border-gray-800 p-8 shadow-xl transition hover:border-pink-500/10 hover:shadow-pink-500/10'
      href={link}
      target='_blank'>
      <div>
        {children} <span className='ml-2 text-xl'>{title}</span>
      </div>
      <p className='text-md mt-3 text-gray-500'>{description}</p>
    </Link>
  );
}
