/** @format */

"use client";

import {NamespaceKeys, useTranslations} from "next-intl";

type Props = {
  a11ySectionKey: string;
  a11yTextKey: string;
};

export function RichText({a11ySectionKey, a11yTextKey}: Readonly<Props>) {
  const t = useTranslations<NamespaceKeys<IntlMessages, string>>(a11ySectionKey as any);
  const isTextKeyInNamespace = t.has(a11yTextKey as any);

  if (isTextKeyInNamespace) {
    return t.rich(a11yTextKey as NamespaceKeys<IntlMessages, string>, {
      strong: (chunks) => <strong>{chunks}</strong>,
      em: (chunks) => <em>{chunks}</em>,
      br: (chunks) => (
        <>
          {chunks}
          <br />
        </>
      ),
      code: (chunks) => <code className='font-extrabold text-blue-400'>{chunks}</code>,
      ul: (chunks) => <ul className='list-inside list-disc pt-2'>{chunks}</ul>,
      li: (chunks) => <li>{chunks}</li>,
      span: (chunks) => <span>{chunks}</span>,
    });
  }

  throw new Error(`The key ${a11yTextKey} is not in the namespace ${a11ySectionKey}`);
}
