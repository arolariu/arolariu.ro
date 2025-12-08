"use client";

import {generateRandomInvoices} from "@/data/mocks";
import {formatCurrency} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import {Card, CardContent, CardHeader, CardTitle, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {useLocale} from "next-intl";
import {TbCalendar, TbTrendingUp} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";

type DayData = {
  date: number;
  amount: number;
  invoiceCount: number;
  isCurrent: boolean;
};

function getMonthCalendarData(invoice: Invoice): {
  year: number;
  month: number;
  monthName: string;
  days: (DayData | null)[];
  avgDaysBetween: number;
} {
  const currentDate = new Date(invoice.paymentInformation.transactionDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = new Intl.DateTimeFormat("en-US", {month: "long"}).format(currentDate);

  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Combine all invoices including current
  const allInvoices = generateRandomInvoices(50);

  // Filter invoices for this month
  const monthInvoices = allInvoices.filter((inv) => {
    const invDate = new Date(inv.createdAt);
    return invDate.getMonth() === month && invDate.getFullYear() === year;
  });

  // Create spending map by day
  const spendingByDay = monthInvoices.reduce(
    (acc, inv) => {
      const day = new Date(inv.createdAt).getDate();
      if (!acc[day]) {
        acc[day] = {amount: 0, count: 0};
      }
      acc[day].amount += inv.paymentInformation.totalCostAmount;
      acc[day].count += 1;
      return acc;
    },
    {} as Record<number, {amount: number; count: number}>,
  );

  // Build calendar array with empty slots for alignment
  const days: (DayData | null)[] = [];

  // Add empty slots for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add actual days
  const currentDay = currentDate.getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const daySpending = spendingByDay[d];
    days.push({
      date: d,
      amount: daySpending?.amount || 0,
      invoiceCount: daySpending?.count || 0,
      isCurrent: d === currentDay,
    });
  }

  // Calculate average days between shopping trips
  const shoppingDays = Object.keys(spendingByDay)
    .map(Number)
    .sort((a, b) => a - b);
  let totalGap = 0;
  for (let i = 1; i < shoppingDays.length; i++) {
    totalGap += shoppingDays[i] - shoppingDays[i - 1];
  }
  const avgDaysBetween = shoppingDays.length > 1 ? totalGap / (shoppingDays.length - 1) : 0;

  return {year, month, monthName, days, avgDaysBetween};
}

function getIntensityClass(amount: number): string {
  if (amount === 0) return "bg-muted/50";
  if (amount < 100) return "bg-primary/20";
  if (amount < 200) return "bg-primary/40";
  if (amount < 300) return "bg-primary/60";
  return "bg-primary/80";
}

export function ShoppingCalendarCard(): React.JSX.Element {
  const locale = useLocale();
  const {invoice} = useInvoiceContext();
  const {monthName, year, days, avgDaysBetween} = getMonthCalendarData(invoice);
  const currency = invoice.paymentInformation.currency;
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <Card className='transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbCalendar className='text-muted-foreground h-4 w-4' />
          Shopping Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Month label */}
        <p className='text-center text-sm font-medium'>
          {monthName} {year}
        </p>

        {/* Calendar grid */}
        <div className='grid grid-cols-7 gap-1'>
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div
              key={day}
              className='text-muted-foreground py-1 text-center text-xs font-medium'>
              {day}
            </div>
          ))}

          {/* Calendar days */}
          <TooltipProvider>
            {days.map((day, idx) => (
              <div
                key={idx}
                className='aspect-square'>
                {day ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex h-full w-full items-center justify-center rounded-sm text-xs transition-colors ${getIntensityClass(
                          day.amount,
                        )} ${
                          day.isCurrent ? "ring-primary ring-offset-background font-bold ring-2 ring-offset-1" : ""
                        } ${day.amount > 0 ? "hover:ring-primary/50 cursor-pointer hover:ring-1" : ""}`}>
                        {day.date}
                      </div>
                    </TooltipTrigger>
                    {day.amount > 0 && (
                      <TooltipContent
                        side='top'
                        className='text-xs'>
                        <p className='font-medium'>{formatCurrency(day.amount, {currencyCode: currency.code, locale})}</p>
                        <p className='text-muted-foreground'>
                          {day.invoiceCount} {day.invoiceCount === 1 ? "invoice" : "invoices"}
                        </p>
                        {day.isCurrent && <p className='text-primary mt-1 font-medium'>Current invoice</p>}
                      </TooltipContent>
                    )}
                  </Tooltip>
                ) : (
                  <div className='h-full w-full' />
                )}
              </div>
            ))}
          </TooltipProvider>
        </div>

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
          <div className='border-border flex items-center gap-2 rounded-lg border p-3'>
            <TbTrendingUp className='text-muted-foreground h-4 w-4 shrink-0' />
            <p className='text-muted-foreground text-xs'>
              You shop every <span className='text-foreground font-medium'>{avgDaysBetween.toFixed(0)} days</span> on average
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
