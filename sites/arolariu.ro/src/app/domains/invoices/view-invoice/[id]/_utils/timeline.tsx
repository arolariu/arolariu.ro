/**
 * @fileoverview Helper functions for generating and formatting timeline data.
 * @module lib/utils/timeline-helpers
 */

import {formatDate} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import {Locale} from "next-intl";
import {TbCalendar, TbChefHat, TbDownload, TbFile, TbScan, TbShare2, TbSparkles, TbStar, TbTag} from "react-icons/tb";
import {type TimelineEvent, type TimelineEventMetadata, TimelineEventType} from "../_types/timeline";

/**
 * Maps event types to their corresponding icons.
 * @param {TimelineEvent} event - The timeline event
 * @returns {React.ReactElement} Icon component
 */
export function getEventIcon(event: TimelineEvent): React.ReactElement {
  const iconClass = "h-2.5 w-2.5";

  switch (event.type) {
    case TimelineEventType.CREATED:
      return <TbScan className={iconClass} />;
    case TimelineEventType.AI_ANALYSIS:
      return <TbSparkles className={iconClass} />;
    case TimelineEventType.RECIPES_GENERATED:
      return <TbChefHat className={iconClass} />;
    case TimelineEventType.SHARED:
      return <TbShare2 className={iconClass} />;
    case TimelineEventType.MARKED_IMPORTANT:
      return <TbStar className={iconClass} />;
    case TimelineEventType.CATEGORIZED:
      return <TbTag className={iconClass} />;
    case TimelineEventType.EDITED:
      return <TbFile className={iconClass} />;
    case TimelineEventType.EXPORTED:
      return <TbDownload className={iconClass} />;
    default:
      return <TbCalendar className={iconClass} />;
  }
}

/**
 * Generates a unique ID for timeline events.
 * Uses crypto.randomUUID() for secure random generation.
 * @returns {string} A unique identifier string
 */
export function generateEventId(): string {
  const uuid = crypto.randomUUID();
  return `evt_${Date.now()}_${uuid.slice(0, 8)}`;
}

/**
 * Calculates the relative time from now (e.g., "2 days ago").
 * @param {Date} date - The date to calculate relative time for
 * @returns {string} Relative time string
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }
  if (diffHours > 0) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  if (diffMins > 0) {
    return diffMins === 1 ? "1 minute ago" : `${diffMins} minutes ago`;
  }
  return "Just now";
}

/** Helper to build tooltip content by appending optional metadata fields */
function buildTooltipContent(baseMessage: string, ...parts: Array<string | undefined>): string {
  const filteredParts = parts.filter(Boolean);
  if (filteredParts.length === 0) return baseMessage;
  return `${baseMessage} ${filteredParts.join(" ")}`;
}

/** Extracts formatted metadata parts for tooltip generation */
function extractMetadataParts(metadata?: TimelineEventMetadata): {
  methodPart: string | undefined;
  confidencePart: string | undefined;
  durationPart: string | undefined;
  itemCountPart: string | undefined;
  recipeCountPart: string | undefined;
  usersPart: string | undefined;
  notesPart: string | undefined;
  formatPart: string | undefined;
  categoryPart: string | undefined;
} {
  return {
    methodPart: metadata?.method ? `Method: ${metadata.method}.` : undefined,
    confidencePart: metadata?.confidence ? `Accuracy: ${metadata.confidence}%.` : undefined,
    durationPart: metadata?.duration ? `Processing time: ${metadata.duration}.` : undefined,
    itemCountPart: metadata?.itemCount ? `Items analyzed: ${metadata.itemCount}.` : undefined,
    recipeCountPart: metadata?.itemCount ? `${metadata.itemCount} recipes generated.` : undefined,
    usersPart: metadata?.users?.length ? `Shared with: ${metadata.users.join(", ")}.` : undefined,
    notesPart: metadata?.notes ? `Changes: ${metadata.notes}.` : undefined,
    formatPart: metadata?.method ? `Format: ${metadata.method}.` : undefined,
    categoryPart: metadata?.notes ? `Category: ${metadata.notes}.` : undefined,
  };
}

/** Maps event types to their base tooltip messages */
const BASE_TOOLTIPS: Record<TimelineEventType, string> = {
  [TimelineEventType.CREATED]: "Invoice was scanned and digitized using OCR technology.",
  [TimelineEventType.AI_ANALYSIS]: "AI processed the invoice to categorize items, detect allergens, and extract metadata.",
  [TimelineEventType.RECIPES_GENERATED]: "Based on purchased ingredients, AI suggested recipes you can make.",
  [TimelineEventType.SHARED]: "Invoice was shared for collaborative viewing or expense splitting.",
  [TimelineEventType.EDITED]: "Manual changes were made to the invoice.",
  [TimelineEventType.EXPORTED]: "Invoice was exported for external use.",
  [TimelineEventType.MARKED_IMPORTANT]: "Invoice was flagged as important for quick access and priority tracking.",
  [TimelineEventType.CATEGORIZED]: "Invoice was assigned a category for better organization.",
};

/**
 * Gets a detailed tooltip description for an event type.
 * @param {TimelineEventType} type - The type of event
 * @param {TimelineEventMetadata} [metadata] - Optional metadata for the event
 * @returns {string} Detailed description for tooltip
 */
