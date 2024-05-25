/** @format */

import {ReactNode, Suspense} from "react";
import Loading from "./loading";

/**
 * The layout for the about pages.
 * @returns The layout for the about pages.
 */
export default async function AboutRootLayout({children}: Readonly<{children: ReactNode}>) {
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center px-5 pt-24 text-center'>
      <Suspense fallback={<Loading />}>{children}</Suspense>
      <section className='my-16 pb-32'>
        <h2 className='text-3xl font-bold'>Thank you.</h2>
      </section>
    </main>
  );
}
