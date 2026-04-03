import {formatCurrency, formatDate} from "@/lib/utils.generic";
import {useInvoicesStore} from "@/stores";
import {type Invoice} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useLocale, useTranslations} from "next-intl";
import Image from "next/image";
import {useCallback, useEffect} from "react";
import {TbCalendar, TbEye, TbReceipt} from "react-icons/tb";
import EmptyState from "../../../_components/EmptyState";
import styles from "./GridView.module.scss";
import TableViewActions from "./TableViewActions";

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
  const locale = useLocale();
  const tTableView = useTranslations("IMS--List.tableView");
  const t = useTranslations("IMS--List.gridView");
  const selectedInvoices = useInvoicesStore((state) => state.selectedInvoices);
  const setSelectedInvoices = useInvoicesStore((state) => state.setSelectedInvoices);

  // Prefetch scan images for faster card rendering
  useEffect(() => {
    invoices.slice(0, 20).forEach((inv) => {
      const scanUrl = inv.scans?.[0]?.location;
      if (scanUrl && typeof window !== "undefined") {
        const img = new window.Image();
        img.src = scanUrl;
      }
    });
  }, [invoices]);

  const handleSelectInvoice = useCallback(
    (invoiceId: string) => {
      const invoice = invoices.find((invoice) => invoice.id === invoiceId);
      if (invoice && !selectedInvoices.includes(invoice)) {
        setSelectedInvoices([...selectedInvoices, invoice]);
      } else if (invoice && selectedInvoices.includes(invoice)) {
        setSelectedInvoices(selectedInvoices.filter((inv) => inv.id !== invoice.id));
      }
    },
    [invoices, selectedInvoices, setSelectedInvoices],
  );

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<TbReceipt className={styles["emptyIcon"]} />}
        title={tTableView("empty.title")}
        description={tTableView("empty.description")}
        primaryAction={{
          label: tTableView("empty.uploadCta"),
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
          <div
            key={invoice.id}
            className={styles["cardWrapper"]}>
            <div className={styles["checkboxOverlay"]}>
              <Checkbox
                checked={selectedInvoices.includes(invoice)}
                // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
                onCheckedChange={() => handleSelectInvoice(invoice.id)}
                aria-label={tTableView("aria.selectInvoice", {name: invoice.name})}
                className={styles["frostedCheckbox"]}
              />
            </div>
            <Card className={styles["card"]}>
              <div className={styles["imageContainer"]}>
                <Image
                  src={invoice.scans[0]?.location || "/placeholder.svg"}
                  alt={invoice.name}
                  className={styles["cardImage"]}
                  width={400}
                  height={400}
                  priority={index < 9}
                />
                <div className={styles["imageActions"]}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        className={styles["tooltipTrigger"]}
                        render={
                          <Button
                            variant='ghost'
                            size='icon'
                            className={styles["imageButton"]}>
                            <TbEye className={styles["viewIcon"]} />
                          </Button>
                        }
                      />
                      <TooltipContent>{t("tooltips.viewDetails")}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TableViewActions invoice={invoice} />
                </div>
              </div>
              <CardHeader className={styles["cardHeader"]}>
                <CardTitle className={styles["cardTitle"]}>{invoice.name}</CardTitle>
                <CardDescription>{invoice.description}</CardDescription>
              </CardHeader>
              <CardContent className={styles["cardContent"]}>
                <div className={styles["contentRow"]}>
                  <div className={styles["dateRow"]}>
                    <TbCalendar className={styles["calendarIcon"]} />
                    <span>
                      {formatDate(invoice.paymentInformation.transactionDate || invoice.createdAt, {
                        dateStyle: "full",
                        locale,
                      })}
                    </span>
                  </div>
                  <div className={styles["amount"]}>
                    {formatCurrency(invoice.paymentInformation.totalCostAmount, {
                      currencyCode: invoice.paymentInformation.currency.code,
                      locale,
                    })}
                  </div>
                </div>
              </CardContent>
              <CardFooter className={styles["cardFooter"]}>
                <div className={styles["itemCount"]}>{t("itemCount", {count: invoice.items?.length ?? 0})}</div>
              </CardFooter>
            </Card>
          </div>
        ))}
      </motion.div>

      {totalPages > 1 && (
        <div className={styles["paginationControls"]}>
          <div className={styles["pageSizeSelector"]}>
            <span className={styles["pageSizeLabel"]}>{tTableView("rowsPerPage")}</span>
            <Select
              value={String(pageSize)}
              // eslint-disable-next-line react/jsx-no-bind -- inline fn for ease.
              onValueChange={(value) => handlePageSizeChange(Number(value))}>
              <SelectTrigger
                className={styles["pageSizeTrigger"]}
                aria-label={tTableView("aria.rowsPerPage")}>
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
            <span className={styles["pageLabel"]}>{tTableView("pageOf", {current: String(currentPage), total: String(totalPages)})}</span>
          </div>
          <div className={styles["pageNavigation"]}>
            <Button
              variant='outline'
              className={styles["paginationButton"]}
              size='sm'
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              aria-label={tTableView("previousPage")}>
              {tTableView("previousPage")}
            </Button>
            <Button
              variant='outline'
              className={styles["paginationButton"]}
              size='sm'
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              aria-label={tTableView("nextPage")}>
              {tTableView("nextPage")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