export function getEventTooltipContent(type: TimelineEventType, metadata?: TimelineEventMetadata): string {
  const parts = extractMetadataParts(metadata);
  const baseTooltip = BASE_TOOLTIPS[type];
  if (!baseTooltip) return "Event details unavailable";

  // Map event types to their additional metadata parts
  const additionalParts: Partial<Record<TimelineEventType, Array<string | undefined>>> = {
    [TimelineEventType.CREATED]: [parts.methodPart, parts.confidencePart],
    [TimelineEventType.AI_ANALYSIS]: [parts.durationPart, parts.itemCountPart],
    [TimelineEventType.RECIPES_GENERATED]: [parts.recipeCountPart],
    [TimelineEventType.SHARED]: [parts.usersPart],
    [TimelineEventType.EDITED]: [parts.notesPart],
    [TimelineEventType.EXPORTED]: [parts.formatPart],
    [TimelineEventType.CATEGORIZED]: [parts.categoryPart],
  };

  const typeParts = additionalParts[type];
  if (!typeParts) return baseTooltip;

  return buildTooltipContent(baseTooltip, ...typeParts);
}

/**
 * Groups timeline events by date for display.
 * @param {TimelineEvent[]} events - Array of timeline events
 * @returns {Record<string, TimelineEvent[]>} Events grouped by formatted date string
 */
export function groupEventsByDate(events: TimelineEvent[], locale: Locale): Record<string, TimelineEvent[]> {
  const grouped: Record<string, TimelineEvent[]> = {};
  for (const event of events) {
    const dateKey = formatDate(event.date, {locale});
    grouped[dateKey] ??= [];
    grouped[dateKey].push(event);
  }
  return grouped;
}

/**
 * Generates a complete timeline from an invoice.
 * @param {Invoice} invoice - The invoice to generate timeline for
 * @returns {TimelineEvent[]} Array of timeline events
 */
export function generateTimelineFromInvoice(invoice: Invoice): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const createdDate = new Date(invoice.createdAt);

  // Created event
  events.push({
    id: generateEventId(),
    type: TimelineEventType.CREATED,
    date: createdDate,
    title: "Invoice Created",
    description: "Scanned and digitized from receipt",
    icon: null, // Will be set by component
    completed: true,
    metadata: {
      method: "OCR Scan",
      confidence: 98,
    },
  });

  // AI Analysis event (2 minutes after creation)
  const aiDate = new Date(createdDate);
  aiDate.setMinutes(aiDate.getMinutes() + 2);
  events.push({
    id: generateEventId(),
    type: TimelineEventType.AI_ANALYSIS,
    date: aiDate,
    title: "AI Analysis Complete",
    description: `${invoice.items.length} items detected and categorized`,
    icon: null,
    completed: true,
    metadata: {
      duration: "2.3 seconds",
      itemCount: invoice.items.length,
      confidence: 96,
    },
  });

  // Categorized event (if category is set)
  if (invoice.category !== 0) {
    const catDate = new Date(aiDate);
    catDate.setMinutes(catDate.getMinutes() + 1);
    events.push({
      id: generateEventId(),
      type: TimelineEventType.CATEGORIZED,
      date: catDate,
      title: "Category Assigned",
      description: "Auto-categorized based on items",
      icon: null,
      completed: true,
      metadata: {
        confidence: 94,
      },
    });
  }

  // Recipes generated (if any)
  if (invoice.possibleRecipes.length > 0) {
    const recipeDate = new Date(createdDate);
    recipeDate.setMinutes(recipeDate.getMinutes() + 5);
    events.push({
      id: generateEventId(),
      type: TimelineEventType.RECIPES_GENERATED,
      date: recipeDate,
      title: "Recipes Generated",
      description: `${invoice.possibleRecipes.length} recipes suggested`,
      icon: null,
      completed: true,
      metadata: {
        itemCount: invoice.possibleRecipes.length,
        duration: "1.8 seconds",
      },
    });
  }

  // Important flag event (if marked)
  if (invoice.isImportant) {
    const importantDate = new Date(createdDate);
    importantDate.setHours(importantDate.getHours() + 1);
    events.push({
      id: generateEventId(),
      type: TimelineEventType.MARKED_IMPORTANT,
      date: importantDate,
      title: "Marked as Important",
      description: "Flagged for priority tracking",
      icon: null,
      completed: true,
    });
  }

  // Shared event (if shared with anyone)
  if (invoice.sharedWith.length > 0) {
    const shareDate = new Date(createdDate);
    shareDate.setDate(shareDate.getDate() + 1);
    shareDate.setHours(10, 30, 0);
    events.push({
      id: generateEventId(),
      type: TimelineEventType.SHARED,
      date: shareDate,
      title: "Shared with Others",
      description: `Shared with ${invoice.sharedWith.length} ${invoice.sharedWith.length === 1 ? "person" : "people"}`,
      icon: null,
      completed: true,
      metadata: {
        users: invoice.sharedWith,
      },
    });
  }

  // Sort events by date
  return events.toSorted((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Extracts initials from an email or user identifier.
 * @param {string} identifier - Email or user ID
 * @returns {string} Two-character initials
 */
export function getInitials(identifier: string): string {
  if (identifier.includes("@")) {
    const [localPart] = identifier.split("@");
    return localPart!.slice(0, 2).toUpperCase();
  }
  return identifier.slice(0, 2).toUpperCase();
}

/**
 * Gets display name from email or identifier.
 * @param {string} identifier - Email or user ID
 * @returns {string} Formatted display name
 */
export function getDisplayName(identifier: string): string {
  if (identifier.includes("@")) {
    const [localPart] = identifier.split("@");
    return localPart!.charAt(0).toUpperCase() + localPart!.slice(1);
  }
  return identifier;
}
