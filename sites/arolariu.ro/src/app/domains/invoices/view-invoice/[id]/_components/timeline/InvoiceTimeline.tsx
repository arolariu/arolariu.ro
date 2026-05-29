"use client";

/**
 * @fileoverview Main invoice timeline component for the left pane.
 * @module components/invoice/timeline/invoice-timeline
 */

import {Badge, Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {TbCalendar} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import {generateTimelineFromInvoice, getEventIcon, groupEventsByDate} from "../../_utils/timeline";
import styles from "./InvoiceTimeline.module.scss";
import {TimelineItem} from "./TimelineItem";
import {TimelineSharedWithList} from "./TimelineSharedWithList";

/**
 * Renders a comprehensive timeline of invoice events with tooltips and sharing info.
 * Designed for the left pane of the invoice view.
 *
 * @param {InvoiceTimelineProps} props - Component props
 * @returns {JSX.Element} The invoice timeline component
 *
 * @example
 * \`\`\`tsx
 * <InvoiceTimeline invoice={invoice} className="col-span-1" />
 * \`\`\`
 */
export function InvoiceTimeline(): React.JSX.Element {
  const t = useTranslations();
  const locale = useLocale();
  const {invoice} = useInvoiceContext();
  const events = generateTimelineFromInvoice(invoice);
  const groupedEvents = groupEventsByDate(events, locale);
  const totalEvents = events.length;

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <div className={styles["headerRow"]}>
          <CardTitle className={styles["cardTitle"]}>
            <TbCalendar className={styles["calendarIcon"]} />
            {t((m) => m.pages.invoices.viewInvoice.invoiceTimeline.title)}
          </CardTitle>
          <Badge
            variant='secondary'
            className={styles["badge"]}>
            {t((m) => m.pages.invoices.viewInvoice.invoiceTimeline.eventCount, {count: totalEvents})}
          </Badge>
        </div>
        <p className={styles["subtitle"]}>{t((m) => m.pages.invoices.viewInvoice.invoiceTimeline.subtitle)}</p>
      </CardHeader>

      <CardContent className={styles["cardContent"]}>
        {/* Timeline events grouped by date */}
        {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
          <div
            key={dateKey}
            className={styles["dateGroup"]}>
            <p className={styles["dateLabel"]}>{dateKey}</p>
            <div className={styles["eventsContainer"]}>
              {dateEvents.map((event, idx) => (
                <TimelineItem
                  key={event.id}
                  event={event}
                  icon={getEventIcon(event)}
                  isLast={idx === dateEvents.length - 1}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Shared with section */}
        <TimelineSharedWithList />
      </CardContent>
    </Card>
  );
}
