/** @format */

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {fonts} from "@/fonts";
import {getLocale} from "next-intl/server";
import dynamic from "next/dynamic";
import {cookies} from "next/headers";
import {Suspense, type ReactNode} from "react";
import "./globals.css";
import Loading from "./loading";
import ContextProviders from "./providers";
import Tracking from "./tracking";

export {metadata} from "@/metadata";

/** Lazy loading the EULA to prevent LCP issues. */
const EULA = dynamic(() => import("@/app/_components/EULA/EULA"));

/**
 * The root layout.
 * @returns The root layout.
 */
export default async function RootLayout({children}: Readonly<{children: ReactNode}>) {
  const eulaAccepted = cookies().get("eula-accepted")?.value === "true";
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={fonts[0]?.className}
      dir='ltr'>
      {Boolean(eulaAccepted) && <Tracking />}
      <body className='bg-white text-black dark:bg-black dark:text-white'>
        <ContextProviders>
          <Header />
          <Suspense fallback={<Loading />}>{eulaAccepted ? children : <EULA />}</Suspense>
          <Footer />
        </ContextProviders>
      </body>
    </html>
  );
}
