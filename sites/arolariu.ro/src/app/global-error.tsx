"use client";

import "@arolariu/components/styles.css";

import "./globals.scss";

import {GlobalErrorContent, type GlobalErrorContentProps} from "@/app/_components/GlobalErrorContent";
import type {Locale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {useEffect} from "react";
import styles from "./global-error.module.scss";
import ContextProviders from "./providers";
import Tracking from "./tracking";

const SUPPORTED_LOCALES: ReadonlySet<Locale> = new Set<Locale>(["en", "ro", "fr"]);

function detectLocale(): Locale {
  const browserLocale = globalThis.window.navigator.language.split("-")[0] as Locale;
  return SUPPORTED_LOCALES.has(browserLocale) ? browserLocale : "en";
}

function GlobalErrorDocumentTitle(): null {
  const t = useTranslations();

  useEffect(() => {
    globalThis.document.title = t((m) => m.app.errors.globalError.metadata.title);
  }, [t]);

  return null;
}

/**
 * Global error boundary component for the application.
 *
 * @param props - Component props.
 * @param props.error - Error object with optional Next.js digest identifier.
 * @param props.reset - Function that resets the boundary and retries rendering.
 * @returns Full HTML shell with localized global error UX.
 */
export default function GlobalError({error, reset}: GlobalErrorContentProps): React.JSX.Element {
  const locale = detectLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning>
      <head>
        <meta
          name='robots'
          content='noindex, nofollow'
        />
      </head>
      <body className={styles["body"]}>
        <ContextProviders locale={locale}>
          <GlobalErrorDocumentTitle />
          <GlobalErrorContent
            error={error}
            reset={reset}
          />
          <Tracking />
        </ContextProviders>
      </body>
    </html>
  );
}
