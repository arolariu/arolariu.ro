/** @format */

import {Suspense, type ReactNode} from "react";
import Loading from "./loading";

/**
 * The layout for the about pages.
 * @returns The layout for the about pages.
 */
export default async function AboutRootLayout({children}: Readonly<{children: ReactNode}>) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}
