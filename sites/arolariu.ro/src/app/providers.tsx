/** @format */

import Commander from "@/components/Commander";
import {FontContextProvider as FontProvider} from "@/contexts/FontContext";
import {Toaster as ToastProvider} from "@arolariu/components";
import {enUS, roRO} from "@clerk/localizations";
import {ClerkProvider as AuthProvider} from "@clerk/nextjs";
import {NextIntlClientProvider as TranslationProvider} from "next-intl";
import {ThemeProvider} from "next-themes";
import dynamic from "next/dynamic";
import React from "react";

const WebVitals = dynamic(() => import("./web-vitals"));

/**
 * This function provides the context for the app.
 * @returns The context providers for the app.
 */
export default function ContextProviders({
  locale,
  children,
}: Readonly<{locale: "en" | "ro"; children: React.ReactNode}>): React.JSX.Element {
  return (
    <AuthProvider localization={locale === "ro" ? roRO : enUS}>
      <FontProvider>
        <TranslationProvider>
          <ThemeProvider
            scriptProps={{async: true, id: "theme-script", src: "/theme.js"}}
            enableSystem
            enableColorScheme
            defaultTheme='system'
            attribute='class'
            themes={["light", "dark"]}>
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
