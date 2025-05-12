/** @format */

import {withThemeByClassName} from "@storybook/addon-themes";
import type {ReactRenderer} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import * as React from "react";
import type {DecoratorFunction} from "storybook/internal/types";

import enMessages from "../messages/en.json";
import roMessages from "../messages/ro.json";

export const withThemes = withThemeByClassName<ReactRenderer>({
  themes: {
    light: "light",
    dark: "dark",
  },
  defaultTheme: "light",
});

export const withTranslations: DecoratorFunction<ReactRenderer> = (storyFn, context): React.ReactElement => {
  // Default to 'en' if locale is not available in globals or is not 'ro'
  const locale = context.globals.locale === "ro" ? "ro" : "en";
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
