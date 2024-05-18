/** @format */

import {PropsWithChildren, Suspense} from "react";
import Loading from "./loading";

/**
 * The layout for the invoices pages.
 * @returns The layout for the invoices pages.
 */
export default async function InvoicesRootLayout({children}: Readonly<PropsWithChildren<{}>>) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}
