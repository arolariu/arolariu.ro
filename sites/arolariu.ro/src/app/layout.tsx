/** @format */

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {Toaster} from "@/components/ui/toaster";
import {fonts} from "@/fonts";
import {ClerkProvider} from "@clerk/nextjs";
import {NextIntlClientProvider as TranslationProvider} from "next-intl";
import {getLocale, getMessages} from "next-intl/server";
import {ThemeProvider} from "next-themes";
import {Suspense, type PropsWithChildren} from "react";
import "./globals.css";
import Loading from "./loading";
import {WebVitals} from "./web-vitals";

export {metadata} from "@/metadata";

/**
 * The root layout.
 * @returns The root layout.
 */
export default async function RootLayout({children}: Readonly<PropsWithChildren<{}>>) {
  const locale = await getLocale();
  const messages = await getMessages();

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
              <Header />
              <WebVitals />
              <Suspense fallback={<Loading />}>{children}</Suspense>
              <Toaster />
              <Footer />
            </ThemeProvider>
          </TranslationProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
