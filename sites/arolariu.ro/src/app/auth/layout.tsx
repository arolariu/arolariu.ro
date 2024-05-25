/** @format */

import {ReactNode, Suspense} from "react";
import Loading from "./loading";

/**
 * The layout for the authentication pages.
 * @returns The layout for the authentication pages.
 */
export default async function AuthRootLayout({children}: Readonly<{children: ReactNode}>) {
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-4 px-5 py-24 text-center lg:flex-row lg:gap-8'>
      <Suspense fallback={<Loading />}>{children}</Suspense>
    </main>
  );
}
