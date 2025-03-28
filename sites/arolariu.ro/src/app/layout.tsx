/** @format */

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {getLocale} from "next-intl/server";
import {Suspense, type ReactNode} from "react";
import Loading from "./loading";
import HtmlWrapper from "./wrapper";

import {getCookie} from "@/lib/actions/cookies.action";
import "@arolariu/components/styles.css";
import Eula from "./EULA";
import "./globals.css";
import ContextProviders from "./providers";

export {metadata} from "@/metadata";

/**
 * The root layout of the website that wraps the entire app.
 * @returns The root layout of the website.
 */
export default async function RootLayout({children}: Readonly<{children: ReactNode}>) {
  const locale = await getLocale();
  const eulaCookie = await getCookie("eula-accepted");

  return (
    <ContextProviders locale={locale}>
      <HtmlWrapper locale={locale}>
        <Header />
        <Suspense fallback={<Loading />}>{eulaCookie ? children : <Eula locale={locale} />}</Suspense>
        <Footer />
      </HtmlWrapper>
    </ContextProviders>
  );
}
