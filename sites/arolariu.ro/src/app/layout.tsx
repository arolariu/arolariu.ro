/** @format */

import EULA from "@/components/EULA";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {Toaster} from "@/components/ui/toaster";
import {fonts} from "@/fonts";
import {ClerkProvider} from "@clerk/nextjs";
import {NextIntlClientProvider as TranslationProvider} from "next-intl";
import {getLocale, getMessages} from "next-intl/server";
import {ThemeProvider} from "next-themes";
import {cookies} from "next/headers";
import {Suspense, type ReactNode} from "react";
import "./globals.css";
import Loading from "./loading";
import {WebVitals} from "./web-vitals";

export {metadata} from "@/metadata";

/**
 * The root layout.
 * @returns The root layout.
 */
export default async function RootLayout({children}: Readonly<{children: ReactNode}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const eulaAccepted = cookies().get("eula-accepted")?.value === "true";

  return (
    <ClerkProvider
      afterSignInUrl='/'
      afterSignUpUrl='/'
      afterSignOutUrl='/'
      signInUrl='/auth/sign-in'
      signUpUrl='/auth/sign-up'>
      <html
        lang={locale}
        suppressHydrationWarning
        className={fonts[0]?.className}
        dir='ltr'>
        <body className='bg-white text-black dark:bg-black dark:text-white'>
          <TranslationProvider messages={messages}>
            <ThemeProvider
              attribute='class'
              themes={["light", "dark"]}
              enableSystem={false}>
              <WebVitals />
              <Header />
              <Suspense fallback={<Loading />}>{eulaAccepted ? children : <EULA />}</Suspense>
              <Footer />
              <Toaster />
            </ThemeProvider>
          </TranslationProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
