/** @format */

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {fonts} from "@/fonts";
import {NextIntlClientProvider as TranslationProvider} from "next-intl";
import {getLocale, getMessages} from "next-intl/server";
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
  const messages = await getMessages({locale});

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={fonts[0]?.className}
      dir='ltr'>
      <body className='bg-white text-black dark:bg-black dark:text-white'>
        <TranslationProvider messages={messages}>
          <ContextProviders>
            <Header />
            <Suspense fallback={<Loading />}>{children}</Suspense>
            <Footer />
          </ContextProviders>
        </TranslationProvider>
      </body>
    </html>
  );
}
