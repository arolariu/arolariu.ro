"use client";

import {formatCurrency, formatDate} from "@/lib/utils.generic";
import {type Invoice, InvoiceCategory, type Merchant, PaymentType} from "@/types/invoices";
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
import {motion} from "motion/react";
import {TbCreditCard, TbHeart} from "react-icons/tb";
import ItemsTable from "../tables/ItemsTable";

type Props = {
  invoice: Invoice;
  merchant: Merchant;
};

/**
 * Displays comprehensive invoice details with inline editing capabilities.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Invoice Details Displayed**:
 * - **Date**: Transaction date with ISO timestamp tooltip
 * - **Category**: Invoice category badge (e.g., GROCERIES, DINING)
 * - **Payment Method**: Payment type with credit card icon
 * - **Total Amount**: Formatted currency with locale-aware formatting
 * - **Description**: Merchant description text
 * - **Items Table**: Paginated list of invoice line items (via `ItemsTable`)
 *
 * **Editing Capabilities**:
 * - **Mark as Important**: Toggle badge to favorite/unfavorite invoice
 * - **Edit Items**: Via `ItemsTable` which opens `ItemsDialog` for modifications
 *
 * **Animation**: Uses Framer Motion for card entrance and hover scale effects
 * on individual detail sections.
 *
 * **Domain Context**: Central component of the edit-invoice page, providing
 * the primary invoice summary view with editing access points.
 *
 * @param props - Component properties with invoice and merchant data
 * @returns Client-rendered card with invoice details and edit controls
 *
 * @example
 * ```tsx
 * <InvoiceCard invoice={invoice} merchant={merchant} />
 * // Displays: Invoice Details card with date, category, payment, total, items
 * ```
 *
 * @see {@link ItemsTable} - Nested component for displaying/editing items
 * @see {@link Invoice} - Invoice type definition
 * @see {@link Merchant} - Merchant type definition
 */
export default function InvoiceCard({invoice, merchant}: Readonly<Props>): React.JSX.Element {
  const {paymentInformation, category, isImportant, description} = invoice;

  const categoryKey = Object.keys(InvoiceCategory).at(category);
  const categoryAsString = InvoiceCategory[categoryKey as keyof typeof InvoiceCategory];

  const paymentKey = Object.keys(PaymentType).at(paymentInformation?.paymentType!);
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
                    className='cursor-help transition-transform hover:scale-105'>
                    <TbHeart className={cn("text-red-500 hover:text-red-700", isImportant && "fill-red-500")} />
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
                    <span className='cursor-help'>{formatDate(paymentInformation?.transactionDate)}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>Exact date: {new Date(paymentInformation?.transactionDate).toISOString()}</span>
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
              <p className='text-lg font-semibold'>
                {formatCurrency(paymentInformation.totalCostAmount, paymentInformation.currency.code)}
              </p>
            </motion.div>
          </div>

          <Separator />

          <ItemsTable invoice={invoice} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
