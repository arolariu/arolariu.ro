import Link from "next/link";
import styles from "./InvoicesNotFound.module.scss";

/**
 * This component is displayed when the user does not have any invoices associated with their account.
 * @returns The JSX for the invoices not found view.
 */
export default function InvoicesNotFound() {
  return (
    <div className={styles["container"]}>
      <h1 className={styles["title"]}>Something is missing here...</h1>
      <article className={styles["description"]}>
        It seems that you do not have any invoices associated with your account... <br />
        Please upload some invoices and come back later. <br /> <br />
      </article>
      <Link
        href='/domains/invoices/create-invoice'
        className={styles["ctaLink"]}>
        Upload an invoice here.
      </Link>
    </div>
  );
}
