// We're turning off react/no-unstable-nested-components -- This is a false positive with the i18n lib.
/* eslint react/no-unstable-nested-components: 0 */

import {useTranslations} from "next-intl";
import React from "react";
import styles from "./RichText.module.scss";

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
 * @example
 * ```tsx
 * <RichText sectionKey="about" textKey="description" />
 * ```
 */
export function RichText({className, sectionKey, textKey}: Readonly<Props>): React.JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sectionKey is dynamic, can't be statically typed
  const t = useTranslations(sectionKey as any);

  try {
    const text = t.rich(textKey as never, {
      strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
      em: (chunks: React.ReactNode) => <em>{chunks}</em>,
      br: (chunks: React.ReactNode) => (
        <>
          {chunks}
          <br />
        </>
      ),
      code: (chunks: React.ReactNode) => <code className={styles["inlineCode"]}>{chunks}</code>,
      ul: (chunks: React.ReactNode) => <ul className={styles["richList"]}>{chunks}</ul>,
      li: (chunks: React.ReactNode) => <li>{chunks}</li>,
      span: (chunks: React.ReactNode) => <span>{chunks}</span>,
    });

    return <span className={className}>{text}</span>;
  } catch (error) {
    console.warn(`[RichText] Failed to render key "${textKey}" in namespace "${sectionKey}":`, error);
    return <span className={className} />;
  }
}
