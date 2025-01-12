/** @format */

import {type AbstractIntlMessages, NextIntlClientProvider as TranslationProvider} from "next-intl";
import type {DecoratorFunction} from "storybook/internal/types";
import englishMessages from "../../messages/en.json";

type TranslationProviderDecoratorProps = {
  locale: "en" | "ro";
  messages: AbstractIntlMessages;
};

/**
 * Returns a decorator function for wrapping a story with a TranslationProvider.
 *
 * @param {TranslationProviderDecoratorProps} [props={locale: "en", messages: englishMessages}] - The properties for the TranslationProvider.
 * @param {string} props.locale - The locale to be used by the TranslationProvider.
 * @param {object} props.messages - The messages to be used by the TranslationProvider.
 * @returns {DecoratorFunction} A decorator function that wraps a story with a TranslationProvider.
 */
export const getTranslationProviderDecorator = (
  {locale, messages}: TranslationProviderDecoratorProps = {locale: "en", messages: englishMessages},
): DecoratorFunction => {
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
