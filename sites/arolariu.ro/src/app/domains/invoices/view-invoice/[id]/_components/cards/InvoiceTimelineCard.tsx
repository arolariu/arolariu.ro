"use client";

import {formatDate} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale} from "next-intl";
import {TbCalendar} from "react-icons/tb";
import {generateTimelineFromInvoice, getEventIcon, groupEventsByDate} from "../../_utils/timeline";
import styles from "./InvoiceTimelineCard.module.scss";

type Props = Readonly<{
  invoice: Invoice;
}>;

export function InvoiceTimelineCard({invoice}: Readonly<Props>): React.JSX.Element {
  const locale = useLocale();
  const events = generateTimelineFromInvoice(invoice);
  const groupedEvents = groupEventsByDate(events, locale);

  return (
    <Card className='transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbCalendar className='text-muted-foreground h-4 w-4' />
          Invoice Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
          <main
            key={dateKey}
            className={styles["dateGroup"]}>
            <p className={styles["dateLabel"]}>{dateKey}</p>
            <main className={styles["eventsColumn"]}>
              {dateEvents.map((event) => (
                <main
                  key={event.id}
                  className={styles["eventItem"]}>
                  <main className={styles["eventDot"]}>
                    {event.icon ?? getEventIcon(event)}
                  </main>
                  <main className={styles["eventContent"]}>
                    <main className={styles["eventDetails"]}>
                      <p className={styles["eventTitle"]}>{event.title}</p>
                      <p className={styles["eventDescription"]}>{event.description}</p>
                    </main>
                    <span className={styles["eventDate"]}>{formatDate(event.date, {locale})}</span>
                  </main>
                </main>
              ))}
            </main>
          </main>
        ))}
      </CardContent>
    </Card>
  );
}
