import {useTranslations} from "next-intl";
import Link from "next/link";

export default function InvoiceNotFound(): React.JSX.Element {
  const t = useTranslations("Errors.notFound");
  return (
    <section data-scope='edit-invoice'>
      <h1>{t("title")}</h1>
      <p>{t("subtitle")}</p>
      <Link href='/domains/invoices/view-invoices'>{t("buttons.returnButton")}</Link>
    </section>
  );
}
