import {getTranslations} from "next-intl/server";
import styles from "./LoadingInvoices.module.scss";

/**
 * This component is used to display a message when the invoices are loading.
 * @returns The JSX for the loading invoices view.
 */
export default async function LoadingInvoices(): Promise<React.JSX.Element> {
  const t = await getTranslations("IMS--Common.loadingInvoices");
  return (
    <section className={styles["section"]}>
      <article className={styles["article"]}>
        <h1 className={styles["title"]}>{t("title")}</h1>
        <p className={styles["description"]}>{t("description")}</p>
      </article>
    </section>
  );
}
