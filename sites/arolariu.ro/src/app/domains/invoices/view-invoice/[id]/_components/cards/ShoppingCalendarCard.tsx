"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {useInvoicesStore} from "@/stores";
import type {Currency} from "@/types/DDD";
import {
  Badge,
  Calendar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useMemo} from "react";
import type {DayButton} from "react-day-picker";
import {TbArrowDown, TbArrowUp, TbCalendar, TbInfoCircle, TbShoppingCart, TbTrendingUp} from "react-icons/tb";
import {useShallow} from "zustand/react/shallow";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import type {DayData, DayHistoricalComparison} from "../../_utils/analytics";
import {computeShoppingPatterns, getSpendingIntensityClass, getWeekdayName} from "../../_utils/analytics";

interface CustomDayButtonProps extends React.ComponentProps<typeof DayButton> {
  locale: string;
  currency: Currency;
  month: Date;
  transactionDate: Date;
  spendingByDay: Record<number, DayData>;
  historicalByDay: Record<number, DayHistoricalComparison>;
  maxDayAmount: number;
}

function CustomDayButton(props: Readonly<CustomDayButtonProps>): React.JSX.Element {
  const {day, locale, currency, month, transactionDate, spendingByDay, historicalByDay, maxDayAmount, ...buttonProps} = props;
  const date = day.date;
  const dayNum = date.getDate();
  const isCurrentMonth = date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
  const data = isCurrentMonth ? spendingByDay[dayNum] : undefined;
  const historicalData = isCurrentMonth ? historicalByDay[dayNum] : undefined;
  const amount = data?.amount ?? 0;
  const count = data?.count ?? 0;

  const isCurrentInvoiceDate =
    date.getDate() === transactionDate.getDate()
    && date.getMonth() === transactionDate.getMonth()
    && date.getFullYear() === transactionDate.getFullYear();

  const intensityClass = getSpendingIntensityClass(amount, maxDayAmount);

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
          className='max-w-xs space-y-2 text-xs'>
          {/* Spending Summary */}
          <div className='space-y-1'>
            <p className='font-semibold'>{formatCurrency(amount, {currencyCode: currency.code, locale})}</p>
            <p className='text-muted-foreground'>
              {count} {count === 1 ? "invoice" : "invoices"}
            </p>
          </div>

          {/* Invoice Names */}
          {data && data.invoiceNames.length > 0 && (
            <div className='border-border border-t pt-1'>
              {data.invoiceNames.slice(0, 3).map((name) => (
                <p
                  key={name}
                  className='text-muted-foreground truncate'>
                  • {name}
                </p>
              ))}
              {data.invoiceNames.length > 3 && <p className='text-muted-foreground'>+{data.invoiceNames.length - 3} more</p>}
            </div>
          )}

          {/* Historical Comparison */}
          {historicalData && (
            <div className='border-border flex items-center gap-1 border-t pt-1'>
              {historicalData.isAboveAverage ? (
                <TbArrowUp className='h-3 w-3 text-red-500' />
              ) : (
                <TbArrowDown className='h-3 w-3 text-green-500' />
              )}
              <span className={historicalData.isAboveAverage ? "text-red-500" : "text-green-500"}>
                {Math.abs(historicalData.percentageDiff).toFixed(0)}%
              </span>
              <span className='text-muted-foreground'>vs avg ({historicalData.yearsWithData}y data)</span>
            </div>
          )}

          {/* Current Invoice Indicator */}
          {isCurrentInvoiceDate && <Badge className='mt-1'>Current invoice</Badge>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

export function ShoppingCalendarCard(): React.JSX.Element {
  const locale = useLocale();
  const {invoice} = useInvoiceContext();
  const transactionDate = new Date(invoice.paymentInformation.transactionDate);
  const month = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1);
  const currency = invoice.paymentInformation.currency;

  // Get cached invoices from Zustand store
  const {invoices, hasHydrated} = useInvoicesStore(
    useShallow((state) => ({
      invoices: state.invoices,
      hasHydrated: state.hasHydrated,
    })),
  );

  // Compute shopping patterns from cached invoices
  const patterns = useMemo(() => {
    if (!hasHydrated || invoices.length === 0) {
      // Return patterns for just the current invoice if store not hydrated
      return computeShoppingPatterns([invoice], month);
    }
    return computeShoppingPatterns(invoices, month);
  }, [invoices, hasHydrated, invoice, month]);

  // Find max spending for relative intensity scaling
  const maxDayAmount = useMemo(() => {
    const amounts = Object.values(patterns.spendingByDay).map((d) => d.amount);
    return Math.max(...amounts, 1);
  }, [patterns.spendingByDay]);

  // Create a wrapper component that passes the required props
  const DayButtonWithData = useMemo(() => {
    return function DayButtonWrapper(dayProps: React.ComponentProps<typeof DayButton>): React.JSX.Element {
      return (
        <CustomDayButton
          {...dayProps}
          locale={locale}
          currency={currency}
          month={month}
          transactionDate={transactionDate}
          spendingByDay={patterns.spendingByDay}
          historicalByDay={patterns.historicalByDay}
          maxDayAmount={maxDayAmount}
        />
      );
    };
  }, [locale, currency, month, transactionDate, patterns.spendingByDay, patterns.historicalByDay, maxDayAmount]);

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
                {hasHydrated && invoices.length > 1 ? `Based on ${invoices.length} cached invoices` : "Showing current invoice only"}
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col items-center space-y-4'>
          <Calendar
            mode='single'
            selected={transactionDate}
            month={month}
            disableNavigation
            hideNavigation
            className='rounded-md border'
            components={{
              DayButton: DayButtonWithData,
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

          <Separator />

          {/* Month Statistics */}
          <div className='grid w-full grid-cols-2 gap-3 text-sm'>
            <div className='border-border flex items-center gap-2 rounded-lg border p-2'>
              <TbShoppingCart className='text-muted-foreground h-4 w-4 shrink-0' />
              <div>
                <p className='text-muted-foreground text-xs'>Month Total</p>
                <p className='font-medium'>{formatCurrency(patterns.monthTotal, {currencyCode: currency.code, locale})}</p>
              </div>
            </div>
            <div className='border-border flex items-center gap-2 rounded-lg border p-2'>
              <TbCalendar className='text-muted-foreground h-4 w-4 shrink-0' />
              <div>
                <p className='text-muted-foreground text-xs'>Shopping Days</p>
                <p className='font-medium'>{patterns.shoppingDaysCount}</p>
              </div>
            </div>
          </div>

          {/* Shopping Pattern Insight */}
          {patterns.avgDaysBetween > 0 && (
            <div className='border-border flex w-full items-center gap-2 rounded-lg border p-3'>
              <TbTrendingUp className='text-muted-foreground h-4 w-4 shrink-0' />
              <p className='text-muted-foreground text-xs'>
                You shop every <span className='text-foreground font-medium'>{patterns.avgDaysBetween.toFixed(0)} days</span> on average
                {patterns.avgPerTrip > 0 && (
                  <>
                    , spending{" "}
                    <span className='text-foreground font-medium'>
                      {formatCurrency(patterns.avgPerTrip, {currencyCode: currency.code, locale})}
                    </span>{" "}
                    per trip
                  </>
                )}
              </p>
            </div>
          )}

          {/* Most Active Day Insight */}
          {invoices.length > 5 && (
            <div className='border-border flex w-full items-center gap-2 rounded-lg border p-3'>
              <TbCalendar className='text-muted-foreground h-4 w-4 shrink-0' />
              <p className='text-muted-foreground text-xs'>
                Most active on <span className='text-foreground font-medium'>{getWeekdayName(patterns.mostActiveWeekday, locale)}s</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
