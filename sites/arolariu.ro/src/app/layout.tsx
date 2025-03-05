/** @format */

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {FontContextProvider as FontProvider} from "@/contexts/FontContext";
import {enUS, roRO} from "@clerk/localizations";
import {ClerkProvider as AuthProvider} from "@clerk/nextjs";
import {NextIntlClientProvider as TranslationProvider} from "next-intl";
import {getLocale, getMessages} from "next-intl/server";
import {Suspense, type ReactNode} from "react";
import Loading from "./loading";
import ContextProviders from "./providers";
import HtmlWrapper from "./wrapper";

import "@arolariu/components/styles.css";
import "./globals.css";
export {metadata} from "@/metadata";

/**
 * The root layout of the website that wraps the entire app.
 * @returns The root layout of the website.
 */
export default async function RootLayout({children}: Readonly<{children: ReactNode}>) {
  const locale = await getLocale();
  const messages = await getMessages({locale});
  const authLocale = locale === "ro" ? roRO : enUS;

  return (
    <AuthProvider localization={authLocale}>
      <FontProvider>
        <HtmlWrapper locale={locale}>
          <TranslationProvider messages={messages}>
            <ContextProviders>
              <Header />
              <Suspense fallback={<Loading />}>{children}</Suspense>
              <Footer />
            </ContextProviders>
          </TranslationProvider>
        </HtmlWrapper>
      </FontProvider>
    </AuthProvider>
  );
}
