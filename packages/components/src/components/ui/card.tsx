import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./card.module.css";

/**
 * Represents the shared styling props supported by the Card root container.
 *
 * @remarks
 * Extends native `<div>` attributes so cards can participate in semantic layouts,
 * landmarks, and custom event handling while exposing a documented class override.
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Additional CSS classes merged with the default card surface styles.
   */
  className?: string;
}

/**
 * Represents the shared styling props supported by card layout sections.
 *
 * @remarks
 * Use these props for presentational card regions such as headers, content blocks,
 * action rows, and footers. All standard `<div>` attributes continue to work.
 */
interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Additional CSS classes merged with the section's default spacing styles.
   */
  className?: string;
}

/**
 * A card container for grouping related content into a bordered surface.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a styled `<div>` with the library's card border, background, and shadow.
 * Compose it with {@link CardHeader}, {@link CardContent}, and {@link CardFooter}
 * to create structured panels without depending on a Base UI primitive.
 *
 * @example
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Team activity</CardTitle>
 *     <CardDescription>Latest changes across your workspace.</CardDescription>
 *   </CardHeader>
 *   <CardContent>{children}</CardContent>
 *   <CardFooter>Updated 2 minutes ago</CardFooter>
 * </Card>
 * ```
 *
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.card, className)}
    {...props}
  />
));
Card.displayName = "Card";

/**
 * A header region for card titles, descriptions, and top-level actions.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a `<div>` with vertical spacing tuned for leading card content.
 * Place {@link CardTitle}, {@link CardDescription}, and optional controls inside it.
 *
 * @example
 * ```tsx
 * <CardHeader>
 *   <CardTitle>Revenue</CardTitle>
 *   <CardDescription>Monthly recurring revenue overview.</CardDescription>
 * </CardHeader>
 * ```
 *
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.header, className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

/**
 * A prominent title slot for the primary heading inside a card.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a styled `<div>` for visual hierarchy. Provide semantic heading elements
 * inside it when the surrounding document outline requires explicit heading levels.
 *
 * @example
 * ```tsx
 * <CardTitle>Security overview</CardTitle>
 * ```
 *
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
const CardTitle = React.forwardRef<HTMLDivElement, CardSectionProps>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.title, className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

/**
 * A muted text block for supporting information beneath a card title.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a styled `<div>` intended for secondary copy, helper messaging, or status
 * summaries that contextualize the main card heading.
 *
 * @example
 * ```tsx
 * <CardDescription>Track response times and alert volume in one place.</CardDescription>
 * ```
 *
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
const CardDescription = React.forwardRef<HTMLDivElement, CardSectionProps>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.description, className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/**
 * A compact action slot aligned alongside card header content.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a `<div>` positioned for buttons, menus, or status badges that should sit
 * at the top edge of the card without disturbing header spacing.
 *
 * @example
 * ```tsx
 * <CardAction>
 *   <Button size="sm">Manage</Button>
 * </CardAction>
 * ```
 *
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
const CardAction = React.forwardRef<HTMLDivElement, CardSectionProps>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.action, className)}
    {...props}
  />
));
CardAction.displayName = "CardAction";

/**
 * The main content region for card body content.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a `<div>` with interior spacing optimized for text, forms, charts, or any
 * other primary card content placed between the header and footer.
 *
 * @example
 * ```tsx
 * <CardContent>
 *   <p>Your subscription renews on March 31.</p>
 * </CardContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
const CardContent = React.forwardRef<HTMLDivElement, CardSectionProps>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.content, className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

/**
 * A footer region for actions, summaries, or secondary metadata.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a flex-enabled `<div>` that sits at the bottom of the card and is commonly
 * used for buttons, timestamps, totals, or other closing UI elements.
 *
 * @example
 * ```tsx
 * <CardFooter>
 *   <Button>Save changes</Button>
 * </CardFooter>
 * ```
 *
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.footer, className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle};
