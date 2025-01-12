/** @format */

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {FontContextProvider} from "@/contexts/FontContext";
import {NextIntlClientProvider as TranslationProvider} from "next-intl";
import {getLocale, getMessages} from "next-intl/server";
import {Suspense, type ReactNode} from "react";
import "./globals.css";
import Loading from "./loading";
import ContextProviders from "./providers";
import {HtmlWrapper} from "./wrapper";

export {metadata} from "@/metadata";

/**
 * The root layout.
 * @returns The root layout.
 */
export default async function RootLayout({children}: Readonly<{children: ReactNode}>) {
  const locale = await getLocale();
  const messages = await getMessages({locale});

  return (
    <FontContextProvider>
      <HtmlWrapper locale={locale}>
        <TranslationProvider messages={messages}>
          <ContextProviders>
            <Header />
            <Suspense fallback={<Loading />}>{children}</Suspense>
            <Footer />
          </ContextProviders>
        </TranslationProvider>
      </HtmlWrapper>
    </FontContextProvider>
  );
}
