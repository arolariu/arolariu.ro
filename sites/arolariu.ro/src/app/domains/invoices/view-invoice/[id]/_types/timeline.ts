/**
 * @fileoverview Timeline types for invoice history tracking and event visualization.
 * @module domains/invoices/view-invoice/types/timeline
 *
 * @remarks
 * This module defines the type system for tracking invoice lifecycle events.
 * The timeline provides an audit trail of all significant actions performed
 * on an invoice, from creation through AI analysis, sharing, and exports.
 *
 * **Domain Context:**
 * Part of the invoices bounded context, these types support the view-invoice
 * feature by enabling chronological visualization of invoice history.
 *
 * **Design Principles:**
 * - Immutable event records (events are append-only)
 * - Rich metadata for detailed tooltips and analytics
 * - Type-safe event discrimination via {@link TimelineEventType}
 *
 * @see {@link Invoice} - The parent aggregate these events track
 * @see {@link TimelineEvent} - Core event representation
 */

import type {ReactNode} from "react";

/**
 * Discriminated union of all possible timeline event types.
 *
 * @remarks
 * Each event type corresponds to a significant action in the invoice lifecycle.
 * Used for type-safe event handling and icon/color selection in the UI.
 *
 * **Event Categories:**
 * - **Creation events**: `CREATED` - Initial invoice capture
 * - **AI events**: `AI_ANALYSIS`, `RECIPES_GENERATED` - ML processing
 * - **User actions**: `EDITED`, `SHARED`, `EXPORTED` - Manual operations
 * - **Organization**: `MARKED_IMPORTANT`, `CATEGORIZED` - Classification
 *
 * @example
 * ```typescript
 * function getEventColor(type: TimelineEventType): string {
 *   switch (type) {
 *     case TimelineEventType.CREATED:
 *       return "green";
 *     case TimelineEventType.AI_ANALYSIS:
 *       return "blue";
 *     case TimelineEventType.SHARED:
 *       return "purple";
 *     default:
 *       return "gray";
 *   }
 * }
 * ```
 */
export enum TimelineEventType {
  /** Invoice was created from a receipt scan or manual entry. */
  CREATED = "created",
  /** AI analysis was performed to extract items, totals, and merchant info. */
  AI_ANALYSIS = "ai_analysis",
  /** Recipe suggestions were generated based on detected food items. */
  RECIPES_GENERATED = "recipes_generated",
  /** Invoice was shared with other users via link or direct invite. */
  SHARED = "shared",
  /** Invoice details were manually edited by the user. */
  EDITED = "edited",
  /** Invoice was exported to PDF, CSV, or other format. */
  EXPORTED = "exported",
  /** Invoice was flagged as important for quick access. */
  MARKED_IMPORTANT = "marked_important",
  /** Category was assigned or changed for organization. */
  CATEGORIZED = "categorized",
}

/**
 * Represents a single immutable event in the invoice timeline.
 *
 * @remarks
 * Timeline events form an append-only audit log of invoice actions.
 * Each event captures what happened, when, and includes rich metadata
 * for detailed tooltips and future analytics.
 *
 * **Immutability:**
 * Once created, events should never be modified. New corrections
 * should be recorded as separate events.
 *
 * **UI Rendering:**
 * The `icon` property accepts a ReactNode, allowing for dynamic
 * icon selection based on event type in the parent component.
 *
 * **Completion State:**
 * The `completed` flag indicates whether the event's action finished
 * successfully. Pending or failed events may show different UI states.
 *
 * @example
 * ```typescript
 * const creationEvent: TimelineEvent = {
 *   id: "evt_abc123",
 *   type: TimelineEventType.CREATED,
 *   date: new Date("2024-01-15T10:30:00Z"),
 *   title: "Invoice Created",
 *   description: "Receipt scanned and invoice created from image",
 *   icon: <ReceiptIcon className="h-4 w-4" />,
 *   completed: true,
 *   metadata: {
 *     method: "camera_scan",
 *     duration: "1.2s",
 *   },
 * };
 * ```
 *
 * @see {@link TimelineEventType} - Event type discriminator
 * @see {@link TimelineEventMetadata} - Additional event details
 */
