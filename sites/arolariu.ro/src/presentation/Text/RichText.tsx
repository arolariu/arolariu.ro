// We're turning off react/no-unstable-nested-components -- This is a false positive with the i18n lib.
/* eslint react/no-unstable-nested-components: 0 */

import {useTranslations} from "next-intl";
import type React from "react";
import styles from "./RichText.module.scss";

type Props = {
  className?: string;
  sectionKey: string;
  textKey: string;
};

/**
 * A rich text component that renders internationalized text with formatting support.
 *
 * Uses `useTranslations()` without a namespace and constructs the full key path
 * from `sectionKey` + `textKey` to support dynamic namespace resolution.
 *
 * @param props The props object containing the sectionKey and textKey
 * @returns The formatted internationalized text content
 * @example
 * ```tsx
 * <RichText sectionKey="Footer" textKey="subtitle" />
 * ```
 */
export function RichText({className, sectionKey, textKey}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const fullKey = `${sectionKey}.${textKey}`;

  try {
    // @ts-expect-error -- fullKey is a dynamic string; next-intl expects literal keys but this is intentional for dynamic usage
    const text = t.rich(fullKey, {
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
  } catch (error: unknown) {
    console.warn(`[RichText] Failed to render "${fullKey}":`, error);
    return <span className={className} />;
  }
}
