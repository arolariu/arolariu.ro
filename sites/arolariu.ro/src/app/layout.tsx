/** @format */

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import {Toaster} from "@/components/ui/toaster";
import {fonts} from "@/fonts";
import {languageTag} from "@/i18n/runtime";
import {ClerkProvider} from "@clerk/nextjs";
import {LanguageProvider} from "@inlang/paraglide-next";
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
  return (
    <ClerkProvider
      afterSignInUrl='/'
      afterSignUpUrl='/'
      afterSignOutUrl='/'
      signInUrl='/auth/sign-in'
      signUpUrl='/auth/sign-up'>
      <LanguageProvider>
        <html
          lang={languageTag()}
          suppressHydrationWarning
          className={fonts[0]?.className}
          // TODO: implement function with RxJs to automatically set the font based on user preferences.
          dir='ltr'>
          <body className='bg-white text-black dark:bg-black dark:text-white'>
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
          </body>
        </html>
      </LanguageProvider>
    </ClerkProvider>
  );
}
