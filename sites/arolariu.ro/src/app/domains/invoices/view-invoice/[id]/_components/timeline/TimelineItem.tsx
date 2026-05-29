"use client";

/**
 * @fileoverview Individual timeline item component with tooltip support.
 * @module components/invoice/timeline/timeline-item
 */

import {formatDate} from "@/lib/utils.generic";
import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {useLocale, type TranslationValues} from "next-intl";
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {TbInfoCircle} from "react-icons/tb";
import {TimelineEvent, TimelineEventType} from "../../_types/timeline";
import styles from "./TimelineItem.module.scss";

/** Translation function accepting a message key and optional interpolation values. */
type TranslateFn = {
  (key: string): string;
  (key: string, values: TranslationValues): string;
};

function createTimelineTranslator(t: ReturnType<typeof useTranslations>): TranslateFn {
  return ((key: string, values?: TranslationValues) =>
    t(selectorFromPath(`sections.invoices.timeline.item.${key}`), values)) as TranslateFn;
}

function getEventTitle(event: TimelineEvent, translate: TranslateFn): string {
  switch (event.type) {
    case TimelineEventType.CREATED:
      return translate("events.created.title");
    case TimelineEventType.AI_ANALYSIS:
      return translate("events.aiAnalysis.title");
    case TimelineEventType.RECIPES_GENERATED:
      return translate("events.recipesGenerated.title");
    case TimelineEventType.SHARED:
      return translate("events.shared.title");
    case TimelineEventType.EDITED:
      return translate("events.edited.title");
    case TimelineEventType.EXPORTED:
      return translate("events.exported.title");
    case TimelineEventType.MARKED_IMPORTANT:
      return translate("events.markedImportant.title");
    case TimelineEventType.CATEGORIZED:
      return translate("events.categorized.title");
    default:
      return event.title;
  }
}

function getEventDescription(event: TimelineEvent, translate: TranslateFn): string {
  switch (event.type) {
    case TimelineEventType.CREATED:
      return translate("events.created.description");
    case TimelineEventType.AI_ANALYSIS:
      return translate("events.aiAnalysis.description", {count: event.metadata?.itemCount ?? 0});
    case TimelineEventType.RECIPES_GENERATED:
      return translate("events.recipesGenerated.description", {count: event.metadata?.itemCount ?? 0});
    case TimelineEventType.SHARED:
      return translate("events.shared.description", {count: event.metadata?.users?.length ?? 0});
    case TimelineEventType.MARKED_IMPORTANT:
      return translate("events.markedImportant.description");
    case TimelineEventType.CATEGORIZED:
      return translate("events.categorized.description");
    default:
      return event.description;
  }
}

// eslint-disable-next-line complexity -- switch-case for event types requires enumeration
function getTooltipContent(event: TimelineEvent, translate: TranslateFn): string {
  switch (event.type) {
    case TimelineEventType.CREATED:
      return translate("tooltips.created", {method: event.metadata?.method ?? translate("fallbacks.ocr")});
    case TimelineEventType.AI_ANALYSIS:
      return translate("tooltips.aiAnalysis", {
        duration: event.metadata?.duration ?? "-",
        count: event.metadata?.itemCount ?? 0,
      });
    case TimelineEventType.RECIPES_GENERATED:
      return translate("tooltips.recipesGenerated", {count: event.metadata?.itemCount ?? 0});
    case TimelineEventType.SHARED:
      return translate("tooltips.shared", {count: event.metadata?.users?.length ?? 0});
    case TimelineEventType.CATEGORIZED:
      return translate("tooltips.categorized");
    case TimelineEventType.MARKED_IMPORTANT:
      return translate("tooltips.markedImportant");
    case TimelineEventType.EXPORTED:
      return translate("tooltips.exported", {format: event.metadata?.method ?? translate("fallbacks.pdf")});
    case TimelineEventType.EDITED:
      return translate("tooltips.edited");
    default:
      return translate("tooltips.unavailable");
  }
}

function getRelativeTimeLabel(date: Date | string, locale: string, translate: TranslateFn): string {
  const now = new Date();
  const dateObj = date instanceof Date ? date : new Date(date);
  const diffMs = dateObj.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (Math.abs(diffMinutes) < 1) {
    return translate("relativeTime.now");
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
  const t = useTranslations();
  const locale = useLocale();
  const tf = createTimelineTranslator(t);
  const tooltipContent = getTooltipContent(event, tf);
  const eventTitle = getEventTitle(event, tf);
  const eventDescription = getEventDescription(event, tf);
  const relativeTime = getRelativeTimeLabel(event.date, locale, tf);

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
                        variant='ghost'
                        size='icon'
                        className={styles["infoButton"]}
                        aria-label={t((m) => m.sections.invoices.timeline.item.aria.moreInfo, {title: eventTitle})}>
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
                      <p className={styles["confidenceText"]}>
                        {t((m) => m.sections.invoices.timeline.item.confidence, {value: String(event.metadata!.confidence)})}
                      </p>
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
