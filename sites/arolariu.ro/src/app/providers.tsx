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
 * Props for the ContextProviders component defining locale and children.
 *
 * @remarks
 * **Locale Constraint**: Only supports "en" (English) and "ro" (Romanian) locales.
 * This constraint ensures type safety and prevents invalid locale values from being passed.
 *
 * **Children Pattern**: Uses React.ReactNode to accept any valid React children,
 * including elements, fragments, strings, numbers, and portals.
 */
type Props = {
  locale: "en" | "ro";
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
 * **Locale Handling**: Dynamically requires locale-specific message files based on
 * the locale prop. Uses synchronous `require()` to load translations at render time:
 * - `en`: English translations from `messages/en.json`
 * - `ro`: Romanian translations from `messages/ro.json`
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
 * @param props.locale - The application locale ("en" or "ro"). Determines which
 * translation messages to load and which Clerk localization to use.
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
export default function ContextProviders({locale, children}: Readonly<Props>): React.JSX.Element {
  const messages = locale === "ro" ? require("../../messages/ro.json") : require("../../messages/en.json");
  return (
    <AuthProvider localization={locale === "ro" ? roRO : enUS}>
      <FontProvider>
        <ThemeProvider
          enableSystem
          enableColorScheme
          defaultTheme='system'
          attribute='class'
          themes={["light", "dark"]}>
          <TranslationProvider
            locale={locale}
            messages={messages}>
            {children}
            <ToastProvider />
            <Commander />
            <WebVitals />
          </TranslationProvider>
        </ThemeProvider>
      </FontProvider>
    </AuthProvider>
  );
}
