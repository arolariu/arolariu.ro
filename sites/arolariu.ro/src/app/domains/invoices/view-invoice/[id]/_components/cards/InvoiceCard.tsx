/** @format */

"use client";

import {formatCurrency, formatDate} from "@/lib/utils.generic";
import {Invoice, InvoiceCategory, Merchant, PaymentType} from "@/types/invoices";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "framer-motion";
import {TbCreditCard, TbHeart} from "react-icons/tb";
import {ItemsTable} from "../tables/ItemsTable";

type Props = {
  invoice: Invoice;
  merchant: Merchant;
};

/**
 * The InvoiceCard component displays the details of an invoice.
 * It includes information such as the date, category, payment method, and total amount.
 * The card also allows the user to mark the invoice as important.
 * @returns The InvoiceCard component, CSR'ed.
 */
export function InvoiceCard({invoice, merchant}: Readonly<Props>) {
  const {paymentInformation, category, isImportant, description} = invoice;

  const categoryKey = Object.keys(InvoiceCategory)[category];
  const categoryAsString = InvoiceCategory[categoryKey as keyof typeof InvoiceCategory];

  const paymentKey = Object.keys(PaymentType)[paymentInformation?.paymentType!];
  const paymentAsString = PaymentType[paymentKey as keyof typeof PaymentType];

  return (
    <motion.div variants={{hidden: {opacity: 0}, visible: {opacity: 1}}}>
      <Card className='group overflow-hidden transition-shadow duration-300 hover:shadow-md'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle>Invoice Details</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={isImportant === true ? "default" : "outline"}
                    className='cursor-help transition-transform group-hover:scale-105'>
                    <TbHeart className={cn("text-red-500 group-hover:text-red-700", isImportant && "fill-red-500")} />
                    {isImportant ? "IMPORTANT" : "Mark as Important"}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <span>The invoice can be marked as favorite!</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>
            From {merchant.name}
            <Separator className='my-2' />
            <article>{description}</article>
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <motion.div
              whileHover={{scale: 1.02}}
              transition={{type: "spring", stiffness: 400, damping: 10}}>
              <h3 className='text-muted-foreground mb-1 text-sm font-medium'>Date</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className='cursor-pointer'>{formatDate(paymentInformation?.transactionDate)}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className='cursor-pointer'>Exact date: {paymentInformation?.transactionDate.toISOString()}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
            <motion.div
              whileHover={{scale: 1.02}}
              transition={{type: "spring", stiffness: 400, damping: 10}}>
              <h3 className='text-muted-foreground mb-1 text-sm font-medium'>Category</h3>
              <Badge variant='outline'>{categoryAsString}</Badge>
            </motion.div>
            <motion.div
              whileHover={{scale: 1.02}}
              transition={{type: "spring", stiffness: 400, damping: 10}}>
              <h3 className='text-muted-foreground mb-1 text-sm font-medium'>Payment Method</h3>
              <div className='flex items-center'>
                <TbCreditCard className='text-muted-foreground mr-2 h-4 w-4' />
                <span>{paymentAsString}</span>
              </div>
            </motion.div>
            <motion.div
              whileHover={{scale: 1.02}}
              transition={{type: "spring", stiffness: 400, damping: 10}}>
              <h3 className='text-muted-foreground mb-1 text-sm font-medium'>Total Amount</h3>
              <p className='text-lg font-semibold'>{formatCurrency(paymentInformation?.totalCostAmount!, paymentInformation?.currency)}</p>
            </motion.div>
          </div>

          <Separator />

          <ItemsTable items={invoice.items} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
