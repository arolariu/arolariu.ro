import styles from "./LoadingInvoices.module.scss";

/**
 * This component is used to display a message when the invoices are loading.
 * @returns The JSX for the loading invoices view.
 */
export default function LoadingInvoices() {
  return (
    <section className={styles["section"]}>
      <article className={styles["article"]}>
        <h1 className={styles["title"]}>Loading Invoices</h1>
        <p className={styles["description"]}>Loading invoices...</p>
      </article>
    </section>
  );
}
