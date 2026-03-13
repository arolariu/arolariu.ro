import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./timeline.module.css";

/**
 * Represents the configurable props for the {@link Timeline} component.
 *
 * @remarks
 * Extends native `<div>` attributes so timelines can expose test hooks, ARIA metadata,
 * and layout overrides while delegating item composition to child components.
 */
interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Timeline items composed as children.
   */
  children: React.ReactNode;
}

/**
 * Represents the configurable props for the {@link TimelineItem} component.
 */
interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The composed timeline dot and content for an individual event.
   */
  children: React.ReactNode;
}

/**
 * Represents the configurable props for the {@link TimelineDot} component.
 */
type TimelineDotProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Represents the configurable props for the {@link TimelineContent} component.
 */
interface TimelineContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Content rendered alongside the timeline marker.
   */
  children: React.ReactNode;
}

/**
 * A vertical timeline container for displaying chronological events.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Compose it with {@link TimelineItem}, {@link TimelineDot}, and {@link TimelineContent}
 * to render milestones, release notes, audit trails, or journey steps in order.
 *
 * @example
 * ```tsx
 * <Timeline>
 *   <TimelineItem>
 *     <TimelineDot />
 *     <TimelineContent>Account created</TimelineContent>
 *   </TimelineItem>
 * </Timeline>
 * ```
 *
 * @see {@link TimelineItem}
 * @see {@link TimelineContent}
 */
const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(({className, ...props}, ref) => (
  <div
    ref={ref}
    role="list"
    className={cn(styles.timeline, className)}
    {...props}
  />
));
Timeline.displayName = "Timeline";

/**
 * A single event row within a {@link Timeline}.
 *
 * @remarks
 * Renders a flex row that aligns a marker with its corresponding content block.
 *
 * @example
 * ```tsx
 * <TimelineItem>
 *   <TimelineDot />
 *   <TimelineContent>Invoice submitted</TimelineContent>
 * </TimelineItem>
 * ```
 *
 * @see {@link Timeline}
 */
const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(({className, ...props}, ref) => (
  <div
    ref={ref}
    role="listitem"
    className={cn(styles.item, className)}
    {...props}
  />
));
TimelineItem.displayName = "TimelineItem";

/**
 * A visual marker used to indicate a timeline event point.
 *
 * @remarks
 * The dot is decorative by default and is removed from the accessibility tree with
 * `aria-hidden="true"`.
 *
 * @example
 * ```tsx
 * <TimelineDot />
 * ```
 *
 * @see {@link TimelineItem}
 */
const TimelineDot = React.forwardRef<HTMLDivElement, TimelineDotProps>(({className, ...props}, ref) => (
  <div
    ref={ref}
    aria-hidden="true"
    className={cn(styles.dot, className)}
    {...props}
  />
));
TimelineDot.displayName = "TimelineDot";

/**
 * The content container rendered beside a {@link TimelineDot}.
 *
 * @remarks
 * Use this wrapper for text, metadata, or richer composed content associated with a
 * timeline event.
 *
 * @example
 * ```tsx
 * <TimelineContent>
 *   <strong>Version 1.0 released</strong>
 * </TimelineContent>
 * ```
 *
 * @see {@link Timeline}
 */
const TimelineContent = React.forwardRef<HTMLDivElement, TimelineContentProps>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.content, className)}
    {...props}
  />
));
TimelineContent.displayName = "TimelineContent";

export {Timeline, TimelineContent, TimelineDot, TimelineItem};
export type {TimelineContentProps, TimelineDotProps, TimelineItemProps, TimelineProps};
