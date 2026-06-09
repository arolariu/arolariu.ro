"use client";

/**
 * @fileoverview Invoice grid card with scan carousel support.
 * @module app/domains/invoices/view-invoices/_components/tables/InvoiceCard
 */

import {formatCurrency, formatDate} from "@/lib/utils.generic";
import {useMerchantsStore} from "@/stores/merchantsStore";
import {InvoiceScanType, type Invoice, type InvoiceScan} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Checkbox,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import Link from "next/link";
import {TbBuildingStore, TbCalendar, TbEye} from "react-icons/tb";
import {ScanMediaPreview, type ScanMediaKind} from "../../../_cards/ScanMediaPreview";
import styles from "./InvoiceCard.module.scss";
import TableViewActions from "./TableViewActions";

type Props = Readonly<{
  invoice: Invoice;
  isSelected: boolean;
  loading: "eager" | "lazy";
  onToggleSelection: (invoiceId: string) => void;
}>;

function resolveInvoiceScanMediaKind(scan: InvoiceScan | undefined): ScanMediaKind {
  if (!scan) {
    return "unknown";
  }

  if (scan.scanType === InvoiceScanType.PDF) {
    return "pdf";
  }

  return "image";
}

/**
 * Renders one invoice as a grid card with a scan carousel.
 *
 * @param props - Invoice card props.
 * @returns The invoice grid card.
 */
export function InvoiceCard({invoice, isSelected, loading, onToggleSelection}: Readonly<Props>): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations();
  const getMerchantById = useMerchantsStore((state) => state.getEntityById);
  const merchantName =
    getMerchantById(invoice.merchantReference)?.name ?? t((m) => m.pages.invoices.viewInvoices.gridView.unknownMerchant);
  const scans = invoice.scans.length > 0 ? invoice.scans : [undefined];
  const hasMultipleScans = invoice.scans.length > 1;

  return (
    <div className={styles["cardWrapper"]}>
      <div className={styles["checkboxOverlay"]}>
        <Checkbox
          nativeButton
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(invoice.id)}
          aria-label={t((m) => m.pages.invoices.viewInvoices.tableView.aria.selectInvoice, {name: invoice.name})}
          className={styles["frostedCheckbox"]}
        />
      </div>
      <Card className={styles["card"]}>
        <div className={styles["mediaContainer"]}>
          <Carousel
            className={styles["carousel"]}
            opts={{align: "start"}}>
            <CarouselContent className={styles["carouselContent"]}>
              {scans.map((scan, index) => (
                <CarouselItem
                  key={scan?.location ?? `missing-scan-${index}`}
                  className={styles["carouselItem"]}>
                  <ScanMediaPreview
                    src={scan?.location ?? ""}
                    mediaKind={resolveInvoiceScanMediaKind(scan)}
                    alt={`${invoice.name} scan ${index + 1}`}
                    loading={loading}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            {hasMultipleScans ? (
              <>
                <CarouselPrevious />
                <CarouselNext />
              </>
            ) : null}
          </Carousel>
          <div className={styles["imageActions"]}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  className={styles["tooltipTrigger"]}
                  render={
                    <Button
                      variant='ghost'
                      size='icon'
                      className={styles["imageButton"]}
                      render={
                        <Link
                          href={`/domains/invoices/view-invoice/${invoice.id}`}
                          aria-label={t((m) => m.pages.invoices.viewInvoices.gridView.tooltips.viewDetails)}>
                          <TbEye className={styles["viewIcon"]} />
                        </Link>
                      }
                    />
                  }
                />
                <TooltipContent>{t((m) => m.pages.invoices.viewInvoices.gridView.tooltips.viewDetails)}</TooltipContent>
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
          <div className={styles["merchantRow"]}>
            <TbBuildingStore className={styles["merchantIcon"]} />
            <span>{merchantName}</span>
          </div>
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
          <div className={styles["itemCount"]}>
            {t((m) => m.pages.invoices.viewInvoices.gridView.itemCount, {count: invoice.items?.length ?? 0})}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
