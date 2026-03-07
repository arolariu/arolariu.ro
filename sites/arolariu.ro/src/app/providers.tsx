"use client";

import Commander from "@/components/Commander";
import {FontContextProvider as FontProvider} from "@/contexts/FontContext";
import {DEFAULT_FEATURE_FLAGS, type WebsiteFeatureFlags} from "@/lib/config/configBootstrap.types";
import {onLocaleSync} from "@/stores/preferencesStore";
import {Toaster as ToastProvider} from "@arolariu/components";
import {enUS, frFR, roRO} from "@clerk/localizations";
import {ClerkProvider as AuthProvider} from "@clerk/nextjs";
import {AbstractIntlMessages, Locale, NextIntlClientProvider as TranslationProvider} from "next-intl";
import {ThemeProvider} from "next-themes";
import dynamic from "next/dynamic";
import {useRouter} from "next/navigation";
import React, {useEffect, useState} from "react";

const WebVitals = dynamic(() => import("./web-vitals"));

/**
 * Props for the ContextProviders component defining locale, children, and server-derived
 * feature flags.
 *
 * @remarks
 * **Feature Flags**: `featureFlags` must be derived on the server (in `layout.tsx`) from the
 * exp bootstrap endpoint.  Only plain booleans should reach this client component — the raw
 * exp payload must never be forwarded to the browser.
 *
 * **Locale Constraint**: Supports "en" (English), "ro" (Romanian), and "fr" (French) locales.
 *
 * **Children Pattern**: Uses React.ReactNode to accept any valid React children.
 */
type Props = {
  locale: Locale;
  messages?: AbstractIntlMessages;
  /** Derived feature flags from exp bootstrap — safe to pass as they contain only booleans. */
  featureFlags?: WebsiteFeatureFlags;
  children: React.ReactNode;
};

/**
 * Composes all application context providers in proper dependency order.
 *
 * @remarks
 * **Rendering Context**: Client Component wrapper (used in root layout).
 *
 * **Provider Composition Strategy**: Wraps the entire application in multiple context
 * providers following a specific nesting order to ensure proper dependency resolution:
 * 1. **AuthProvider (Clerk)**: Outermost - provides authentication context
 * 2. **FontProvider**: Custom font selection (sans, serif, mono)
 * 3. **ThemeProvider (next-themes)**: Light/dark/system theme management
 * 4. **TranslationProvider (next-intl)**: Internationalization and localization
 *
 * **Locale Handling**: Accepts locale messages from Server Components to avoid
 * coupling the client bundle to all locale dictionaries.
 *
 * **Performance Optimization**: Uses `dynamic()` import for WebVitals component to
 * defer loading of performance monitoring code until after initial page render,
 * reducing time-to-interactive.
 *
 * **Global Components**: Renders global UI components that should be available
 * throughout the application:
 * - `ToastProvider`: Toast notification system (shadcn/ui)
 * - `Commander`: Command palette for keyboard shortcuts (Cmd+K)
 * - `WebVitals`: Performance monitoring and analytics reporting
 *
 * **Theme Configuration**: Enables system theme detection, color scheme integration,
 * and supports both light and dark themes with CSS class-based switching.
 *
 * **Authentication Localization**: Configures Clerk authentication UI with locale-specific
 * strings using `@clerk/localizations` for consistent UX across languages.
 *
 * **Provider Order Rationale**:
 * - Auth must be outermost to provide user context to all descendants
 * - Font and Theme affect visual presentation across the app
 * - Translation must wrap content to enable i18n throughout components
 * - Global components (Toast, Commander, WebVitals) are rendered last as they
 *   depend on the established contexts
 *
 * @param props - Component properties
 * @param props.locale - The application locale ("en", "ro", or "fr"). Determines which
 * translation messages to load and which Clerk localization to use.
 * @param props.messages - Locale messages provided by the server for next-intl.
 * @param props.children - React children to render within the provider tree,
 * typically the root layout content including page components.
 *
 * @returns JSX element with nested context providers wrapping the application tree.
 *
 * @example
 * ```tsx
 * // Used in root layout (app/layout.tsx):
 * export default async function RootLayout({ children }: LayoutProps) {
 *   const locale = await getLocale(); // "en" or "ro"
 *
 *   return (
 *     <html lang={locale}>
 *       <body>
 *         <ContextProviders locale={locale}>
 *           <Header />
 *           {children}
 *           <Footer />
 *         </ContextProviders>
 *       </body>
 *     </html>
 *   );
 * }
 *
 * // Resulting provider nesting:
 * // <AuthProvider>
 * //   <FontProvider>
 * //     <ThemeProvider>
 * //       <TranslationProvider>
 * //         <Header />
 * //         <YourPageContent />
 * //         <Footer />
 * //         <ToastProvider />
 * //         <Commander />
 * //         <WebVitals />
 * //       </TranslationProvider>
 * //     </ThemeProvider>
 * //   </FontProvider>
 * // </AuthProvider>
 * ```
 *
 * @see {@link FontProvider} - Custom font context for typography selection
 * @see {@link ThemeProvider} - next-themes for dark/light mode management
 * @see {@link TranslationProvider} - next-intl for internationalization
 * @see {@link AuthProvider} - Clerk authentication and user management
 * @see {@link Commander} - Command palette component
 * @see {@link WebVitals} - Performance monitoring component
 * @see RFC 1003 - Internationalization System documentation
 */
export default function ContextProviders({locale, messages, featureFlags, children}: Readonly<Props>): React.JSX.Element {
  const localizationMap = {en: enUS, ro: roRO, fr: frFR} as const;
  const localization = localizationMap[locale];
  const [resolvedMessages, setResolvedMessages] = useState<AbstractIntlMessages>(messages ?? ({} satisfies AbstractIntlMessages));

  // Resolve feature flags with safe defaults when not provided (e.g. Storybook / tests).
  const commanderEnabled = featureFlags?.commanderEnabled ?? DEFAULT_FEATURE_FLAGS.commanderEnabled;
  const webVitalsEnabled = featureFlags?.webVitalsEnabled ?? DEFAULT_FEATURE_FLAGS.webVitalsEnabled;

  // Register router.refresh() as the callback for locale → cookie sync.
  // The store subscription handles setCookie(); this just triggers re-rendering.
  const router = useRouter();
  useEffect(() => onLocaleSync(() => router.refresh()), [router]);
  useEffect(() => {
    setResolvedMessages(messages ?? ({} satisfies AbstractIntlMessages));
  }, [messages]);

  useEffect(() => {
    if (messages) {
      return;
    }

    let isMounted = true;

    const loadMessages = async (): Promise<void> => {
      const localeMessagesModule = await import(`../../messages/${locale}.json`);
      const importedMessages = localeMessagesModule.default as AbstractIntlMessages;
      if (isMounted) {
        setResolvedMessages(importedMessages);
      }
    };

    void loadMessages();

    return () => {
      isMounted = false;
    };
  }, [locale, messages]);

  return (
    <TranslationProvider
      locale={locale}
      messages={resolvedMessages}>
      <AuthProvider localization={localization}>
        <FontProvider>
          <ThemeProvider
            enableSystem
            enableColorScheme
            disableTransitionOnChange
            defaultTheme='system'
            attribute='class'
            storageKey='arolariu-theme'
            themes={["light", "dark"]}>
            {children}
            <ToastProvider />
            {commanderEnabled ? <Commander /> : null}
            {webVitalsEnabled ? <WebVitals /> : null}
          </ThemeProvider>
        </FontProvider>
      </AuthProvider>
    </TranslationProvider>
  );
}
