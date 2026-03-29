"use client";

import {formatCurrency, formatDate, formatEnum} from "@/lib/utils.generic";
import {PaymentType, ProductCategory} from "@/types/invoices";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbCalendar, TbChevronLeft, TbChevronRight, TbCreditCard, TbHeart} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./InvoiceDetailsCard.module.scss";

const ITEMS_PER_PAGE = 5;

export function InvoiceDetailsCard(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations("Invoices.ViewInvoice.invoiceDetailsCard");
  const {invoice, merchant} = useInvoiceContext();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(invoice.items.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = invoice.items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  return (
    <Card>
      <CardHeader>
        <div className={styles["headerRow"]}>
          <div className={styles["headerInfo"]}>
            <CardTitle>
              <span className={styles["titleRow"]}>
                {t("title")}
                {Boolean(invoice.isImportant) && <TbHeart className={styles["heartIcon"]} />}
              </span>
            </CardTitle>
            <CardDescription>
              {merchant.name} • {invoice.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={styles["contentSpaced"]}>
          {/* Info Grid */}
          <div className={styles["infoGrid"]}>
            <div className={styles["infoItem"]}>
              <div className={styles["infoLabel"]}>
                <TbCalendar className={styles["iconSm"]} />
                <span>{t("labels.dateUtc")}</span>
              </div>
              <p className={styles["infoValue"]}>
                {formatDate(invoice.paymentInformation.transactionDate, {
                  timeStyle: "short",
                  dateStyle: "full",
                  timeZone: "UTC",
                  locale,
                })}
              </p>
            </div>
            <div className={styles["infoItem"]}>
              <p className={styles["infoLabelPlain"]}>{t("labels.category")}</p>
              <Badge variant='outline'>{formatEnum(ProductCategory, invoice.category)}</Badge>
            </div>
            <div className={styles["infoItem"]}>
              <div className={styles["infoLabel"]}>
                <TbCreditCard className={styles["iconSm"]} />
                <span>{t("labels.payment")}</span>
              </div>
              <p className={styles["infoValue"]}>{formatEnum(PaymentType, invoice.paymentInformation.paymentType)}</p>
            </div>
            <div className={styles["infoItem"]}>
              <p className={styles["infoLabelPlain"]}>{t("labels.totalAmount")}</p>
              <p className={styles["totalAmount"]}>
                {formatCurrency(invoice.paymentInformation.totalCostAmount, {
                  currencyCode: invoice.paymentInformation.currency.code,
                  locale,
                })}
              </p>
            </div>
          </div>

          <Separator />

          {/* Items Table */}
          <div className={styles["itemsSection"]}>
            <h3 className={styles["itemsTitle"]}>{t("itemsTitle", {count: String(invoice.items.length)})}</h3>
            <div className={styles["tableContainer"]}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.item")}</TableHead>
                    <TableHead>{t("table.qty")}</TableHead>
                    <TableHead>{t("table.unit")}</TableHead>
                    <TableHead>{t("table.price")}</TableHead>
                    <TableHead>{t("table.total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow key={item.productCode}>
                      <TableCell>
                        <div className={styles["itemCell"]}>
                          <p className={styles["itemName"]}>{item.genericName || item.rawName}</p>
                          {item.detectedAllergens.length > 0 && (
                            <div className={styles["allergenList"]}>
                              {item.detectedAllergens.map((allergen) => (
                                <TooltipProvider key={allergen.name}>
                                  <Tooltip>
                                    <TooltipTrigger render={<Badge variant='secondary'>{allergen.name}</Badge>} />
                                    <TooltipContent>
                                      <p>{allergen.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.quantityUnit}</TableCell>
                      <TableCell>{formatCurrency(item.price, {currencyCode: invoice.paymentInformation.currency.code, locale})}</TableCell>
                      <TableCell>
                        {formatCurrency(item.totalPrice, {currencyCode: invoice.paymentInformation.currency.code, locale})}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4}>{t("table.grandTotal")}</TableCell>
                    <TableCell>
                      {formatCurrency(invoice.paymentInformation.totalCostAmount, {
                        currencyCode: invoice.paymentInformation.currency.code,
                        locale,
                      })}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles["pagination"]}>
                <p className={styles["paginationText"]}>
                  {t("pagination.pageOf", {current: String(currentPage), total: String(totalPages)})}
                </p>
                <div className={styles["paginationButtons"]}>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}>
                    <TbChevronLeft className={styles["navIcon"]} />
                    {t("pagination.previous")}
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}>
                    {t("pagination.next")}
                    <TbChevronRight className={styles["navIcon"]} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
