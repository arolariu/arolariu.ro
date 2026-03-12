import {withThemeByClassName} from "@storybook/addon-themes";
import type {Decorator, Preview} from "@storybook/react";
import type {AbstractIntlMessages} from "next-intl";
import {NextIntlClientProvider} from "next-intl";

import enMessages from "../messages/en.json";
import frMessages from "../messages/fr.json";
import roMessages from "../messages/ro.json";

// Component library CSS (Tailwind/shadcn variables) — must load BEFORE app SCSS
// @ts-ignore -- css file has no typings
import "@arolariu/components/styles.css";

// App SCSS (7-1 architecture — overrides component library defaults)
import "../src/app/globals.scss";

// ─── Message catalog ─────────────────────────────────────────────
const messagesByLocale: Record<string, AbstractIntlMessages> = {
  en: enMessages as AbstractIntlMessages,
  ro: roMessages as AbstractIntlMessages,
  fr: frMessages as AbstractIntlMessages,
};

// ─── Decorator: i18n ─────────────────────────────────────────────
const withI18n: Decorator = (Story, context) => {
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

// ─── Decorator: Google Fonts + CSS variable ──────────────────────
const withFontSwitcher: Decorator = (Story, context) => {
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

// ─── Decorator: Theme preset ─────────────────────────────────────
const withThemePreset: Decorator = (Story, context) => {
  const preset = (context.globals["themePreset"] as string) ?? "default";
  return (
    <div data-theme-preset={preset}>
      <Story />
    </div>
  );
};

// ─── Preview config ──────────────────────────────────────────────
const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /date$/i,
      },
    },
    layout: "fullscreen",
  },
  globalTypes: {
    locale: {
      description: "Locale for i18n",
      toolbar: {
        title: "Locale",
        icon: "globe",
        items: [
          {value: "en", title: "English", right: "🇺🇸"},
          {value: "ro", title: "Română", right: "🇷🇴"},
          {value: "fr", title: "Français", right: "🇫🇷"},
        ],
        dynamicTitle: true,
      },
    },
    font: {
      description: "Font family",
      toolbar: {
        title: "Font",
        icon: "paragraph",
        items: [
          {value: "normal", title: "Normal (Caudex)"},
          {value: "dyslexic", title: "Dyslexic-Friendly (Atkinson)"},
        ],
        dynamicTitle: true,
      },
    },
    themePreset: {
      description: "Color theme preset",
      toolbar: {
        title: "Theme Preset",
        icon: "paintbrush",
        items: [
          {value: "default", title: "Default"},
          {value: "midnight", title: "Midnight"},
          {value: "ocean", title: "Ocean"},
          {value: "sunset", title: "Sunset"},
          {value: "forest", title: "Forest"},
          {value: "rose", title: "Rose"},
          {value: "monochrome", title: "Monochrome"},
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    locale: "en",
    font: "normal",
    themePreset: "default",
  },
  decorators: [
    withThemeByClassName({themes: {light: "", dark: "dark"}, defaultTheme: "light"}),
    withI18n,
    withFontSwitcher,
    withThemePreset,
  ],
};

export default preview;
