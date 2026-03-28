/**
 * @fileoverview Individual timeline item component with tooltip support.
 * @module components/invoice/timeline/timeline-item
 */

"use client";

import {formatDate} from "@/lib/utils.generic";
import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
import {TbInfoCircle} from "react-icons/tb";
import {TimelineEvent, TimelineEventType} from "../../_types/timeline";
import styles from "./TimelineItem.module.scss";

function getEventTitle(event: TimelineEvent, t: ReturnType<typeof useTranslations>): string {
  switch (event.type) {
    case TimelineEventType.CREATED:
      return t("events.created.title");
    case TimelineEventType.AI_ANALYSIS:
      return t("events.aiAnalysis.title");
    case TimelineEventType.RECIPES_GENERATED:
      return t("events.recipesGenerated.title");
    case TimelineEventType.SHARED:
      return t("events.shared.title");
    case TimelineEventType.EDITED:
      return t("events.edited.title");
    case TimelineEventType.EXPORTED:
      return t("events.exported.title");
    case TimelineEventType.MARKED_IMPORTANT:
      return t("events.markedImportant.title");
    case TimelineEventType.CATEGORIZED:
      return t("events.categorized.title");
    default:
      return event.title;
  }
}

function getEventDescription(event: TimelineEvent, t: ReturnType<typeof useTranslations>): string {
  switch (event.type) {
    case TimelineEventType.CREATED:
      return t("events.created.description");
    case TimelineEventType.AI_ANALYSIS:
      return t("events.aiAnalysis.description", {count: event.metadata?.itemCount ?? 0});
    case TimelineEventType.RECIPES_GENERATED:
      return t("events.recipesGenerated.description", {count: event.metadata?.itemCount ?? 0});
    case TimelineEventType.SHARED:
      return t("events.shared.description", {count: event.metadata?.users?.length ?? 0});
    case TimelineEventType.MARKED_IMPORTANT:
      return t("events.markedImportant.description");
    case TimelineEventType.CATEGORIZED:
      return t("events.categorized.description");
    default:
      return event.description;
  }
}

// eslint-disable-next-line complexity -- switch-case for event types requires enumeration
function getTooltipContent(event: TimelineEvent, t: ReturnType<typeof useTranslations>): string {
  switch (event.type) {
    case TimelineEventType.CREATED:
      return t("tooltips.created", {method: event.metadata?.method ?? t("fallbacks.ocr")});
    case TimelineEventType.AI_ANALYSIS:
      return t("tooltips.aiAnalysis", {
        duration: event.metadata?.duration ?? "-",
        count: event.metadata?.itemCount ?? 0,
      });
    case TimelineEventType.RECIPES_GENERATED:
      return t("tooltips.recipesGenerated", {count: event.metadata?.itemCount ?? 0});
    case TimelineEventType.SHARED:
      return t("tooltips.shared", {count: event.metadata?.users?.length ?? 0});
    case TimelineEventType.CATEGORIZED:
      return t("tooltips.categorized");
    case TimelineEventType.MARKED_IMPORTANT:
      return t("tooltips.markedImportant");
    case TimelineEventType.EXPORTED:
      return t("tooltips.exported", {format: event.metadata?.method ?? t("fallbacks.pdf")});
    case TimelineEventType.EDITED:
      return t("tooltips.edited");
    default:
      return t("tooltips.unavailable");
  }
}

function getRelativeTimeLabel(date: Date, locale: string, t: ReturnType<typeof useTranslations>): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (Math.abs(diffMinutes) < 1) {
    return t("relativeTime.now");
  }

  const formatter = new Intl.RelativeTimeFormat(locale, {numeric: "auto"});
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

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
  const t = useTranslations("Invoices.ViewInvoice.timelineItem");
  const locale = useLocale();
  const tooltipContent = getTooltipContent(event, t);
  const eventTitle = getEventTitle(event, t);
  const eventDescription = getEventDescription(event, t);
  const relativeTime = getRelativeTimeLabel(event.date, locale, t);

  return (
    <div className={`${styles["item"]} ${isLast ? styles["isLast"] : ""}`}>
      {/* Connector line */}
      {!isLast && <div className={styles["connectorLine"]} />}

      <div className={styles["contentRow"]}>
        {/* Icon circle */}
        <div className={`${styles["iconCircle"]} ${event.completed ? styles["iconCompleted"] : styles["iconPending"]}`}>{icon}</div>

        {/* Content */}
        <div className={styles["contentBody"]}>
          <div className={styles["titleRow"]}>
            <div className={styles["titleContent"]}>
              <p className={styles["eventTitle"]}>{eventTitle}</p>
              {/* Info icon with tooltip */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type='button'
                        className={styles["infoButton"]}
                        aria-label={t("aria.moreInfo", {title: eventTitle})}>
                        <TbInfoCircle className={styles["infoIcon"]} />
                      </Button>
                    }
                  />
                  <TooltipContent
                    side='right'
                    className={styles["tooltipContent"]}
                    sideOffset={8}>
                    <p>{tooltipContent}</p>
                    {Boolean(event.metadata?.confidence) && (
                      <p className={styles["confidenceText"]}>{t("confidence", {value: String(event.metadata!.confidence)})}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className={styles["dateLabel"]}>{formatDate(event.date, {locale})}</span>
          </div>
          <p className={styles["description"]}>{eventDescription}</p>
          <p className={styles["relativeTime"]}>{relativeTime}</p>
        </div>
      </div>
    </div>
  );
}
