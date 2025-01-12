/** @format */

import {type AbstractIntlMessages, NextIntlClientProvider as TranslationProvider} from "next-intl";
import type {DecoratorFunction} from "storybook/internal/types";
import englishMessages from "../../messages/en.json";

type TranslationProviderDecoratorProps = {
  locale: "en" | "ro";
  messages: AbstractIntlMessages;
};

export const getTranslationProviderDecorator = ({
  locale = "en",
  messages = englishMessages,
}: Readonly<TranslationProviderDecoratorProps>): DecoratorFunction => {
  return (storyFn, context) => {
    return (
      <TranslationProvider
        locale={locale}
        messages={messages}>
        {storyFn(context) as React.ReactNode}
      </TranslationProvider>
    );
  };
};
