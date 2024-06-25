/** @format */

import EULA from "@/components/EULA";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {fonts} from "@/fonts";
import {getLocale} from "next-intl/server";
import {cookies} from "next/headers";
import {Suspense, type ReactNode} from "react";
import "./globals.css";
import Loading from "./loading";
import ContextProviders from "./providers";

export {metadata} from "@/metadata";

/**
 * The root layout.
 * @returns The root layout.
 */
export default async function RootLayout({children}: Readonly<{children: ReactNode}>) {
  const locale = await getLocale();
  const eulaAccepted = cookies().get("eula-accepted")?.value === "true";

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={fonts[0]?.className}
      dir='ltr'>
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
