"use client";

import {toRONDetailed} from "@/lib/currency";
import {formatCurrency, formatDate, formatEnum, toSafeDate} from "@/lib/utils.generic";
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
import {useCallback, useMemo, useState} from "react";
import {TbCalendar, TbChevronLeft, TbChevronRight, TbCreditCard, TbFlag3, TbHeart, TbReceipt} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./InvoiceDetailsCard.module.scss";

const ITEMS_PER_PAGE = 5;

/**
 * Maps receipt type strings to emoji icons for visual distinction.
 *
 * @remarks
 * Icons enhance the UX by providing quick visual cues for receipt categories.
 */
const RECEIPT_TYPE_ICONS: Record<string, string> = {
  Itemized: "🛒",
  Meal: "🍽️",
  Gas: "⛽",
  Parking: "🅿️",
  Hotel: "🏨",
  CreditCard: "💳",
};

export function InvoiceDetailsCard(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations("IMS--Cards.invoiceDetailsCard");
  const {invoice, merchant} = useInvoiceContext();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(invoice.items.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = invoice.items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  /**
   * Compute RON equivalent for non-RON invoices.
   *
   * @remarks
   * Uses yearly average exchange rates for the transaction year.
   * Memoized to avoid recalculation on re-renders.
   */
  const ronEquivalent = useMemo(() => {
    if (invoice.paymentInformation.currency.code === "RON") return null;

    const transactionYear = toSafeDate(invoice.paymentInformation.transactionDate).getFullYear();
    return toRONDetailed(invoice.paymentInformation.totalCostAmount, invoice.paymentInformation.currency.code, transactionYear);
  }, [invoice.paymentInformation.totalCostAmount, invoice.paymentInformation.currency.code, invoice.paymentInformation.transactionDate]);

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
              {merchant?.name ?? ""} • {invoice.description}
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

            {/* Receipt Type Badge - New DI v4.0 field */}
            {invoice.receiptType && (
              <div className={styles["infoItem"]}>
                <p className={styles["infoLabelPlain"]}>{t("labels.receiptType")}</p>
                <Badge variant='secondary'>
                  <TbReceipt className={styles["iconSm"]} />
                  <span>
                    <span aria-hidden='true'>{RECEIPT_TYPE_ICONS[invoice.receiptType] ?? ""}</span> {invoice.receiptType}
                  </span>
                </Badge>
              </div>
            )}

            {/* Country/Region - New DI v4.0 field */}
            {invoice.countryRegion && (
              <div className={styles["infoItem"]}>
                <p className={styles["infoLabelPlain"]}>{t("labels.countryRegion")}</p>
                <Badge variant='outline'>
                  <TbFlag3 className={styles["iconSm"]} />
                  <span>{invoice.countryRegion}</span>
                </Badge>
              </div>
            )}

            {/* Subtotal Amount - New DI v4.0 field */}
            {invoice.paymentInformation.subtotalAmount > 0 && (
              <div className={styles["infoItem"]}>
                <p className={styles["infoLabelPlain"]}>{t("labels.subtotal")}</p>
                <p className={styles["infoValue"]}>
                  {formatCurrency(invoice.paymentInformation.subtotalAmount, {
                    currencyCode: invoice.paymentInformation.currency.code,
                    locale,
                  })}
                </p>
              </div>
            )}

            {/* Tip Amount - New DI v4.0 field */}
            {invoice.paymentInformation.tipAmount > 0 && (
              <div className={styles["infoItem"]}>
                <p className={styles["infoLabelPlain"]}>{t("labels.tip")}</p>
                <p className={styles["infoValue"]}>
                  {formatCurrency(invoice.paymentInformation.tipAmount, {
                    currencyCode: invoice.paymentInformation.currency.code,
                    locale,
                  })}
                </p>
              </div>
            )}

            {/* RON Equivalent for non-RON currencies - Enhancement for multi-currency */}
            {ronEquivalent && (
              <div className={styles["infoItem"]}>
                <p className={styles["infoLabelPlain"]}>{t("labels.ronEquivalent")}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <p className={styles["infoValue"]}>≈ {formatCurrency(ronEquivalent.amountInRon, {currencyCode: "RON", locale})}</p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {t("tooltips.exchangeRate", {
                          fromCurrency: invoice.paymentInformation.currency.code,
                          rate: ronEquivalent.rateUsed.toFixed(4),
                          year: ronEquivalent.rateYear.toString(),
                        })}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          <Separator />

          {/* Payment Methods - New DI v4.0 field */}
          {invoice.payments && invoice.payments.length > 0 && (
            <>
              <div className={styles["paymentsSection"]}>
                <h3 className={styles["sectionTitle"]}>{t("sections.paymentMethods")}</h3>
                <div className={styles["paymentsList"]}>
                  {invoice.payments.map((payment, index) => (
                    <div
                      key={`${payment.method}-${index}`}
                      className={styles["paymentItem"]}>
                      <Badge variant='outline'>{payment.method}</Badge>
                      <span className={styles["paymentAmount"]}>
                        {formatCurrency(payment.amount, {
                          currencyCode: invoice.paymentInformation.currency.code,
                          locale,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Tax Details - New DI v4.0 field */}
          {invoice.taxDetails && invoice.taxDetails.length > 0 && (
            <>
              <div className={styles["taxSection"]}>
                <h3 className={styles["sectionTitle"]}>{t("sections.taxBreakdown")}</h3>
                <div className={styles["taxTable"]}>
                  {invoice.taxDetails.map((taxDetail, index) => (
                    <div
                      key={`${taxDetail.description}-${index}`}
                      className={styles["taxRow"]}>
                      <div className={styles["taxInfo"]}>
                        <span className={styles["taxDescription"]}>{taxDetail.description}</span>
                        <span className={styles["taxRate"]}>({taxDetail.rate}%)</span>
                      </div>
                      <div className={styles["taxAmounts"]}>
                        <span className={styles["taxNetAmount"]}>
                          {t("taxLabels.net")}:{" "}
                          {formatCurrency(taxDetail.netAmount, {
                            currencyCode: invoice.paymentInformation.currency.code,
                            locale,
                          })}
                        </span>
                        <span className={styles["taxAmount"]}>
                          {t("taxLabels.tax")}:{" "}
                          {formatCurrency(taxDetail.amount, {
                            currencyCode: invoice.paymentInformation.currency.code,
                            locale,
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

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
                          <p className={styles["itemName"]}>{item.name}</p>
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
