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
 *
 * @remarks
 * Reads the `locale` global from the Storybook toolbar and provides
 * the corresponding message catalog to all child components via
 * NextIntlClientProvider.
 *
 * @param Story - The story component to render
 * @param context - Storybook context containing globals
 * @returns The story wrapped in NextIntlClientProvider
 */
export const withI18n: Decorator = (Story, context) => {
  const locale = (context.globals["locale"] as string) ?? "en";
  const messages = messagesByLocale[locale] ?? enMessages;
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages as AbstractIntlMessages}
      timeZone='Europe/Bucharest'>
      <Story />
    </NextIntlClientProvider>
  );
};

/**
 * Loads Google Fonts and sets --font-default CSS variable from toolbar.
 *
 * @remarks
 * Dynamically injects a Google Fonts stylesheet link element on first render,
 * then switches the `--font-default` CSS variable based on the selected
 * font from the Storybook toolbar (`normal` → Caudex, `dyslexic` → Atkinson Hyperlegible).
 *
 * @param Story - The story component to render
 * @param context - Storybook context containing globals
 * @returns The story with font styles applied
 */
export const withFontSwitcher: Decorator = (Story, context) => {
  const font = (context.globals["font"] as string) ?? "normal";

  if (typeof document !== "undefined") {
    const fontId = "sb-google-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Caudex:wght@400;700&display=swap";
      document.head.appendChild(link);
    }

    const fontFamily =
      font === "dyslexic"
        ? "'Atkinson Hyperlegible', system-ui, sans-serif"
        : "'Caudex', Georgia, 'Times New Roman', serif";

    document.body.style.setProperty("--font-default", fontFamily);
    document.body.style.setProperty("--font-dyslexic", "'Atkinson Hyperlegible', system-ui, sans-serif");
    document.body.style.fontFamily = fontFamily;
  }

  return <Story />;
};

/**
 * Sets data-theme-preset attribute from toolbar.
 *
 * @remarks
 * Reads the `themePreset` global from the Storybook toolbar and wraps
 * the story in a `<div>` with the corresponding `data-theme-preset` attribute.
 * This allows CSS to apply themed color variables based on the preset.
 *
 * @param Story - The story component to render
 * @param context - Storybook context containing globals
 * @returns The story wrapped in a themed container div
 */
export const withThemePreset: Decorator = (Story, context) => {
  const preset = (context.globals["themePreset"] as string) ?? "default";
  return (
    <div data-theme-preset={preset}>
      <Story />
    </div>
  );
};
