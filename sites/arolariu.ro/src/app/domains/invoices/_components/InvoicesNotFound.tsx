import {getTranslations} from "next-intl/server";
import Link from "next/link";
import styles from "./InvoicesNotFound.module.scss";

/**
 * This component is displayed when the user does not have any invoices associated with their account.
 * @returns The JSX for the invoices not found view.
 */
export default async function InvoicesNotFound(): Promise<React.JSX.Element> {
  const t = await getTranslations("Domains.services.invoices.ui.invoicesNotFound");
  return (
    <div className={styles["container"]}>
      <h1 className={styles["title"]}>{t("title")}</h1>
      <article className={styles["description"]}>{t("description")}</article>
      <Link
        href='/domains/invoices/create-invoice'
        className={styles["ctaLink"]}>
        {t("cta")}
      </Link>
    </div>
  );
}
