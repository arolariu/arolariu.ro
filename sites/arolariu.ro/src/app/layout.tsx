import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {getCookie} from "@/lib/actions/cookies";
import {getLocale} from "next-intl/server";
import {Suspense} from "react";
import Eula from "./EULA";
import Loading from "./loading";
import ContextProviders from "./providers";

import Tracking from "./tracking";

// @ts-ignore -- css file has no typings.
import "@arolariu/components/styles.css";

// @ts-ignore -- scss file has no typings.
import "./globals.scss";

// @ts-ignore -- scss file has no typings.
import "@/styles/main.scss";

export {metadata} from "@/metadata";

/**
 * The root layout of the website that wraps the entire app.
 * @returns The root layout of the website.
 */
export default async function RootLayout(props: Readonly<LayoutProps<"/">>): Promise<React.JSX.Element> {
  const locale = await getLocale();
  const eulaCookie = await getCookie("eula-accepted");

  return (
    <html
      suppressHydrationWarning
      lang={locale}
      dir='ltr'>
      <body>
        <ContextProviders locale={locale}>
          <Header />
          <Suspense fallback={<Loading />}>{eulaCookie ? props.children : <Eula locale={locale} />}</Suspense>
          <Footer />
          {Boolean(eulaCookie) && <Tracking />}
        </ContextProviders>
      </body>
    </html>
  );
}
