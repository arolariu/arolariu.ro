import {useTranslations} from "next-intl-selector";
import Link from "next/link";

export default function InvoiceNotFound(): React.JSX.Element {
  const t = useTranslations();
  return (
    <section data-scope='edit-invoice'>
      <h1>{t((m) => m.Errors.notFound.title)}</h1>
      <p>{t((m) => m.Errors.notFound.subtitle)}</p>
      <Link href='/domains/invoices/view-invoices'>{t((m) => m.Errors.notFound.buttons.returnButton)}</Link>
    </section>
  );
}
