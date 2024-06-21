/** @format */

import {Toaster as ToastProvider} from "@/components/ui/toaster";
import {ClerkProvider} from "@clerk/nextjs";
import {NextIntlClientProvider as TranslationProvider} from "next-intl";
import {getLocale, getMessages} from "next-intl/server";
import {ThemeProvider} from "next-themes";
import {ReactNode} from "react";
import {WebVitals as VitalsProvider} from "./web-vitals";

export default async function ContextProviders({children}: Readonly<{children: ReactNode}>) {
  const locale = await getLocale();
  const messages = await getMessages({locale});

  return (
    <ClerkProvider
      afterSignInUrl='/'
      afterSignUpUrl='/'
      afterSignOutUrl='/'
      signInUrl='/auth/sign-in'
      signUpUrl='/auth/sign-up'>
      <TranslationProvider messages={messages}>
        <ThemeProvider
          attribute='class'
          themes={["light", "dark"]}
          enableSystem={false}>
          <VitalsProvider />
          {children}
          <ToastProvider />
        </ThemeProvider>
      </TranslationProvider>
    </ClerkProvider>
  );
}
