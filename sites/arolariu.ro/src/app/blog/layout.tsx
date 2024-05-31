/** @format */

import {Suspense, type ReactNode} from "react";
import Loading from "./loading";

/**
 * The blog layout.
 * @returns The blog layout.
 */
export default async function BlogLayout({children}: Readonly<{children: ReactNode}>) {
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-4 px-5 py-24 text-center'>
      <Suspense fallback={<Loading />}>{children}</Suspense>
      <section className='my-16 pb-32'>
        <h2 className='text-3xl font-bold'>Thank you.</h2>
      </section>
    </main>
  );
}
