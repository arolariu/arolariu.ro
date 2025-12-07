/**
 * @fileoverview Helper functions for generating and formatting timeline data.
 * @module lib/utils/timeline-helpers
 */

import type {Invoice} from "@/types/invoices";
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
 * @returns {string} A unique identifier string
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Formats a date for timeline display (e.g., "Dec 5, 2024").
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatTimelineDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Formats a time for timeline display (e.g., "2:30 PM").
 * @param {Date} date - The date containing the time to format
 * @returns {string} Formatted time string
 */
export function formatTimelineTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

/**
 * Gets a detailed tooltip description for an event type.
 * @param {TimelineEventType} type - The type of event
 * @param {TimelineEventMetadata} [metadata] - Optional metadata for the event
 * @returns {string} Detailed description for tooltip
 */
export function getEventTooltipContent(type: TimelineEventType, metadata?: TimelineEventMetadata): string {
  const tooltips: Record<TimelineEventType, string> = {
    [TimelineEventType.CREATED]: `Invoice was scanned and digitized using OCR technology.${metadata?.method ? ` Method: ${metadata.method}` : ""}${metadata?.confidence ? ` Accuracy: ${metadata.confidence}%` : ""}`,
    [TimelineEventType.AI_ANALYSIS]: `AI processed the invoice to categorize items, detect allergens, and extract metadata.${metadata?.duration ? ` Processing time: ${metadata.duration}` : ""}${metadata?.itemCount ? ` Items analyzed: ${metadata.itemCount}` : ""}`,
    [TimelineEventType.RECIPES_GENERATED]: `Based on purchased ingredients, AI suggested recipes you can make.${metadata?.itemCount ? ` ${metadata.itemCount} recipes generated.` : ""}`,
    [TimelineEventType.SHARED]: `Invoice was shared for collaborative viewing or expense splitting.${metadata?.users?.length ? ` Shared with: ${metadata.users.join(", ")}` : ""}`,
    [TimelineEventType.EDITED]: `Manual changes were made to the invoice.${metadata?.notes ? ` Changes: ${metadata.notes}` : ""}`,
    [TimelineEventType.EXPORTED]: `Invoice was exported for external use.${metadata?.method ? ` Format: ${metadata.method}` : ""}`,
    [TimelineEventType.MARKED_IMPORTANT]: "Invoice was flagged as important for quick access and priority tracking.",
    [TimelineEventType.CATEGORIZED]: `Invoice was assigned a category for better organization.${metadata?.notes ? ` Category: ${metadata.notes}` : ""}`,
  };

  return tooltips[type] || "Event details unavailable";
}

/**
 * Groups timeline events by date for display.
 * @param {TimelineEvent[]} events - Array of timeline events
 * @returns {Record<string, TimelineEvent[]>} Events grouped by formatted date string
 */
export function groupEventsByDate(events: TimelineEvent[]): Record<string, TimelineEvent[]> {
  return events.reduce(
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
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Extracts initials from an email or user identifier.
 * @param {string} identifier - Email or user ID
 * @returns {string} Two-character initials
 */
export function getInitials(identifier: string): string {
  if (identifier.includes("@")) {
    const localPart = identifier.split("@")[0];
    return localPart.substring(0, 2).toUpperCase();
  }
  return identifier.substring(0, 2).toUpperCase();
}

/**
 * Gets display name from email or identifier.
 * @param {string} identifier - Email or user ID
 * @returns {string} Formatted display name
 */
export function getDisplayName(identifier: string): string {
  if (identifier.includes("@")) {
    const localPart = identifier.split("@")[0];
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }
  return identifier;
}
