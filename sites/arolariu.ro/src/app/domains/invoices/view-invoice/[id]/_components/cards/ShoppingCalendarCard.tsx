"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {useInvoicesStore} from "@/stores";
import type {Currency} from "@/types/DDD";
import {
  Badge,
  Button,
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
import {createContext, useContext, useMemo} from "react";
import {TbArrowDown, TbArrowUp, TbCalendar, TbInfoCircle, TbShoppingCart, TbTrendingUp} from "react-icons/tb";
import {useShallow} from "zustand/react/shallow";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import {
  computeShoppingPatterns,
  getSpendingIntensityClass,
  getWeekdayName,
  type DayData,
  type DayHistoricalComparison,
} from "../../_utils/analytics";
import styles from "./ShoppingCalendarCard.module.scss";

/** Props type for the Calendar's DayButton slot component */
type DayButtonProps = {
  readonly day: {date: Date};
  readonly className?: string;
  readonly disabled?: boolean;
  readonly "aria-label"?: string;
  readonly "aria-pressed"?: boolean | "false" | "true" | "mixed";
  readonly tabIndex?: number;
};

/** Context for sharing calendar data with CustomDayButton */
type CalendarDataContextType = {
  locale: string;
  currency: Currency;
  month: Date;
  transactionDate: Date;
  spendingByDay: Record<number, DayData>;
  historicalByDay: Record<number, DayHistoricalComparison>;
  maxDayAmount: number;
};

const CalendarDataContext = createContext<CalendarDataContextType | null>(null);

function useCalendarData(): CalendarDataContextType {
  const context = useContext(CalendarDataContext);
  if (!context) {
    throw new Error("useCalendarData must be used within CalendarDataContext.Provider");
  }
  return context;
}

/** Props for the day tooltip content component */
interface DayTooltipContentProps {
  readonly amount: number;
  readonly count: number;
  readonly locale: string;
  readonly currency: Currency;
  readonly data: DayData | undefined;
  readonly historicalData: DayHistoricalComparison | undefined;
  readonly isCurrentInvoiceDate: boolean;
}

/** Renders the invoice names list in the tooltip */
function InvoiceNamesList({data}: Readonly<{data: DayData}>): React.JSX.Element | null {
  if (data.invoiceNames.length === 0) return null;

  return (
    <main className={styles["tooltipBorder"]}>
      {data.invoiceNames.slice(0, 3).map((name) => (
        <p
          key={name}
          className={styles["invoiceName"]}>
          • {name}
        </p>
      ))}
      {data.invoiceNames.length > 3 && <p className={styles["moreText"]}>+{data.invoiceNames.length - 3} more</p>}
    </main>
  );
}

/** Renders the historical comparison section in the tooltip */
function HistoricalComparisonSection({historicalData}: Readonly<{historicalData: DayHistoricalComparison}>): React.JSX.Element {
  const ArrowIcon = historicalData.isAboveAverage ? TbArrowUp : TbArrowDown;
  const colorClass = historicalData.isAboveAverage ? "text-red-500" : "text-green-500";

  return (
    <main className={styles["historicalRow"]}>
      <ArrowIcon className={`h-3 w-3 ${colorClass}`} />
      <span className={colorClass}>{Math.abs(historicalData.percentageDiff).toFixed(0)}%</span>
      <span className={styles["moreText"]}>vs avg ({historicalData.yearsWithData}y data)</span>
    </main>
  );
}

/** Renders the tooltip content for a day with spending data */
function DayTooltipContent(props: DayTooltipContentProps): React.JSX.Element {
  const {amount, count, locale, currency, data, historicalData, isCurrentInvoiceDate} = props;

  return (
    <TooltipContent
      side='top'
      className='max-w-xs space-y-2 text-xs'>
      <main>
        <p className={styles["tooltipLabel"]}>{formatCurrency(amount, {currencyCode: currency.code, locale})}</p>
        <p className={styles["tooltipCount"]}>
          {count} {count === 1 ? "invoice" : "invoices"}
        </p>
      </main>
      {data ? <InvoiceNamesList data={data} /> : null}
      {historicalData ? <HistoricalComparisonSection historicalData={historicalData} /> : null}
      {isCurrentInvoiceDate ? <Badge className='mt-1'>Current invoice</Badge> : null}
    </TooltipContent>
  );
}

/** Checks if two dates are the same day */
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getDate() === date2.getDate() && date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
}

