/**
 * @fileoverview Main invoice timeline component for the left pane.
 * @module components/invoice/timeline/invoice-timeline
 */

"use client";

import {Badge, Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {TbCalendar} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import {generateTimelineFromInvoice, getEventIcon, groupEventsByDate} from "../../_utils/timeline";
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
  const {invoice} = useInvoiceContext();
  const events = generateTimelineFromInvoice(invoice);
  const groupedEvents = groupEventsByDate(events);
  const totalEvents = events.length;

  return (
    <Card className='transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-4'>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <TbCalendar className='text-muted-foreground h-4 w-4' />
            Invoice Timeline
          </CardTitle>
          <Badge
            variant='secondary'
            className='text-xs'>
            {totalEvents} {totalEvents === 1 ? "event" : "events"}
          </Badge>
        </div>
        <p className='text-muted-foreground mt-1 text-xs'>Complete history of actions and changes</p>
      </CardHeader>

      <CardContent className='space-y-6'>
        {/* Timeline events grouped by date */}
        {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
          <div
            key={dateKey}
            className='space-y-3'>
            <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>{dateKey}</p>
            <div className='space-y-0'>
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
