import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {getCookie} from "@/lib/actions/cookies";
import {getWebsiteFeatureFlags} from "@/lib/config/featureFlags.server";
import type {AbstractIntlMessages} from "next-intl";
import {getLocale, getMessages} from "next-intl/server";
import {Suspense} from "react";
import Eula from "./EULA";
import Loading from "./loading";
import ContextProviders from "./providers";

import Tracking from "./tracking";

// @ts-ignore -- css file has no typings.
import "@arolariu/components/styles.css";

// @ts-ignore -- scss file has no typings.
import "./globals.scss";

export {metadata} from "@/metadata";

/**
 * The root layout of the website that wraps the entire app.
 *
 * @remarks
 * Feature flags are evaluated **server-side** here using the exp bootstrap
 * endpoint.  Only the derived {@link WebsiteFeatureFlags} booleans are forwarded
 * to {@link ContextProviders} — the raw exp payload never reaches the browser.
 *
 * @returns The root layout of the website.
 */
export default async function RootLayout(props: Readonly<LayoutProps<"/">>): Promise<React.JSX.Element> {
  const locale = await getLocale();
  const messages = await getMessages();
  const eulaCookie = await getCookie("eula-accepted");

  // Evaluate feature flags server-side; getWebsiteFeatureFlags() falls back to
  // DEFAULT_FEATURE_FLAGS (both disabled) when exp is unavailable.
  const featureFlags = await getWebsiteFeatureFlags();

  return (
    <html
      suppressHydrationWarning
      lang={locale}
      dir='ltr'>
      <body>
        <ContextProviders
          locale={locale}
          messages={messages as unknown as AbstractIntlMessages}
          featureFlags={featureFlags}>
          <Header />
          <main>
            <Suspense fallback={<Loading />}>{eulaCookie ? props.children : <Eula locale={locale} />}</Suspense>
          </main>
          <Footer />
          {Boolean(eulaCookie) && <Tracking />}
        </ContextProviders>
      </body>
    </html>
  );
}