/** Custom day button component that renders spending data from context */
function CustomDayButton(props: DayButtonProps): React.JSX.Element {
  const {day, className, ...rest} = props;
  const {locale, currency, month, transactionDate, spendingByDay, historicalByDay, maxDayAmount} = useCalendarData();
  const {date} = day;
  const dayNum = date.getDate();
  const isCurrentMonth = date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
  const data = isCurrentMonth ? spendingByDay[dayNum] : undefined;
  const historicalData = isCurrentMonth ? historicalByDay[dayNum] : undefined;
  const amount = data?.amount ?? 0;
  const count = data?.count ?? 0;
  const isCurrentInvoiceDate = isSameDay(date, transactionDate);
  const intensityClass = getSpendingIntensityClass(amount, maxDayAmount);
  const ringClass = isCurrentInvoiceDate ? "ring-primary ring-2 ring-offset-1" : "";

  const button = (
    <Button
      variant='ghost'
      disabled={rest.disabled}
      aria-label={rest["aria-label"]}
      aria-pressed={rest["aria-pressed"]}
      tabIndex={rest.tabIndex}
      className={`h-9 w-9 p-0 font-normal aria-selected:opacity-100 ${intensityClass} ${ringClass} flex items-center justify-center rounded-md transition-all ${className}`}>
      <time dateTime={date.toISOString()}>{date.getDate()}</time>
    </Button>
  );

  if (amount === 0) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <DayTooltipContent
        amount={amount}
        count={count}
        locale={locale}
        currency={currency}
        data={data}
        historicalData={historicalData}
        isCurrentInvoiceDate={isCurrentInvoiceDate}
      />
    </Tooltip>
  );
}

export function ShoppingCalendarCard(): React.JSX.Element {
  const locale = useLocale();
  const {invoice} = useInvoiceContext();
  const transactionDate = useMemo(() => new Date(invoice.paymentInformation.transactionDate), [invoice.paymentInformation.transactionDate]);
  const month = useMemo(() => new Date(transactionDate.getFullYear(), transactionDate.getMonth(), 1), [transactionDate]);
  const {currency} = invoice.paymentInformation;

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

  // Context value for passing data to CustomDayButton
  const calendarDataValue = useMemo<CalendarDataContextType>(
    () => ({
      locale,
      currency,
      month,
      transactionDate,
      spendingByDay: patterns.spendingByDay,
      historicalByDay: patterns.historicalByDay,
      maxDayAmount,
    }),
    [locale, currency, month, transactionDate, patterns.spendingByDay, patterns.historicalByDay, maxDayAmount],
  );

  return (
    <CalendarDataContext.Provider value={calendarDataValue}>
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
                DayButton: CustomDayButton,
              }}
            />

            {/* Legend */}
            <main className={styles["legend"]}>
              <span>Less</span>
              <main className={styles["legendBlocks"]}>
                <main className={`${styles["legendBlock"]} ${styles["legendBlock1"]}`} />
                <main className={`${styles["legendBlock"]} ${styles["legendBlock2"]}`} />
                <main className={`${styles["legendBlock"]} ${styles["legendBlock3"]}`} />
                <main className={`${styles["legendBlock"]} ${styles["legendBlock4"]}`} />
                <main className={`${styles["legendBlock"]} ${styles["legendBlock5"]}`} />
              </main>
              <span>More</span>
            </main>

            <Separator />

            {/* Month Statistics */}
            <main className={styles["statsGrid"]}>
              <main className={styles["statBox"]}>
                <TbShoppingCart className='text-muted-foreground h-4 w-4 shrink-0' />
                <main>
                  <p className={styles["statLabel"]}>Month Total</p>
                  <p className={styles["statValue"]}>{formatCurrency(patterns.monthTotal, {currencyCode: currency.code, locale})}</p>
                </main>
              </main>
              <main className={styles["statBox"]}>
                <TbCalendar className='text-muted-foreground h-4 w-4 shrink-0' />
                <main>
                  <p className={styles["statLabel"]}>Shopping Days</p>
                  <p className={styles["statValue"]}>{patterns.shoppingDaysCount}</p>
                </main>
              </main>
            </main>

            {/* Shopping Pattern Insight */}
            {patterns.avgDaysBetween > 0 ? (
              <main className={styles["insightBox"]}>
                <TbTrendingUp className='text-muted-foreground h-4 w-4 shrink-0' />
                <p className={styles["insightText"]}>
                  You shop every <span className={styles["insightHighlight"]}>{patterns.avgDaysBetween.toFixed(0)} days</span> on average
                  {patterns.avgPerTrip > 0 ? (
                    <>
                      , spending{" "}
                      <span className={styles["insightHighlight"]}>
                        {formatCurrency(patterns.avgPerTrip, {currencyCode: currency.code, locale})}
                      </span>{" "}
                      per trip
                    </>
                  ) : null}
                </p>
              </main>
            ) : null}

            {/* Most Active Day Insight */}
            {invoices.length > 5 ? (
              <main className={styles["insightBox"]}>
                <TbCalendar className='text-muted-foreground h-4 w-4 shrink-0' />
                <p className={styles["insightText"]}>
                  Most active on <span className={styles["insightHighlight"]}>{getWeekdayName(patterns.mostActiveWeekday, locale)}s</span>
                </p>
              </main>
            ) : null}
          </CardContent>
        </Card>
      </TooltipProvider>
    </CalendarDataContext.Provider>
  );
}
