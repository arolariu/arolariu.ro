"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {
  Calendar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useMemo} from "react";
import {DayButton} from "react-day-picker";
import {TbCalendar, TbInfoCircle, TbTrendingUp} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import {getShoppingPatterns} from "../../_utils/analytics";

function getIntensityClass(amount: number): string {
  if (amount === 0) return "";
  if (amount < 100) return "bg-primary/20 hover:bg-primary/30 text-foreground";
  if (amount < 200) return "bg-primary/40 hover:bg-primary/50 text-foreground";
  if (amount < 300) return "bg-primary/60 hover:bg-primary/70 text-primary-foreground";
  return "bg-primary/80 hover:bg-primary/90 text-primary-foreground";
}

export function ShoppingCalendarCard(): React.JSX.Element {
  const locale = useLocale();
  const {invoice} = useInvoiceContext();
  const month = new Date(invoice.paymentInformation.transactionDate);

  const currency = invoice.paymentInformation.currency;

  // Memoize the data generation to avoid recalculating on every render
  const {spendingByDay, avgDaysBetween} = useMemo(() => getShoppingPatterns(month), [month]);

  const CustomDayButton = (props: React.ComponentProps<typeof DayButton>) => {
    const {day, ...buttonProps} = props;
    const date = day.date;
    const dayNum = date.getDate();
    const isCurrentMonth = date.getMonth() === month.getMonth();
    const data = isCurrentMonth ? spendingByDay[dayNum] : undefined;
    const amount = data?.amount || 0;
    const count = data?.count || 0;
    const isCurrentInvoiceDate =
      date.getDate() === new Date(invoice.paymentInformation.transactionDate).getDate()
      && date.getMonth() === new Date(invoice.paymentInformation.transactionDate).getMonth()
      && date.getFullYear() === new Date(invoice.paymentInformation.transactionDate).getFullYear();

    const intensityClass = getIntensityClass(amount);

    const button = (
      <button
        {...buttonProps}
        className={`h-9 w-9 p-0 font-normal aria-selected:opacity-100 ${intensityClass} ${
          isCurrentInvoiceDate ? "ring-primary ring-2 ring-offset-1" : ""
        } flex items-center justify-center rounded-md transition-all`}>
        <time dateTime={date.toISOString()}>{date.getDate()}</time>
      </button>
    );

    if (amount > 0) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent
            side='top'
            className='text-xs'>
            <p className='font-medium'>{formatCurrency(amount, {currencyCode: currency.code, locale})}</p>
            <p className='text-muted-foreground'>
              {count} {count === 1 ? "invoice" : "invoices"}
            </p>
            {isCurrentInvoiceDate && <p className='text-primary mt-1 font-medium'>Current invoice</p>}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <TooltipProvider>
      <Card className='transition-shadow duration-300 hover:shadow-md'>
        <CardHeader className='pb-3'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <TbCalendar className='text-muted-foreground h-4 w-4' />
            Shopping Calendar
            <Tooltip>
              <TooltipTrigger asChild>
                <TbInfoCircle className='text-muted-foreground h-4 w-4 cursor-help' />
              </TooltipTrigger>
              <TooltipContent
                side='top'
                className='text-xs'>
                Data is computed from cache.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col items-center space-y-4'>
          <Calendar
            mode='single'
            selected={new Date(invoice.paymentInformation.transactionDate)}
            month={month}
            disableNavigation
            hideNavigation
            className='rounded-md border'
            components={{
              DayButton: CustomDayButton,
            }}
          />

          {/* Legend */}
          <div className='text-muted-foreground flex items-center justify-center gap-2 text-xs'>
            <span>Less</span>
            <div className='flex gap-0.5'>
              <div className='bg-muted/50 h-3 w-3 rounded-sm' />
              <div className='bg-primary/20 h-3 w-3 rounded-sm' />
              <div className='bg-primary/40 h-3 w-3 rounded-sm' />
              <div className='bg-primary/60 h-3 w-3 rounded-sm' />
              <div className='bg-primary/80 h-3 w-3 rounded-sm' />
            </div>
            <span>More</span>
          </div>

          {/* Shopping pattern */}
          {avgDaysBetween > 0 && (
            <div className='border-border flex w-full items-center gap-2 rounded-lg border p-3'>
              <TbTrendingUp className='text-muted-foreground h-4 w-4 shrink-0' />
              <p className='text-muted-foreground text-xs'>
                You shop every <span className='text-foreground font-medium'>{avgDaysBetween.toFixed(0)} days</span> on average
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
