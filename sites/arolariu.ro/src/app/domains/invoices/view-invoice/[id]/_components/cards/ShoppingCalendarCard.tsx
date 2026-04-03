"use client";

import {formatCurrency, toSafeDate} from "@/lib/utils.generic";
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
import {useLocale, useTranslations} from "next-intl";
import {createContext, use, useMemo} from "react";
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
  const context = use(CalendarDataContext);
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
  readonly t: ReturnType<typeof useTranslations>;
}

/** Renders the invoice names list in the tooltip */
function InvoiceNamesList({data, t}: Readonly<{data: DayData; t: ReturnType<typeof useTranslations>}>): React.JSX.Element | null {
  if (data.invoiceNames.length === 0) return null;

  return (
    <div className={styles["tooltipBorder"]}>
      {data.invoiceNames.slice(0, 3).map((name, index) => {
        const invoiceId = data.invoiceIds[index];
        if (!invoiceId) return null;

        return (
          <a
            key={invoiceId}
            href={`/domains/invoices/view-invoice/${invoiceId}/`}
            target='_blank'
            rel='noopener noreferrer'
            className={styles["invoiceLink"]}>
            • {name}
          </a>
        );
      })}
      {data.invoiceNames.length > 3 && (
        <p className={styles["moreText"]}>{t("tooltip.more", {count: String(data.invoiceNames.length - 3)})}</p>
      )}
    </div>
  );
}

/** Renders the historical comparison section in the tooltip */
function HistoricalComparisonSection({
  historicalData,
  t,
}: Readonly<{historicalData: DayHistoricalComparison; t: ReturnType<typeof useTranslations>}>): React.JSX.Element {
  const ArrowIcon = historicalData.isAboveAverage ? TbArrowUp : TbArrowDown;
  const colorClass = historicalData.isAboveAverage ? styles["colorRed"] : styles["colorGreen"];

  return (
    <div className={styles["historicalRow"]}>
      <ArrowIcon className={`${styles["iconXs"]} ${colorClass}`} />
      <span className={colorClass}>{Math.abs(historicalData.percentageDiff).toFixed(0)}%</span>
      <span className={styles["moreText"]}>{t("tooltip.vsAverage", {years: String(historicalData.yearsWithData)})}</span>
    </div>
  );
}

/** Renders the tooltip content for a day with spending data */
function DayTooltipContent(props: DayTooltipContentProps): React.JSX.Element {
  const {amount, count, locale, currency, data, historicalData, isCurrentInvoiceDate, t} = props;

  return (
    <TooltipContent
      side='top'
      className={styles["dayTooltip"]}>
      <div>
        <p className={styles["tooltipLabel"]}>{formatCurrency(amount, {currencyCode: currency.code, locale})}</p>
        <p className={styles["tooltipCount"]}>{t("tooltip.invoiceCount", {count: String(count)})}</p>
      </div>
      {data ? (
        <InvoiceNamesList
          data={data}
          t={t}
        />
      ) : null}
      {historicalData ? (
        <HistoricalComparisonSection
          historicalData={historicalData}
          t={t}
        />
      ) : null}
      {isCurrentInvoiceDate ? <Badge className={styles["badgeMt"]}>{t("tooltip.currentInvoice")}</Badge> : null}
    </TooltipContent>
  );
}

/** Checks if two dates are the same day */
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getDate() === date2.getDate() && date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
}

/** Custom day button component that renders spending data from context */
function CustomDayButton({
  day,
  className = "",
  disabled = false,
  "aria-label": ariaLabel,
  "aria-pressed": ariaPressed,
  tabIndex = 0,
}: DayButtonProps): React.JSX.Element {
  const {locale, currency, month, transactionDate, spendingByDay, historicalByDay, maxDayAmount} = useCalendarData();
  const t = useTranslations("IMS--Cards.shoppingCalendarCard");
  const {date} = day;
  const dayNum = date.getDate();
  const isCurrentMonth = date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
  const data = isCurrentMonth ? spendingByDay[dayNum] : undefined;
  const historicalData = isCurrentMonth ? historicalByDay[dayNum] : undefined;
  const amount = data?.amount ?? 0;
  const count = data?.count ?? 0;
  const isCurrentInvoiceDate = isSameDay(date, transactionDate);
  const intensityClassSuffix = getSpendingIntensityClass(amount, maxDayAmount);
  const intensityClass = intensityClassSuffix ? styles[intensityClassSuffix] : "";
  const highlightClass = isCurrentInvoiceDate ? styles["dayButtonHighlight"] : "";

  const button = (
    <Button
      variant='ghost'
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      tabIndex={tabIndex}
      className={`${styles["dayButton"]} ${intensityClass} ${highlightClass} ${className}`}>
      <time dateTime={date.toISOString()}>{date.getDate()}</time>
    </Button>
  );

  if (amount === 0) return button;

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <DayTooltipContent
        amount={amount}
        count={count}
        locale={locale}
        currency={currency}
        data={data}
        historicalData={historicalData}
        isCurrentInvoiceDate={isCurrentInvoiceDate}
        t={t}
      />
    </Tooltip>
  );
}

