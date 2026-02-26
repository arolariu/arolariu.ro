"use client";

import {formatDate} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
import {TbCalendar} from "react-icons/tb";
import {generateTimelineFromInvoice, getEventIcon, groupEventsByDate} from "../../_utils/timeline";
import styles from "./InvoiceTimelineCard.module.scss";

type Props = Readonly<{
  invoice: Invoice;
}>;

export function InvoiceTimelineCard({invoice}: Readonly<Props>): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations("Invoices.ViewInvoice.invoiceTimeline");
  const events = generateTimelineFromInvoice(invoice);
  const groupedEvents = groupEventsByDate(events, locale);

  return (
    <Card className='transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbCalendar className='text-muted-foreground h-4 w-4' />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
          <div
            key={dateKey}
            className={styles["dateGroup"]}>
            <p className={styles["dateLabel"]}>{dateKey}</p>
            <div className={styles["eventsColumn"]}>
              {dateEvents.map((event) => (
                <div
                  key={event.id}
                  className={styles["eventItem"]}>
                  <div className={styles["eventDot"]}>{event.icon ?? getEventIcon(event)}</div>
                  <div className={styles["eventContent"]}>
                    <div className={styles["eventDetails"]}>
                      <p className={styles["eventTitle"]}>{event.title}</p>
                      <p className={styles["eventDescription"]}>{event.description}</p>
                    </div>
                    <span className={styles["eventDate"]}>{formatDate(event.date, {locale})}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
