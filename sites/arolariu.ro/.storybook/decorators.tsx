/**
 * @fileoverview Storybook decorators for enhancing stories with context providers.
 * Provides reusable decorators for internationalization, theming, and domain-specific contexts.
 * @module .storybook/decorators
 * @remarks
 * This module exports Storybook decorators that wrap stories with necessary
 * providers and context. Decorators can be applied at the story, component,
 * or global level to ensure components render with the required dependencies.
 *
 * Available decorators:
 * - `withInvoiceCreatorContext`: Invoice creation domain context
 * - `withNextIntl`: Internationalization support (mock translations)
 * - `withTheme`: Dark/light theme support via next-themes
 * @see {@link https://storybook.js.org/docs/writing-stories/decorators}
 * @see {@link https://github.com/pacocoursey/next-themes}
 * @see {@link https://next-intl-docs.vercel.app/}
 */

import {withThemeByClassName} from "@storybook/addon-themes";
import type {ReactRenderer} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import {ThemeProvider} from "next-themes";
import * as React from "react";
import {DecoratorFunction} from "storybook/internal/types";
import enMessages from "../messages/en.json";
import roMessages from "../messages/ro.json";
import {InvoiceCreatorProvider} from "../src/app/domains/invoices/create-invoice/_context/InvoiceCreatorContext";

/**
 * Combined decorator that includes both InvoiceCreatorProvider and container layout.
 * This is the recommended decorator for most invoice display components.
 *
 * Includes:
 * - InvoiceCreatorProvider for invoice scan state and actions
 * - Container div with max-width and padding for consistent layout
 *
 * @example
 * ```tsx
 * import {withInvoiceCreatorContext} from "@/.storybook/decorators";
 *
 * const meta: Meta<typeof MyComponent> = {
 *   title: "Invoices/MyComponent",
 *   component: MyComponent,
 *   decorators: [withInvoiceCreatorContext],
 * };
 * ```
 */
export const withInvoiceCreatorContext: DecoratorFunction<ReactRenderer> = (storyFn, context): React.ReactElement => {
  return (
    <InvoiceCreatorProvider>
      <div className='mx-auto max-w-7xl p-4'>{storyFn(context)}</div>
    </InvoiceCreatorProvider>
  );
};

/**
 * Theme decorator using Storybook's addon-themes.
 *
 * This decorator integrates with the theme toolbar to apply theme classes
 * to the document root element. It uses a class-based strategy that's
 * compatible with Tailwind CSS dark mode.
 *
 * @remarks
 * The decorator applies the selected theme as a class name to the root
 * element, enabling Tailwind's dark mode utilities (e.g., `dark:bg-gray-900`).
 * The theme selection persists across story navigation.
 *
 * @see {@link https://storybook.js.org/addons/@storybook/addon-themes}
 */
export const withThemes = withThemeByClassName<ReactRenderer>({
  themes: {
    light: "light",
    dark: "dark",
  },
  defaultTheme: "light",
});

/**
 * Decorator that provides next-intl internationalization support for stories.
 * Wraps stories with NextIntlClientProvider and real translation messages.
 *
 * Features:
 * - Supports 'en' and 'ro' locales via Storybook toolbar
 * - Uses actual translation files from the messages directory
 * - Enables testing of i18n features in components
 *
 * @remarks
 * This decorator reads the locale from Storybook's global context (set via
 * the locale toolbar) and provides the appropriate messages from the JSON
 * translation files.
 *
 * @see {@link https://next-intl-docs.vercel.app/}
 */
export const withTranslations: DecoratorFunction<ReactRenderer> = (storyFn, context): React.ReactElement => {
  // Default to 'en' if locale is not available in globals or is not 'ro'
  const locale = context.globals["locale"] === "ro" ? "ro" : "en";
  const messages = locale === "ro" ? roMessages : enMessages;

  // Ensure messages is a plain object as expected by NextIntlClientProvider
  const currentMessages = typeof messages === "object" && messages !== null ? messages : {};

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={currentMessages}>
      {storyFn(context)}
    </NextIntlClientProvider>
  );
};

/**
 * Decorator that provides next-themes dark/light mode support for stories.
 * Wraps stories with ThemeProvider for theme switching functionality.
 *
 * This decorator integrates with Storybook's theme toolbar to provide seamless
 * theme switching. It uses next-themes ThemeProvider which adds a `class="dark"`
 * attribute to the html element for dark mode, compatible with Tailwind CSS.
 *
 * Features:
 * - Supports dark and light themes
 * - Enables theme switching via Storybook toolbar
 * - Syncs with Storybook's theme context
 * - Compatible with Tailwind CSS dark mode
 *
 * @remarks
 * The decorator reads the theme from Storybook's global context (set via the
 * theme toolbar) and forces that theme in the ThemeProvider. This ensures
 * the story always reflects the selected theme, even if it differs from the
 * system preference.
 *
 * @example
 * ```tsx
 * import {withTheme} from "@/.storybook/decorators";
 *
 * const meta: Meta<typeof MyComponent> = {
 *   title: "Components/MyComponent",
 *   component: MyComponent,
 *   decorators: [withTheme],
 * };
 * ```
 *
 * @see {@link https://github.com/pacocoursey/next-themes}
 */
export const withTheme: DecoratorFunction<ReactRenderer> = (storyFn, context): React.ReactElement => {
  // Get the current theme from Storybook's global context
  // This is set by the theme toolbar switcher
  const theme = context.globals["theme"] || "light";

  return (
    <ThemeProvider
      attribute='class'
      defaultTheme={theme}
      forcedTheme={theme}
      enableSystem={false}
      disableTransitionOnChange>
      <div className={theme === "dark" ? "dark" : ""}>{storyFn(context)}</div>
    </ThemeProvider>
  );
};