export function ShoppingCalendarCard(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations("IMS--Cards.shoppingCalendarCard");
  const {invoice} = useInvoiceContext();
  const transactionDate = useMemo(
    () => toSafeDate(invoice.paymentInformation.transactionDate),
    [invoice.paymentInformation.transactionDate],
  );
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
    <CalendarDataContext value={calendarDataValue}>
      <TooltipProvider>
        <Card className={styles["card"]}>
          <CardHeader className={styles["cardHeader"]}>
            <CardTitle className={styles["titleRow"]}>
              <TbCalendar className={styles["titleIcon"]} />
              {t("title")}
              <Tooltip>
                <TooltipTrigger render={<TbInfoCircle className={styles["infoIcon"]} />} />
                <TooltipContent
                  side='top'
                  className={styles["tooltipXs"]}>
                  {hasHydrated && invoices.length > 1
                    ? t("tooltip.basedOnCachedInvoices", {count: String(invoices.length)})
                    : t("tooltip.currentInvoiceOnly")}
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className={styles["contentCentered"]}>
            <Calendar
              mode='single'
              selected={transactionDate}
              month={month}
              disableNavigation
              hideNavigation
              weekStartsOn={1}
              ISOWeek
              className={styles["calendar"]}
              components={{
                DayButton: CustomDayButton,
              }}
            />

            {/* Legend */}
            <div className={styles["legend"]}>
              <span>{t("legend.less")}</span>
              <div className={styles["legendBlocks"]}>
                <div className={`${styles["legendBlock"]} ${styles["legendBlock1"]}`} />
                <div className={`${styles["legendBlock"]} ${styles["legendBlock2"]}`} />
                <div className={`${styles["legendBlock"]} ${styles["legendBlock3"]}`} />
                <div className={`${styles["legendBlock"]} ${styles["legendBlock4"]}`} />
                <div className={`${styles["legendBlock"]} ${styles["legendBlock5"]}`} />
              </div>
              <span>{t("legend.more")}</span>
            </div>

            <Separator />

            {/* Month Statistics */}
            <div className={styles["statsGrid"]}>
              <div className={styles["statBox"]}>
                <TbShoppingCart className={styles["iconMutedShrink"]} />
                <div>
                  <p className={styles["statLabel"]}>{t("stats.monthTotal")}</p>
                  <p className={styles["statValue"]}>{formatCurrency(patterns.monthTotal, {currencyCode: currency.code, locale})}</p>
                </div>
              </div>
              <div className={styles["statBox"]}>
                <TbCalendar className={styles["iconMutedShrink"]} />
                <div>
                  <p className={styles["statLabel"]}>{t("stats.shoppingDays")}</p>
                  <p className={styles["statValue"]}>{patterns.shoppingDaysCount}</p>
                </div>
              </div>
            </div>

            {/* Shopping Pattern Insight */}
            {patterns.avgDaysBetween > 0 ? (
              <div className={styles["insightBox"]}>
                <TbTrendingUp className={styles["iconMutedShrink"]} />
                <p className={styles["insightText"]}>
                  {t("insights.shopEveryPrefix")}{" "}
                  <span className={styles["insightHighlight"]}>{t("insights.days", {count: patterns.avgDaysBetween.toFixed(0)})}</span>{" "}
                  {t("insights.onAverage")}
                  {patterns.avgPerTrip > 0 ? (
                    <>
                      {t("insights.spendingPrefix")}{" "}
                      <span className={styles["insightHighlight"]}>
                        {formatCurrency(patterns.avgPerTrip, {currencyCode: currency.code, locale})}
                      </span>
                      {t("insights.perTrip")}
                    </>
                  ) : null}
                </p>
              </div>
            ) : null}

            {/* Most Active Day Insight */}
            {invoices.length > 5 ? (
              <div className={styles["insightBox"]}>
                <TbCalendar className={styles["iconMutedShrink"]} />
                <p className={styles["insightText"]}>
                  {t("insights.mostActiveOn")}{" "}
                  <span className={styles["insightHighlight"]}>
                    {t("insights.weekdayLabel", {weekday: getWeekdayName(patterns.mostActiveWeekday, locale)})}
                  </span>
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </TooltipProvider>
    </CalendarDataContext>
  );
}
