import {getTranslations} from "next-intl-selector/server";
import styles from "./LoadingInvoices.module.scss";

/**
 * This component is used to display a message when the invoices are loading.
 * @returns The JSX for the loading invoices view.
 */
export default async function LoadingInvoices(): Promise<React.JSX.Element> {
  const t = await getTranslations();
  return (
    <section className={styles["section"]}>
      <article className={styles["article"]}>
        <h1 className={styles["title"]}>{t((m) => m["IMS--Common"].loadingInvoices.title)}</h1>
        <p className={styles["description"]}>{t((m) => m["IMS--Common"].loadingInvoices.description)}</p>
      </article>
    </section>
  );
}
