/** @format */

"use client";

import {Messages, NamespaceKeys, useTranslations} from "next-intl";

type Props = {
  sectionKey: string;
  textKey: string;
};

/**
 * A rich text component that renders internationalized text with formatting support.
 *
 * This component uses next-intl translation hooks to retrieve and format text content
 * based on the provided section and text keys. It supports various HTML formatting tags
 * including strong, em, br, code, ul, li, and span elements.
 * @param props The props object containing the sectionKey and textKey
 * @returns The formatted internationalized text content
 * @throws Throws an error if the specified text key is not found in the namespace
 * @example
 * ```tsx
 * <RichText a11ySectionKey="about" a11yTextKey="description" />
 * ```
 */
export default function RichText({sectionKey, textKey}: Readonly<Props>) {
  const t = useTranslations<NamespaceKeys<Messages, string>>(sectionKey as any);
  const isTextKeyInNamespace = t.has(textKey as any);

  if (isTextKeyInNamespace) {
    // @ts-expect-error -- This is a known issue with the library
    return t.rich(textKey, {
      strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
      em: (chunks: React.ReactNode) => <em>{chunks}</em>,
      br: (chunks: React.ReactNode) => (
        <>
          {chunks}
          <br />
        </>
      ),
      code: (chunks: React.ReactNode) => <code className='font-extrabold text-blue-400'>{chunks}</code>,
      ul: (chunks: React.ReactNode) => <ul className='list-inside list-disc pt-2'>{chunks}</ul>,
      li: (chunks: React.ReactNode) => <li>{chunks}</li>,
      span: (chunks: React.ReactNode) => <span>{chunks}</span>,
    });
  }

  throw new Error(`The key ${textKey} is not in the namespace ${sectionKey}`);
}
