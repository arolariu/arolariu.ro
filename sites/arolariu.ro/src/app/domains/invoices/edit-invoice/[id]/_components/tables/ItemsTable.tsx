"use client";

import {usePaginationWithSearch} from "@/hooks";
import {formatCurrency} from "@/lib/utils.generic";
import {Invoice} from "@/types/invoices";
import {
  Button,
  Table,
  TableBody,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useLocale, useTranslations} from "next-intl";
import {useCallback} from "react";
import {TbEdit} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import styles from "./ItemsTable.module.scss";

type Props = {
  invoice: Invoice;
};

// Stable keys for rendering placeholder rows (avoid using array index as key)
const EMPTY_ITEM_ROW_KEYS = ["empty-item-row-1", "empty-item-row-2", "empty-item-row-3", "empty-item-row-4", "empty-item-row-5"] as const;

/**
 * Displays a paginated table of invoice items with editing capabilities.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Table Display**:
 * - **Columns**: Item name, Quantity (with unit), Unit Price, Line Total
 * - **Footer**: Aggregated total amount for all items
 * - **Pagination**: Client-side with 5 items per page, Previous/Next controls
 * - **Empty Rows**: Placeholder rows maintain consistent table height
 *
 * **Editing Capabilities**:
 * - **Edit Items Button**: Opens `ItemsDialog` for bulk item editing
 * - Dialog allows add, modify, and delete operations on line items
 *
 * **Animation**: Each row animates in with staggered vertical slide via
 * Framer Motion for smooth table population.
 *
 * **Performance**: Uses `useCallback` for memoized pagination handlers.
 * Stable keys (`EMPTY_ITEM_ROW_KEYS`) prevent React reconciliation issues.
 *
 * **Domain Context**: Core component of the `InvoiceCard`, providing the
 * primary interface for viewing and editing invoice line items.
 *
 * @param props - Component properties containing the invoice with items array
 * @returns Client-rendered table with paginated items and edit controls
 *
 * @example
 * ```tsx
 * <ItemsTable invoice={invoice} />
 * // Displays: Paginated table with item rows and Edit Items button
 * ```
 *
 * @see {@link ItemsDialog} - Dialog for editing invoice items
 * @see {@link usePaginationWithSearch} - Pagination hook
 * @see {@link Invoice} - Invoice type with items array
 */
export default function ItemsTable({invoice}: Readonly<Props>) {
  const locale = useLocale();
  const t = useTranslations("Invoices.EditInvoice.itemsTable");
  const {open} = useDialog("EDIT_INVOICE__ITEMS", "edit", invoice);

  const totalAmount = invoice.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const {paginatedItems, currentPage, setCurrentPage, totalPages} = usePaginationWithSearch({items: invoice.items, initialPageSize: 5});

  const handleNextPage = useCallback(() => {
    const nextPage = currentPage + 1;
    if (nextPage <= totalPages) {
      setCurrentPage(nextPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages]);

  const handlePreviousPage = useCallback(() => {
    const previousPage = currentPage - 1;
    if (previousPage >= 1) {
      setCurrentPage(previousPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  return (
    <div>
      <div className={styles["headerRow"]}>
        <h3 className={styles["itemsLabel"]}>{t("title")}</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='outline'
                  size='sm'
                  onClick={open}
                  className={styles["editButton"]}>
                  <TbEdit className={styles["editIcon"]} />
                  {t("buttons.editItems")}
                </Button>
              }
            />
            <TooltipContent>
              <p>{t("tooltips.editInvoiceItemsAndQuantities")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className={styles["tableWrapper"]}>
        <Table className={styles["table"]}>
          <TableHeader>
            <TableRow className={styles["mutedRow"]}>
              <TableHead className={styles["tableHeader"]}>{t("tableHeaders.item")}</TableHead>
              <TableHead className={styles["tableHeaderRight"]}>{t("tableHeaders.quantity")}</TableHead>
              <TableHead className={styles["tableHeaderRight"]}>{t("tableHeaders.price")}</TableHead>
              <TableHead className={styles["tableHeaderRight"]}>{t("tableHeaders.total")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={styles["tableBody"]}>
            {paginatedItems.map((item, index) => (
              <motion.tr
                key={item.rawName}
                initial={{opacity: 0, y: -20}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: index * 0.05}}
                className={styles["tableRow"]}>
                <td className={styles["tableCell"]}>{item.rawName}</td>
                <td className={styles["tableCellRight"]}>
                  {item.quantity} {item.quantityUnit}
                </td>
                <td className={styles["tableCellRight"]}>
                  {formatCurrency(item.price, {currencyCode: invoice.paymentInformation.currency.code, locale})}
                </td>
                <td className={styles["tableCellRightBold"]}>
                  {formatCurrency(item.price * item.quantity, {currencyCode: invoice.paymentInformation.currency.code, locale})}
                </td>
              </motion.tr>
            ))}
            {EMPTY_ITEM_ROW_KEYS.slice(0, Math.max(0, 5 - paginatedItems.length)).map((key, index) => (
              <motion.tr
                key={key}
                initial={{opacity: 0, x: 0}}
                animate={{opacity: 1, x: 0}}
                transition={{delay: index * 0.05}}
                className={styles["emptyRow"]}>
                <td className={styles["tableCell"]} />
                <td className={styles["tableCellRight"]} />
                <td className={styles["tableCellRight"]} />
                <td className={styles["tableCellRight"]} />
              </motion.tr>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className={styles["mutedRow"]}>
              <TableHead
                colSpan={3}
                className={styles["footerLabel"]}>
                {t("footer.total")}
              </TableHead>
              <TableHead className={styles["footerLabel"]}>
                {formatCurrency(totalAmount, {currencyCode: invoice.paymentInformation.currency.code, locale})}
              </TableHead>
            </TableRow>
          </TableFooter>
        </Table>

        {/* Pagination controls - only show when more than one page */}
        {totalPages > 1 && (
          <div className={styles["paginationBar"]}>
            <div className={styles["paginationInfo"]}>{t("pagination.totalItems", {count: invoice.items.length})}</div>
            <div className={styles["paginationControls"]}>
              <Button
                variant='outline'
                className={styles["cursorPointer"]}
                size='sm'
                onClick={handlePreviousPage}>
                {t("pagination.previous")}
              </Button>
              <span className={styles["paginationText"]}>
                {t("pagination.pageOf", {currentPage: String(currentPage), totalPages: String(totalPages)})}
              </span>
              <Button
                variant='outline'
                className={styles["cursorPointer"]}
                size='sm'
                onClick={handleNextPage}>
                {t("pagination.next")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
