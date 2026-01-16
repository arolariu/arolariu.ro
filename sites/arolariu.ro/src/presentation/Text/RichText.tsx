// We're turning off react/no-unstable-nested-components -- This is a false positive with the i18n lib.
/* eslint react/no-unstable-nested-components: 0 */

import {Messages, NamespaceKeys, useTranslations} from "next-intl";
import React from "react";

type Props = {
  className?: string;
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
 * @throws {Error} If the specified text key is not found in the namespace
 * @example
 * ```tsx
 * <RichText a11ySectionKey="about" a11yTextKey="description" />
 * ```
 */
export function RichText({className, sectionKey, textKey}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations<NamespaceKeys<Messages, string>>(sectionKey as any);
  const isTextKeyInNamespace = t.has(textKey as any);

  if (isTextKeyInNamespace) {
    // @ts-expect-error -- This is a known issue with the library
    const text = t.rich(textKey, {
      strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
      em: (chunks: React.ReactNode) => <em>{chunks}</em>,
      br: (chunks: React.ReactNode) => (
        <>
          {chunks}
          <br />
        </>
      ),
      code: (chunks: React.ReactNode) => <code className='font-extrabold text-accent-primary'>{chunks}</code>,
      ul: (chunks: React.ReactNode) => <ul className='list-inside list-disc pt-2'>{chunks}</ul>,
      li: (chunks: React.ReactNode) => <li>{chunks}</li>,
      span: (chunks: React.ReactNode) => <span>{chunks}</span>,
    });

    return <span className={className}>{text}</span>;
  }

  throw new Error(`The key ${textKey} is not in the namespace ${sectionKey}`);
}
