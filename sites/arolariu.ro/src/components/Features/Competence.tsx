/** @format */

import {ReactNode} from "react";

interface Props {
  title: string;
  description: string;
  children: ReactNode;
}

/**
 * The competence component.
 * @returns The competence component.
 */
export default function Competence({title, description, children}: Readonly<Props>) {
  return (
    <div className='mx-auto my-10 flex max-w-7xl flex-col items-center border-b border-gray-700 pb-10 dark:border-gray-200 sm:flex-row'>
      <div className='inline-flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black sm:mr-10'>
        {children}
      </div>
      <div className='mt-6 text-center sm:mt-0 sm:text-left'>
        <h2 className='text-2xl'>{title}</h2>
        <p className='mt-4'>{description}</p>
      </div>
    </div>
  );
}
