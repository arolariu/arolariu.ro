/**
 * @fileoverview Storybook preview configuration for the arolariu.ro website.
 * @module .storybook/preview
 *
 * @remarks
 * This module configures global parameters, toolbar controls, and decorators
 * for all stories. Decorators are imported from {@link ./decorators} to keep
 * this file focused on configuration.
 */

import {withThemeByClassName} from "@storybook/addon-themes";
import type {Preview} from "@storybook/react";

// CSS imports — order matters: component library first, then app SCSS
// @ts-ignore -- css file has no typings
import "@arolariu/components/styles.css";
import "../src/app/globals.scss";

import {withFontSwitcher, withI18n, withThemePreset} from "./decorators";

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
    viewport: {
      viewports: {
        "2xs": {name: "2XS (320px)", styles: {width: "320px", height: "568px"}},
        xs: {name: "XS (375px)", styles: {width: "375px", height: "667px"}},
        sm: {name: "SM (640px)", styles: {width: "640px", height: "900px"}},
        md: {name: "MD (768px)", styles: {width: "768px", height: "1024px"}},
        lg: {name: "LG (1024px)", styles: {width: "1024px", height: "768px"}},
        xl: {name: "XL (1280px)", styles: {width: "1280px", height: "800px"}},
        "2xl": {name: "2XL (1536px)", styles: {width: "1536px", height: "864px"}},
      },
    },
    options: {
      storySort: {
        method: "alphabetical",
        order: ["Site", "Pages", ["Home", "About", "Auth", "Legal", "Acknowledgements", "Profile"], "Invoices"],
      },
    },
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
