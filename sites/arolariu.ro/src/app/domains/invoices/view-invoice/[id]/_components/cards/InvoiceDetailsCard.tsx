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
import {useLocale} from "next-intl";
import {useCallback, useState} from "react";
import {TbCalendar, TbChevronLeft, TbChevronRight, TbCreditCard, TbHeart} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./InvoiceDetailsCard.module.scss";

const ITEMS_PER_PAGE = 5;

export function InvoiceDetailsCard(): React.JSX.Element {
  const locale = useLocale();
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
    <Card className='transition-shadow duration-300 hover:shadow-md'>
      <CardHeader>
        <main className={styles["headerRow"]}>
          <main className={styles["headerInfo"]}>
            <CardTitle className='flex items-center gap-2'>
              Invoice Details
              {Boolean(invoice.isImportant) && <TbHeart className='h-4 w-4 fill-red-500 text-red-500' />}
            </CardTitle>
            <CardDescription>
              {merchant.name} • {invoice.description}
            </CardDescription>
          </main>
        </main>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Info Grid */}
        <main className={styles["infoGrid"]}>
          <main className={styles["infoItem"]}>
            <main className={styles["infoLabel"]}>
              <TbCalendar className='h-4 w-4' />
              <span>Date (UTC)</span>
            </main>
            <p className={styles["infoValue"]}>
              {formatDate(invoice.paymentInformation.transactionDate, {
                timeStyle: "short",
                dateStyle: "full",
                timeZone: "UTC",
                locale,
              })}
            </p>
          </main>
          <main className={styles["infoItem"]}>
            <p className={styles["infoLabelPlain"]}>Category</p>
            <Badge variant='outline'>{formatEnum(ProductCategory, invoice.category)}</Badge>
          </main>
          <main className={styles["infoItem"]}>
            <main className={styles["infoLabel"]}>
              <TbCreditCard className='h-4 w-4' />
              <span>Payment</span>
            </main>
            <p className={styles["infoValue"]}>{formatEnum(PaymentType, invoice.paymentInformation.paymentType)}</p>
          </main>
          <main className={styles["infoItem"]}>
            <p className={styles["infoLabelPlain"]}>Total Amount</p>
            <p className={styles["totalAmount"]}>
              {formatCurrency(invoice.paymentInformation.totalCostAmount, {currencyCode: invoice.paymentInformation.currency.code, locale})}
            </p>
          </main>
        </main>

        <Separator />

        {/* Items Table */}
        <main className={styles["itemsSection"]}>
          <h3 className={styles["itemsTitle"]}>Items ({invoice.items.length})</h3>
          <main className={styles["tableContainer"]}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[40%]'>Item</TableHead>
                  <TableHead className='text-right'>Qty</TableHead>
                  <TableHead className='text-right'>Unit</TableHead>
                  <TableHead className='text-right'>Price</TableHead>
                  <TableHead className='text-right'>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow key={item.productCode}>
                    <TableCell>
                      <main className={styles["itemCell"]}>
                        <p className={styles["itemName"]}>{item.genericName || item.rawName}</p>
                        {item.detectedAllergens.length > 0 && (
                          <main className={styles["allergenList"]}>
                            {item.detectedAllergens.map((allergen) => (
                              <TooltipProvider key={allergen.name}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant='secondary'
                                      className='text-xs'>
                                      {allergen.name}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{allergen.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                          </main>
                        )}
                      </main>
                    </TableCell>
                    <TableCell className='text-right'>{item.quantity}</TableCell>
                    <TableCell className='text-right'>{item.quantityUnit}</TableCell>
                    <TableCell className='text-right'>
                      {formatCurrency(item.price, {currencyCode: invoice.paymentInformation.currency.code, locale})}
                    </TableCell>
                    <TableCell className='text-right font-medium'>
                      {formatCurrency(item.totalPrice, {currencyCode: invoice.paymentInformation.currency.code, locale})}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4}>Grand Total</TableCell>
                  <TableCell className='text-right font-semibold'>
                    {formatCurrency(invoice.paymentInformation.totalCostAmount, {
                      currencyCode: invoice.paymentInformation.currency.code,
                      locale,
                    })}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </main>

          {/* Pagination */}
          {totalPages > 1 && (
            <main className={styles["pagination"]}>
              <p className={styles["paginationText"]}>
                Page {currentPage} of {totalPages}
              </p>
              <main className={styles["paginationButtons"]}>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}>
                  <TbChevronLeft className='h-4 w-4' />
                  Previous
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}>
                  Next
                  <TbChevronRight className='h-4 w-4' />
                </Button>
              </main>
            </main>
          )}
        </main>
      </CardContent>
    </Card>
  );
}
