"use client";

import {formatDate} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale} from "next-intl";
import {TbCalendar} from "react-icons/tb";
import {generateTimelineFromInvoice, getEventIcon, groupEventsByDate} from "../../_utils/timeline";

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
          <div
            key={dateKey}
            className='space-y-2'>
            <p className='text-muted-foreground text-xs font-medium'>{dateKey}</p>
            <div className='border-border space-y-2 border-l-2 pl-4'>
              {dateEvents.map((event) => (
                <div
                  key={event.id}
                  className='relative'>
                  <div className='bg-primary text-primary-foreground absolute -left-[21px] flex h-4 w-4 items-center justify-center rounded-full'>
                    {event.icon ?? getEventIcon(event)}
                  </div>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0'>
                      <p className='text-sm leading-tight font-medium'>{event.title}</p>
                      <p className='text-muted-foreground text-xs'>{event.description}</p>
                    </div>
                    <span className='text-muted-foreground shrink-0 text-xs'>{formatDate(event.date, {locale})}</span>
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
