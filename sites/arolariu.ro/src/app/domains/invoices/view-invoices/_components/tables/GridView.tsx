"use client";

import {useInvoicesStore} from "@/stores";
import {type Invoice} from "@/types/invoices";
import {Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useCallback, useEffect} from "react";
import {TbReceipt} from "react-icons/tb";
import EmptyState from "../../../_components/EmptyState";
import {InvoiceCard} from "./InvoiceCard";
import styles from "./GridView.module.scss";

type Props = Readonly<{
  invoices: ReadonlyArray<Invoice> | Invoice[];
  pageSize: number;
  currentPage: number;
  totalPages: number;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  handlePageSizeChange: (size: number) => void;
}>;

export const GridView = (props: Readonly<Props>): React.JSX.Element => {
  const {invoices, pageSize, currentPage, totalPages, handlePrevPage, handleNextPage, handlePageSizeChange} = props;
  const t = useTranslations();
  const selectedInvoices = useInvoicesStore((state) => state.selectedEntities);
  const setSelectedInvoices = useInvoicesStore((state) => state.setSelectedEntities);

  // Prefetch scan images for faster card rendering
  useEffect(() => {
    invoices.slice(0, 20).forEach((inv) => {
      const scanUrl = inv.scans?.[0]?.location;
      if (scanUrl && typeof globalThis !== "undefined") {
        const img = new globalThis.Image();
        img.src = scanUrl;
      }
    });
  }, [invoices]);

  const handleSelectInvoice = useCallback(
    (invoiceId: string) => {
      const invoice = invoices.find((candidate) => candidate.id === invoiceId);
      const isAlreadySelected = selectedInvoices.some((selectedInvoice) => selectedInvoice.id === invoiceId);
      if (invoice && !isAlreadySelected) {
        setSelectedInvoices([...selectedInvoices, invoice]);
      } else if (invoice && isAlreadySelected) {
        setSelectedInvoices(selectedInvoices.filter((selectedInvoice) => selectedInvoice.id !== invoice.id));
      }
    },
    [invoices, selectedInvoices, setSelectedInvoices],
  );

  // Early return with empty state when no invoices are present, to avoid rendering the grid structure.
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<TbReceipt className={styles["emptyIcon"]} />}
        title={t((m) => m.pages.invoices.viewInvoices.tableView.empty.title)}
        description={t((m) => m.pages.invoices.viewInvoices.tableView.empty.description)}
        primaryAction={{
          label: t((m) => m.pages.invoices.viewInvoices.tableView.empty.uploadCta),
          href: "/domains/invoices/upload-scans",
        }}
      />
    );
  }

  return (
    <div className={styles["gridContainer"]}>
      <motion.div
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
        transition={{duration: 0.2}}
        className={styles["grid"]}>
        {invoices.map((invoice, index) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            isSelected={selectedInvoices.some((selectedInvoice) => selectedInvoice.id === invoice.id)}
            loading={index < 9 ? "eager" : "lazy"}
            onToggleSelection={handleSelectInvoice}
          />
        ))}
      </motion.div>

      {totalPages > 1 && (
        <div className={styles["paginationControls"]}>
          <div className={styles["pageSizeSelector"]}>
            <span className={styles["pageSizeLabel"]}>{t((m) => m.pages.invoices.viewInvoices.tableView.rowsPerPage)}</span>
            <Select
              value={String(pageSize)}
              // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
              onValueChange={(value) => handlePageSizeChange(Number(value))}>
              <SelectTrigger
                className={styles["pageSizeTrigger"]}
                aria-label={t((m) => m.pages.invoices.viewInvoices.tableView.aria.rowsPerPage)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50, 100, 500, 1000].map((size) => (
                  <SelectItem
                    key={size}
                    value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={styles["pageIndicator"]}>
            <span className={styles["pageLabel"]}>
              {t((m) => m.pages.invoices.viewInvoices.tableView.pageOf, {current: String(currentPage), total: String(totalPages)})}
            </span>
          </div>
          <div className={styles["pageNavigation"]}>
            <Button
              variant='outline'
              className={styles["paginationButton"]}
              size='sm'
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              aria-label={t((m) => m.pages.invoices.viewInvoices.tableView.previousPage)}>
              {t((m) => m.pages.invoices.viewInvoices.tableView.previousPage)}
            </Button>
            <Button
              variant='outline'
              className={styles["paginationButton"]}
              size='sm'
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              aria-label={t((m) => m.pages.invoices.viewInvoices.tableView.nextPage)}>
              {t((m) => m.pages.invoices.viewInvoices.tableView.nextPage)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
