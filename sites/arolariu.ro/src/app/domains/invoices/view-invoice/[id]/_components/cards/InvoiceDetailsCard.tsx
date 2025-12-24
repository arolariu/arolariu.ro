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
import {useState} from "react";
import {TbCalendar, TbChevronLeft, TbChevronRight, TbCreditCard, TbHeart} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";

const ITEMS_PER_PAGE = 5;

export function InvoiceDetailsCard(): React.JSX.Element {
  const locale = useLocale();
  const {invoice, merchant} = useInvoiceContext();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(invoice.items.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = invoice.items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <Card className='transition-shadow duration-300 hover:shadow-md'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='space-y-1'>
            <CardTitle className='flex items-center gap-2'>
              Invoice Details
              {Boolean(invoice.isImportant) && <TbHeart className='h-4 w-4 fill-red-500 text-red-500' />}
            </CardTitle>
            <CardDescription>
              {merchant.name} • {invoice.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Info Grid */}
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1'>
            <div className='text-muted-foreground flex items-center gap-2 text-sm'>
              <TbCalendar className='h-4 w-4' />
              <span>Date (UTC)</span>
            </div>
            <p className='font-medium'>
              {formatDate(invoice.paymentInformation.transactionDate, {
                timeStyle: "short",
                dateStyle: "full",
                timeZone: "UTC",
                locale,
              })}
            </p>
          </div>
          <div className='space-y-1'>
            <p className='text-muted-foreground text-sm'>Category</p>
            <Badge variant='outline'>{formatEnum(ProductCategory, invoice.category)}</Badge>
          </div>
          <div className='space-y-1'>
            <div className='text-muted-foreground flex items-center gap-2 text-sm'>
              <TbCreditCard className='h-4 w-4' />
              <span>Payment</span>
            </div>
            <p className='font-medium'>{formatEnum(PaymentType, invoice.paymentInformation.paymentType)}</p>
          </div>
          <div className='space-y-1'>
            <p className='text-muted-foreground text-sm'>Total Amount</p>
            <p className='text-lg font-semibold'>
              {formatCurrency(invoice.paymentInformation.totalCostAmount, {currencyCode: invoice.paymentInformation.currency.code, locale})}
            </p>
          </div>
        </div>

        <Separator />

        {/* Items Table */}
        <div className='space-y-4'>
          <h3 className='font-semibold'>Items ({invoice.items.length})</h3>
          <div className='rounded-md border'>
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
                {paginatedItems.map((item, index) => (
                  <TableRow key={`${item.productCode}-${index}`}>
                    <TableCell>
                      <div className='space-y-1'>
                        <p className='font-medium'>{item.genericName || item.rawName}</p>
                        {item.detectedAllergens.length > 0 && (
                          <div className='flex flex-wrap gap-1'>
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
                          </div>
                        )}
                      </div>
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
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='flex items-center justify-between'>
              <p className='text-muted-foreground text-sm'>
                Page {currentPage} of {totalPages}
              </p>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}>
                  <TbChevronLeft className='h-4 w-4' />
                  Previous
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}>
                  Next
                  <TbChevronRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
