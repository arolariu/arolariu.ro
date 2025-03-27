/** @format */

import {type ReactNode, Suspense} from "react";
import Loading from "./loading";

/**
 * The layout for the invoices pages.
 * @returns The layout for the invoices pages.
 */
export default async function AcknowledgementsLayout({children}: Readonly<{children: ReactNode}>) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}
