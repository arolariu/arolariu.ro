/**
 * @fileoverview Storybook decorators for the arolariu.ro website.
 * @module .storybook/decorators
 *
 * @remarks
 * This module contains all global decorators used in the Storybook preview configuration.
 * Decorators are extracted here for separation of concerns and reusability.
 *
 * **Decorators provided:**
 * - {@link withI18n} — Wraps stories in NextIntlClientProvider with locale from toolbar
 * - {@link withFontSwitcher} — Loads Google Fonts and sets CSS variable from toolbar
 * - {@link withThemePreset} — Sets data-theme-preset attribute from toolbar
 */

import type {Decorator} from "@storybook/react";
import type {AbstractIntlMessages} from "next-intl";
import {NextIntlClientProvider} from "next-intl";

import enMessages from "../messages/en.json";
import frMessages from "../messages/fr.json";
import roMessages from "../messages/ro.json";

// ─── Message catalog ─────────────────────────────────────────────
const messagesByLocale: Record<string, AbstractIntlMessages> = {
  en: enMessages as AbstractIntlMessages,
  ro: roMessages as AbstractIntlMessages,
  fr: frMessages as AbstractIntlMessages,
};

/**
 * Wraps stories in NextIntlClientProvider with locale from toolbar.
 * Uses a React key to force full remount when locale changes.
 */
export const withI18n: Decorator = (Story, context) => {
  const locale = (context.globals["locale"] as string) ?? "en";
  const messages = messagesByLocale[locale] ?? enMessages;
  return (
    <NextIntlClientProvider
      key={`i18n-${locale}`}
      locale={locale}
      messages={messages as AbstractIntlMessages}
      timeZone='Europe/Bucharest'>
      <Story />
    </NextIntlClientProvider>
  );
};

/**
 * Loads Storybook font choices and applies the selected font through scoped
 * wrapper classes.
 */
export const withFontSwitcher: Decorator = (Story, context) => {
  const font = (context.globals["font"] as string) ?? "normal";
  const fontClass = font === "dyslexic" ? "sb-font-dyslexic" : "sb-font-normal";

  if (typeof document !== "undefined") {
    const fontLinkId = "sb-google-fonts";
    const fontStyleId = "sb-font-switcher-styles";

    if (!document.getElementById(fontLinkId)) {
      const link = document.createElement("link");
      link.id = fontLinkId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Caudex:wght@400;700&display=swap";
      document.head.appendChild(link);
    }

    if (!document.getElementById(fontStyleId)) {
      const style = document.createElement("style");
      style.id = fontStyleId;
      style.textContent = `
        .sb-font-normal {
          --font-default: 'Caudex', Georgia, 'Times New Roman', serif;
          --font-dyslexic: 'Atkinson Hyperlegible', system-ui, sans-serif;
          font-family: var(--font-default);
        }

        .sb-font-dyslexic {
          --font-default: 'Atkinson Hyperlegible', system-ui, sans-serif;
          --font-dyslexic: 'Atkinson Hyperlegible', system-ui, sans-serif;
          font-family: var(--font-default);
        }
      `;
      document.head.appendChild(style);
    }
  }

  return (
    <div
      key={`font-${font}`}
      className={fontClass}>
      <Story />
    </div>
  );
};

/**
 * Sets data-theme-preset attribute from toolbar.
 * Uses a React key to force full remount when preset changes.
 */
export const withThemePreset: Decorator = (Story, context) => {
  const preset = (context.globals["themePreset"] as string) ?? "default";
  return (
    <div
      key={`preset-${preset}`}
      data-theme-preset={preset}>
      <Story />
    </div>
  );
};