export interface TimelineEvent {
  /** Unique identifier for the event. Should be a UUID or prefixed ID (e.g., "evt_abc123"). */
  id: string;
  /** Discriminator for the type of action this event represents. */
  type: TimelineEventType;
  /** ISO 8601 timestamp of when the event occurred. Used for chronological ordering. */
  date: Date;
  /** Human-readable title displayed in the timeline UI (max 50 chars recommended). */
  title: string;
  /** Detailed description shown on hover or in expanded view. Supports markdown-like formatting. */
  description: string;
  /** React node for the event icon. Typically a Lucide or custom SVG icon component. */
  icon: ReactNode;
  /** Whether the event action completed successfully. False indicates pending or failed state. */
  completed: boolean;
  /** Optional rich metadata for tooltips, analytics, and detailed event information. */
  metadata?: TimelineEventMetadata;
}

/**
 * Rich metadata associated with a timeline event for detailed display.
 *
 * @remarks
 * Provides additional context for timeline events beyond the basic
 * title and description. Used for:
 * - Enhanced tooltips with specific metrics
 * - Analytics and reporting on invoice processing
 * - Debugging and audit trail details
 *
 * **Optional Fields:**
 * All fields are optional to accommodate different event types.
 * AI events typically include `duration` and `confidence`,
 * while sharing events include `users`.
 *
 * @example
 * ```typescript
 * // AI analysis event metadata
 * const aiMetadata: TimelineEventMetadata = {
 *   duration: "2.3 seconds",
 *   itemCount: 12,
 *   confidence: 94,
 *   method: "GPT-4 Vision",
 *   notes: "High confidence extraction with verified totals",
 * };
 *
 * // Sharing event metadata
 * const shareMetadata: TimelineEventMetadata = {
 *   users: ["user@example.com", "team@company.com"],
 *   notes: "Shared for expense approval",
 * };
 * ```
 *
 * @see {@link TimelineEvent} - Parent event structure
 */
export interface TimelineEventMetadata {
  /** Human-readable duration of the event operation (e.g., "2.3 seconds", "< 1s"). */
  duration?: string;
  /** Count of items affected by the event (e.g., 12 items detected, 3 recipes generated). */
  itemCount?: number;
  /** List of user identifiers (emails or IDs) involved in sharing or collaboration events. */
  users?: string[];
  /** AI confidence score as a percentage (0-100). Only applicable for ML-based events. */
  confidence?: number;
  /** Free-form notes or additional context about the event. */
  notes?: string;
  /** Processing method or tool used (e.g., "GPT-4 Vision", "manual_entry", "camera_scan"). */
  method?: string;
}

/**
 * Props for rendering a single timeline item in the UI.
 *
 * @remarks
 * Used by the timeline item component to render an individual event
 * with appropriate styling based on position and completion state.
 *
 * **Layout Considerations:**
 * The `isLast` prop controls whether a connecting line is drawn
 * to the next event, enabling proper visual continuity.
 *
 * @example
 * ```tsx
 * <TimelineItem
 *   event={creationEvent}
 *   isLast={false}
 * />
 * ```
 *
 * @see {@link TimelineEvent} - The event data structure
 * @see {@link InvoiceTimelineProps} - Parent timeline component props
 */
export interface TimelineItemProps {
  /** The timeline event data to render. Contains all display information. */
  event: TimelineEvent;
  /** Whether this is the final item in the timeline. Omits the connecting line when true. */
  isLast?: boolean;
}

/**
 * Props for the main invoice timeline component.
 *
 * @remarks
 * The timeline component displays a chronological list of events
 * for a specific invoice, providing users with a complete history
 * of actions and processing steps.
 *
 * **Rendering Context:**
 * Designed for use in both Server and Client components.
 * Event data should be fetched server-side when possible.
 *
 * **Styling:**
 * Accepts an optional `className` for Tailwind CSS customization.
 * Internal styling follows the project's design system.
 *
 * @example
 * ```tsx
 * <InvoiceTimeline
 *   invoiceId="inv_abc123"
 *   events={[creationEvent, analysisEvent, shareEvent]}
 *   className="mt-4"
 * />
 * ```
 *
 * @see {@link TimelineEvent} - Individual event structure
 * @see {@link TimelineItemProps} - Child item component props
 */
export interface InvoiceTimelineProps {
  /** UUID of the invoice this timeline represents. Used for data fetching and linking. */
  invoiceId: string;
  /** Chronologically ordered array of timeline events. Should be sorted by date ascending. */
  events: TimelineEvent[];
  /** Optional Tailwind CSS classes for container styling customization. */
  className?: string;
}
