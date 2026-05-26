"use client";

import {useTranslations} from "next-intl-selector";
import Link from "next/link";

export default function InvoiceNotFound(): React.JSX.Element {
  const t = useTranslations();
  return (
    <section data-scope='view-invoice'>
      <h1>{t((m) => m.app.errors.notFound.title)}</h1>
      <p>{t((m) => m.app.errors.notFound.subtitle)}</p>
      <Link href='/domains/invoices/view-invoices'>{t((m) => m.app.errors.notFound.buttons.returnButton)}</Link>
    </section>
  );
}
