/** @format */

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {FontContextProvider as FontProvider} from "@/contexts/FontContext";
import {enUS, roRO} from "@clerk/localizations";
import {ClerkProvider as AuthProvider} from "@clerk/nextjs";
import {NextIntlClientProvider as TranslationProvider} from "next-intl";
import {getLocale} from "next-intl/server";
import {Suspense, type ReactNode} from "react";
import Loading from "./loading";
import ContextProviders from "./providers";
import HtmlWrapper from "./wrapper";

import {getCookie} from "@/lib/actions/cookies.action";
import "@arolariu/components/styles.css";
import {Commander} from "../components/Commander";
import Eula from "./EULA";
import "./globals.css";

export {metadata} from "@/metadata";

/**
 * The root layout of the website that wraps the entire app.
 * @returns The root layout of the website.
 */
export default async function RootLayout({children}: Readonly<{children: ReactNode}>) {
  const locale = await getLocale();
  const eulaCookie = await getCookie("eula-accepted");

  return (
    <AuthProvider localization={locale === "ro" ? roRO : enUS}>
      <FontProvider>
        <HtmlWrapper locale={locale}>
          <TranslationProvider>
            <ContextProviders>
              <Header />
              <Suspense fallback={<Loading />}>{eulaCookie ? children : <Eula locale={locale} />}</Suspense>
              <Commander />
              <Footer />
            </ContextProviders>
          </TranslationProvider>
        </HtmlWrapper>
      </FontProvider>
    </AuthProvider>
  );
}
