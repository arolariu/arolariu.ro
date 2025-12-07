"use client";

import type {Invoice} from "@/types/invoices";
import {Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {TbCalendar, TbCheck, TbScan, TbShare2, TbSparkles} from "react-icons/tb";

type TimelineEvent = {
  date: Date;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
};

function generateTimeline(invoice: Invoice): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const createdDate = new Date(invoice.createdAt);

  // Created event
  events.push({
    date: createdDate,
    title: "Invoice Created",
    description: "Created from receipt scan",
    icon: <TbScan className='h-3.5 w-3.5' />,
    completed: true,
  });

  // AI Analysis event (same day, 2 minutes later)
  const aiDate = new Date(createdDate);
  aiDate.setMinutes(aiDate.getMinutes() + 2);
  events.push({
    date: aiDate,
    title: "AI Analysis",
    description: `${invoice.items.length} items detected`,
    icon: <TbSparkles className='h-3.5 w-3.5' />,
    completed: true,
  });

  // Recipes generated (if any)
  if (invoice.possibleRecipes.length > 0) {
    const recipeDate = new Date(createdDate);
    recipeDate.setMinutes(recipeDate.getMinutes() + 5);
    events.push({
      date: recipeDate,
      title: "Recipes Generated",
      description: `${invoice.possibleRecipes.length} recipes suggested`,
      icon: <TbCheck className='h-3.5 w-3.5' />,
      completed: true,
    });
  }

  // Shared event (if shared with anyone)
  if (invoice.sharedWith.length > 0) {
    const shareDate = new Date(createdDate);
    shareDate.setDate(shareDate.getDate() + 1);
    events.push({
      date: shareDate,
      title: "Shared",
      description: `Shared with ${invoice.sharedWith.length} people`,
      icon: <TbShare2 className='h-3.5 w-3.5' />,
      completed: true,
    });
  }

  return events;
}

function formatTimelineDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTimelineTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type Props = {
  invoice: Invoice;
};

export function InvoiceTimelineCard({invoice}: Props) {
  const events = generateTimeline(invoice);

  // Group events by date
  const groupedEvents = events.reduce(
    (acc, event) => {
      const dateKey = formatTimelineDate(event.date);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    },
    {} as Record<string, TimelineEvent[]>,
  );

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
              {dateEvents.map((event, idx) => (
                <div
                  key={idx}
                  className='relative'>
                  <div className='bg-primary text-primary-foreground absolute -left-[21px] flex h-4 w-4 items-center justify-center rounded-full'>
                    {event.icon}
                  </div>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0'>
                      <p className='text-sm leading-tight font-medium'>{event.title}</p>
                      <p className='text-muted-foreground text-xs'>{event.description}</p>
                    </div>
                    <span className='text-muted-foreground shrink-0 text-xs'>{formatTimelineTime(event.date)}</span>
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
