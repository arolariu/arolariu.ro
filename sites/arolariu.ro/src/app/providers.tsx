/** @format */

import {Commander} from "@/components/Commander";
import {FontContextProvider as FontProvider} from "@/contexts/FontContext";
import {Toaster as ToastProvider} from "@arolariu/components";
import {enUS, roRO} from "@clerk/localizations";
import {ClerkProvider as AuthProvider} from "@clerk/nextjs";
import {NextIntlClientProvider as TranslationProvider} from "next-intl";
import {ThemeProvider} from "next-themes";
import React from "react";
import {WebVitals} from "./web-vitals";

/**
 * This function provides the context for the app.
 * @returns The context providers for the app.
 */
export default function ContextProviders({locale, children}: Readonly<{locale: "en" | "ro"; children: React.ReactNode}>) {
  return (
    <AuthProvider localization={locale === "ro" ? roRO : enUS}>
      <FontProvider>
        <TranslationProvider>
          <ThemeProvider
            scriptProps={{src: "/", async: true}}
            attribute='class'
            themes={["light", "dark"]}
            enableSystem
            disableTransitionOnChange>
            {children}
            <ToastProvider />
            <Commander />
            <WebVitals />
          </ThemeProvider>
        </TranslationProvider>
      </FontProvider>
    </AuthProvider>
  );
}
