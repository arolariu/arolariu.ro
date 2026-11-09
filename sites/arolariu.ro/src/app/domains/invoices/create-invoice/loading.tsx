import CreateInvoiceSkeleton from "./_components/CreateInvoiceSkeleton";
import styles from "./page.module.scss";

/**
 * Loading fallback for the create invoice page.
 *
 * @remarks
 * Wraps the wizard skeleton in the page container so it lines up with the island's own scan-check hold state.
 *
 * @returns JSX element with loading skeleton
 */
export default function CreateInvoiceLoading(): React.JSX.Element {
  return (
    <div className={styles["page"]}>
      <CreateInvoiceSkeleton />
    </div>
  );
}
