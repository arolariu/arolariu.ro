/**
 * @fileoverview Individual timeline item component with tooltip support.
 * @module components/invoice/timeline/timeline-item
 */

"use client";

import {formatDate} from "@/lib/utils.generic";
import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {useLocale} from "next-intl";
import {TbInfoCircle} from "react-icons/tb";
import {TimelineEvent} from "../../_types/timeline";
import {getEventTooltipContent, getRelativeTime} from "../../_utils/timeline";
import styles from "./TimelineItem.module.scss";

/**
 * Props for the TimelineItem component.
 * @interface TimelineItemProps
 */
type Props = Readonly<{
  /** The timeline event to display */
  readonly event: TimelineEvent;
  /** Icon element to display */
  readonly icon: React.ReactNode;
  /** Whether this is the last item in the group */
  readonly isLast?: boolean;
}>;

/**
 * Renders a single timeline event with icon, details, and tooltip.
 *
 * @param {Props} props - Component props
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
export function TimelineItem({event, icon, isLast = false}: Readonly<Props>): React.JSX.Element {
  const locale = useLocale();
  const tooltipContent = getEventTooltipContent(event.type, event.metadata);

  return (
    <div className={`${styles["item"]} ${isLast ? styles["isLast"] : ""}`}>
      {/* Connector line */}
      {!isLast && <div className={styles["connectorLine"]} />}

      <div className={styles["contentRow"]}>
        {/* Icon circle */}
        <div className={`${styles["iconCircle"]} ${event.completed ? styles["iconCompleted"] : styles["iconPending"]}`}>
          {icon}
        </div>

        {/* Content */}
        <div className={styles["contentBody"]}>
          <div className={styles["titleRow"]}>
            <div className={styles["titleContent"]}>
              <p className={styles["eventTitle"]}>{event.title}</p>
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
                    {Boolean(event.metadata?.confidence) && (
                      <p className={styles["confidenceText"]}>Confidence: {event.metadata!.confidence}%</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className={styles["dateLabel"]}>{formatDate(event.date, {locale})}</span>
          </div>
          <p className={styles["description"]}>{event.description}</p>
          <p className={styles["relativeTime"]}>{getRelativeTime(event.date)}</p>
        </div>
      </div>
    </div>
  );
}
