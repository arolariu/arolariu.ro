import type {Invoice} from "@/types/invoices";
import styles from "./StatisticsView.module.scss";

type Props = {
  invoices: ReadonlyArray<Invoice>;
};

/**
 * This function renders the statistics view for the invoices.
 * It provides an overview of the invoice management system and allows users to track their spending habits.
 * @param invoices The list of invoices to display.
 * @returns This function renders the statistics view for the invoices.
 */
export default function RenderStatisticsView({invoices}: Readonly<Props>): React.JSX.Element {
  // todo: complete this.
  console.log(invoices);

  return (
    <div className={styles["container"]}>
      <div className={styles["header"]}>
        <div className={styles["headerContent"]}>
          <h1 className={styles["title"]}>Invoice Statistics</h1>
          <p className={styles["subtitle"]}>Manage your receipts and track your spending habits</p>
        </div>
      </div>
    </div>
  );
}
