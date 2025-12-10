/**
 * @fileoverview Individual timeline item component with tooltip support.
 * @module components/invoice/timeline/timeline-item
 */

"use client";

import {Button, cn, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {TbInfoCircle} from "react-icons/tb";
import {TimelineEvent} from "../../_types/timeline";
import {formatTimelineTime, getEventTooltipContent, getRelativeTime} from "../../_utils/timeline";

/**
 * Props for the TimelineItem component.
 * @interface TimelineItemProps
 */
interface TimelineItemProps {
  /** The timeline event to display */
  event: TimelineEvent;
  /** Icon element to display */
  icon: React.ReactNode;
  /** Whether this is the last item in the group */
  isLast?: boolean;
}

/**
 * Renders a single timeline event with icon, details, and tooltip.
 *
 * @param {TimelineItemProps} props - Component props
 * @returns {JSX.Element} The timeline item component
 *
 * @example
 * ```tsx
 * <TimelineItem
 *   event={event}
 *   icon={<Scan className="h-3.5 w-3.5" />}
 *   isLast={false}
 * />
 * ```
 */
export function TimelineItem({event, icon, isLast = false}: TimelineItemProps): React.JSX.Element {
  const tooltipContent = getEventTooltipContent(event.type, event.metadata);

  return (
    <div className={cn("relative pb-4", isLast && "pb-0")}>
      {/* Connector line */}
      {!isLast && <div className='bg-border absolute top-4 left-[7px] h-full w-0.5' />}

      <div className='flex gap-3'>
        {/* Icon circle */}
        <div
          className={cn(
            "relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
            event.completed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}>
          {icon}
        </div>

        {/* Content */}
        <div className='min-w-0 flex-1'>
          <div className='flex items-start justify-between gap-2'>
            <div className='flex min-w-0 items-center gap-1.5'>
              <p className='truncate text-sm leading-tight font-medium'>{event.title}</p>
              {/* Info icon with tooltip */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      className='text-muted-foreground hover:text-foreground inline-flex shrink-0 cursor-help transition-colors'
                      aria-label={`More info about ${event.title}`}>
                      <TbInfoCircle className='h-3.5 w-3.5' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side='right'
                    className='max-w-xs text-xs'
                    sideOffset={8}>
                    <p>{tooltipContent}</p>
                    {event.metadata?.confidence && <p className='text-muted-foreground mt-1'>Confidence: {event.metadata.confidence}%</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className='text-muted-foreground shrink-0 text-xs'>{formatTimelineTime(event.date)}</span>
          </div>
          <p className='text-muted-foreground mt-0.5 text-xs'>{event.description}</p>
          <p className='text-muted-foreground/70 mt-0.5 text-xs'>{getRelativeTime(event.date)}</p>
        </div>
      </div>
    </div>
  );
}
